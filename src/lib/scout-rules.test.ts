import { describe, expect, it } from "vitest";
import { canSubmitEvidence, checklistReady, mergeChecklist, photoSubmitDecision } from "./scout-rules";

describe("Scout submission rules", () => {
  it("never re-sends a photo Cairn already confirmed", () => {
    expect(photoSubmitDecision("submitted")).toBe("already_submitted");
  });
  it("does not send a photo while an upload is in progress", () => {
    expect(photoSubmitDecision("uploading")).toBe("in_progress");
  });
  it("allows retrying a failed upload", () => {
    expect(photoSubmitDecision("failed")).toBe("send");
  });
  it("blocks submission until collection is ready", () => {
    expect(canSubmitEvidence(false)).toBe(false);
  });
  it("is ready only when every requirement is covered", () => {
    expect(
      checklistReady([
        { label: "Close-up", status: "covered", note: "ok" },
        { label: "Context", status: "partial", note: "" },
      ]),
    ).toBe(false);
  });
  it("is not ready when a covered item cites no evidence", () => {
    expect(checklistReady([{ label: "Location on item", status: "covered", note: "", evidencePhotoIds: [] }])).toBe(false);
  });
  it("allows collected evidence while visit scheduling remains outstanding", () => {
    expect(checklistReady([
      { label: "Damage photos", scope: "field_evidence", status: "covered", note: "Damage and location visible", evidencePhotoIds: ["photo-1"] },
      { label: "Arrange maintenance visit", scope: "office_follow_up", status: "missing", note: "Office to arrange" },
    ])).toBe(true);
  });
  it("still blocks missing field evidence alongside office follow-up", () => {
    expect(checklistReady([
      { label: "Locate damage on item", scope: "field_evidence", status: "partial", note: "Need wider view" },
      { label: "Arrange maintenance visit", scope: "office_follow_up", status: "missing", note: "" },
    ])).toBe(false);
  });
  it("cannot become ready with only office tasks or an empty checklist", () => {
    expect(checklistReady([{ label: "Arrange visit", scope: "office_follow_up", status: "missing", note: "" }])).toBe(false);
    expect(checklistReady([])).toBe(false);
  });
  it("keeps unclassified legacy requirements blocking until reviewed", () => {
    expect(checklistReady([{ label: "Arrange visit", status: "missing", note: "" }])).toBe(false);
  });
});

describe("Cairn requirements are preserved", () => {
  const locate = {
    label: "Where the damage sits on the item",
    requirement: "Photos must allow the affected area to be located on the identified item.",
    source: "cairn" as const,
    slotId: "s1",
    status: "partial" as const,
    note: "Close-up only",
  };
  it("restores a Cairn requirement the model dropped, keeping it outstanding", () => {
    const merged = mergeChecklist([locate], [{ label: "Close-up", status: "covered", note: "clear", source: "scout" }]);
    expect(merged.find((i) => i.requirement === locate.requirement)?.status).toBe("partial");
    expect(checklistReady(merged)).toBe(false);
  });
  it("can reclassify a legacy office requirement without dropping it", () => {
    const scheduling = { ...locate, label: "Arrange visit", requirement: "Arrange a maintenance visit", slotId: "office-slot" };
    const merged = mergeChecklist([scheduling], [{ ...scheduling, scope: "office_follow_up" }]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("partial");
    expect(merged[0]?.scope).toBe("office_follow_up");
  });
});

import { classifyScope as _cs, checklistReady as _cr } from "./scout-rules";
describe("visit arrangements", () => {
  it("never block field evidence readiness", () => {
    const items = [
      { label: "Damage photos", status: "covered" as const, note: "ok", evidencePhotoIds: ["p1"] },
      { label: "Visit arrangements", status: "missing" as const, note: "", source: "cairn" as const, requirement: "Arrange a visit with the tenant" },
    ].map(_cs);
    expect(items[1]?.scope).toBe("office_follow_up");
    expect(_cr(items)).toBe(true);
  });
});

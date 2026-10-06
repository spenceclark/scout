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
});

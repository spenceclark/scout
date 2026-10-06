import { describe, expect, it } from "vitest";
import { canSubmitEvidence, checklistReady, photoSubmitDecision } from "./scout-rules";

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
        { label: "Close-up", status: "covered", note: "" },
        { label: "Context", status: "partial", note: "" },
      ]),
    ).toBe(false);
  });
});

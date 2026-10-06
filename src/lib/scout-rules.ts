// Pure rules shared by the agent and tests.
export type UploadStatus = "not_submitted" | "uploading" | "submitted" | "failed";

/** Decide whether a photo may be sent to Cairn now. Never re-send a submitted or in-flight photo. */
export function photoSubmitDecision(status: string): "send" | "already_submitted" | "in_progress" {
  if (status === "submitted") return "already_submitted";
  if (status === "uploading") return "in_progress";
  return "send";
}

/** Evidence may only be sent once collection is marked ready. */
export function canSubmitEvidence(ready: boolean): boolean {
  return ready === true;
}

export interface ChecklistItem {
  label: string;
  status: "covered" | "partial" | "missing";
  note: string;
}

/** Ready only when every checklist item is covered. */
export function checklistReady(items: ChecklistItem[]): boolean {
  return items.length > 0 && items.every((i) => i.status === "covered");
}

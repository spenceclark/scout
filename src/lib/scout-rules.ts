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
  /** Legacy items default to field evidence until explicitly reclassified. */
  scope?: "field_evidence" | "office_follow_up";
  label: string;
  status: "covered" | "partial" | "missing";
  note: string;
  /** Requirement text as returned by Cairn (guidance / evidence slot). Null for items Scout added. */
  requirement?: string | null;
  source?: "cairn" | "scout";
  slotId?: string | null;
  /** Photos that together satisfy this item. */
  evidencePhotoIds?: string[];
}

const key = (i: ChecklistItem) => (i.slotId ? `slot:${i.slotId}|${i.requirement ?? i.label}` : `req:${i.requirement ?? i.label}`);

/**
 * Merge a model-proposed checklist with the previous one. Cairn-sourced requirements can never be
 * silently dropped or reworded away: any missing from the new list are restored with their last status.
 */
export function mergeChecklist(prev: ChecklistItem[], next: ChecklistItem[]): ChecklistItem[] {
  const nextKeys = new Set(next.map(key));
  const restored = prev.filter((p) => p.source === "cairn" && !nextKeys.has(key(p)));
  return [...next, ...restored];
}

/** A covered item must cite what satisfies it (photos or a written observation). */
export function itemSatisfied(i: ChecklistItem): boolean {
  if (i.status !== "covered") return false;
  return (i.evidencePhotoIds?.length ?? 0) > 0 || i.note.trim().length > 0;
}

/** Office follow-up remains visible but does not gate proposing field evidence. */
export function checklistReady(items: ChecklistItem[]): boolean {
  const fieldItems = items.filter((i) => i.scope !== "office_follow_up");
  return fieldItems.length > 0 && fieldItems.every(itemSatisfied);
}

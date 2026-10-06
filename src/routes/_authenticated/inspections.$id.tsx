import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUp,
  Camera,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoutMark } from "@/components/ScoutMark";
import { supabase } from "@/integrations/supabase/client";
import { sendScoutTurn } from "@/lib/scout.functions";
import { prepareImage } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inspections/$id")({
  head: () => ({
    meta: [
      { title: "Inspection — Scout" },
      { name: "description", content: "Collect evidence for this site visit with Scout." },
      { property: "og:title", content: "Inspection — Scout" },
      { property: "og:description", content: "A Scout site inspection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InspectionPage,
});

type Entry = { role: "user" | "assistant"; text: string; photoIds?: string[]; activity?: string[]; at: string };
type ChecklistItem = { label: string; status: "covered" | "partial" | "missing"; note: string; requirement?: string | null; source?: string };
type Photo = {
  id: string;
  storage_path: string;
  filename: string;
  assessment: string | null;
  assessment_status: string;
  upload_status: string;
  upload_error: string | null;
};

function InspectionPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const send = useServerFn(sendScoutTurn);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(0);
  const [sending, setSending] = useState<Entry | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const insp = useQuery({
    queryKey: ["inspection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id,title,subject_name,record_reference,procedure_name,transcript,checklist,ready,summary")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const photos = useQuery({
    queryKey: ["photos", id],
    refetchInterval: sending ? 2500 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_photos")
        .select("id,storage_path,filename,assessment,assessment_status,upload_status,upload_error")
        .eq("inspection_id", id)
        .order("created_at");
      if (error) throw error;
      const rows = data as Photo[];
      const urls: Record<string, string> = {};
      if (rows.length) {
        const { data: signed } = await supabase.storage.from("scout-photos").createSignedUrls(rows.map((r) => r.storage_path), 3600);
        signed?.forEach((s, i) => {
          const r = rows[i];
          if (s.signedUrl && r) urls[r.id] = s.signedUrl;
        });
      }
      return { rows, urls };
    },
  });

  const transcript = (insp.data?.transcript as Entry[] | undefined) ?? [];
  const checklist = (insp.data?.checklist as ChecklistItem[] | undefined) ?? [];
  const photoMap = useMemo(() => new Map((photos.data?.rows ?? []).map((p) => [p.id, p])), [photos.data]);
  const covered = checklist.filter((c) => c.status === "covered").length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, sending]);
  useEffect(() => {
    if (!sending) textRef.current?.focus();
  }, [sending, id]);

  async function addFiles(files: File[]) {
    if (!files.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const img = await prepareImage(file);
        const path = `${u.user.id}/${id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("scout-photos").upload(path, img.blob, { contentType: img.type });
        if (upErr) throw upErr;
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const { data: row, error } = await supabase
          .from("inspection_photos")
          .insert({ inspection_id: id, storage_path: path, filename: `scout-${stamp}-${img.name}`, mime_type: img.type, size_bytes: img.blob.size })
          .select("id")
          .single();
        if (error || !row) throw error ?? new Error("save failed");
        setPending((p) => [...p, { id: row.id, url: URL.createObjectURL(img.blob) }]);
      } catch (e: any) {
        toast.error(`Photo not added: ${e.message ?? e}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    qc.invalidateQueries({ queryKey: ["photos", id] });
  }

  async function submit() {
    const t = text.trim();
    if ((!t && pending.length === 0) || sending || uploading) return;
    const photoIds = pending.map((p) => p.id);
    setSending({ role: "user", text: t, photoIds, at: new Date().toISOString() });
    setText("");
    setPending([]);
    try {
      await send({ data: { inspectionId: id, text: t, photoIds } });
    } catch (e: any) {
      toast.error(e.message ?? "Message failed");
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["inspection", id] }),
        qc.invalidateQueries({ queryKey: ["photos", id] }),
        qc.invalidateQueries({ queryKey: ["inspections"] }),
      ]);
      setSending(null);
    }
  }

  const shown = sending && !transcript.some((e) => e.at === sending.at) ? [...transcript, sending] : transcript;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      <header className="border-b bg-background/95 px-3 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to inspections">
            <Link to="/inspections">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{insp.data?.title ?? "Inspection"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {insp.data?.record_reference ? (
                <>
                  <span className="font-mono">{insp.data.record_reference}</span>
                  {insp.data.procedure_name ? ` · ${insp.data.procedure_name}` : ""}
                </>
              ) : (
                "No record yet"
              )}
            </div>
          </div>
        </div>
        {checklist.length > 0 && (
          <div className="mt-2 rounded-xl border bg-card">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              onClick={() => setShowChecklist((s) => !s)}
              aria-expanded={showChecklist}
            >
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(covered / checklist.length) * 100}%` }} />
              </div>
              <span className="text-sm font-medium">
                {insp.data?.ready ? "Ready" : `${covered}/${checklist.length} covered`}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showChecklist && "rotate-180")} />
            </button>
            {showChecklist && (
              <ul className="space-y-2 border-t px-3 py-3">
                {checklist.map((c) => (
                  <li key={`${c.label}-${c.requirement ?? ""}`} className="flex gap-2.5 text-sm">
                    {c.status === "covered" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : c.status === "partial" ? (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <div className={cn(c.status === "covered" ? "text-foreground" : "text-foreground")}>{c.label}</div>
                      {c.note && <div className="text-xs text-muted-foreground">{c.note}</div>}
                      {c.source === "cairn" && c.requirement && (
                        <div className="mt-0.5 text-[11px] italic text-muted-foreground">{c.requirement}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {shown.length === 0 && (
          <div className="mx-auto mt-6 max-w-sm text-center">
            <ScoutMark className="mx-auto h-11 w-11" />
            <h2 className="mt-4 text-2xl font-semibold">Where are you?</h2>
            <p className="mt-2 text-muted-foreground">Tell me the site and what you're investigating.</p>
          </div>
        )}
        <div className="space-y-5">
          {shown.map((e, i) =>
            e.role === "user" ? (
              <div key={i} className="flex flex-col items-end gap-2">
                {!!e.photoIds?.length && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {e.photoIds.map((pid) => (
                      <PhotoTile key={pid} photo={photoMap.get(pid)} url={photos.data?.urls[pid]} />
                    ))}
                  </div>
                )}
                {e.text && (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-user-bubble px-4 py-2.5 text-user-bubble-foreground">
                    {e.text}
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <ScoutMark className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  {!!e.activity?.length && (
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {e.activity.map((a) => (
                        <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-foreground [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5">
                    <ReactMarkdown>{e.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ),
          )}
          {sending && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <ScoutMark className="h-7 w-7" />
              <Loader2 className="h-4 w-4 animate-spin" /> Scout is checking…
            </div>
          )}
          {insp.data?.summary && !sending && (
            <div className="rounded-xl border border-primary/30 bg-accent/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Handover summary</div>
              <div className="prose prose-sm mt-2 max-w-none text-foreground">
                <ReactMarkdown>{insp.data.summary}</ReactMarkdown>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Evidence is proposed for office review. Scheduling the visit is handled by the office.
              </p>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-background px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        {(pending.length > 0 || uploading > 0) && (
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {pending.map((p) => (
              <div key={p.id} className="relative h-16 w-16 shrink-0">
                <img src={p.url} alt="Photo to send" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background"
                  onClick={() => setPending((ps) => ps.filter((x) => x.id !== p.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {uploading > 0 && (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-12 text-base" onClick={() => cameraRef.current?.click()} disabled={!!sending}>
            <Camera className="mr-1.5 h-5 w-5" /> Take photo
          </Button>
          <Button variant="secondary" className="h-12 text-base" onClick={() => libraryRef.current?.click()} disabled={!!sending}>
            <ImagePlus className="mr-1.5 h-5 w-5" /> Upload
          </Button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; addFiles(f); }} />
        <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; addFiles(f); }} />
        <form
          className="flex items-end gap-2 rounded-2xl border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={shown.length ? "Reply or add a note…" : "Where are you and what are you inspecting?"}
            rows={1}
            className="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            disabled={!!sending || uploading > 0 || (!text.trim() && pending.length === 0)}
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PhotoTile({ photo, url }: { photo?: Photo | undefined; url?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const status = photo?.upload_status;
  const badge =
    status === "submitted"
      ? { t: "Sent for review", c: "bg-primary text-primary-foreground" }
      : status === "uploading"
        ? { t: "Sending…", c: "bg-secondary text-secondary-foreground" }
        : status === "failed"
          ? { t: "Upload failed", c: "bg-destructive text-destructive-foreground" }
          : photo?.assessment_status === "useful"
            ? { t: "Assessed", c: "bg-accent text-accent-foreground" }
            : photo?.assessment_status === "not_useful"
              ? { t: "Needs another", c: "bg-warning text-foreground" }
              : null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative h-28 w-28 overflow-hidden rounded-xl bg-muted shadow-soft">
        {url ? <img src={url} alt={photo?.filename ?? "Photo"} className="h-full w-full object-cover" /> : null}
        {badge && <span className={cn("absolute inset-x-1 bottom-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", badge.c)}>{badge.t}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground/90 p-4" onClick={() => setOpen(false)}>
          <button type="button" className="self-end rounded-full bg-background p-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          {url && <img src={url} alt={photo?.filename ?? "Photo"} className="mt-3 max-h-[60vh] w-full rounded-lg object-contain" />}
          <div className="mt-3 rounded-lg bg-background p-3 text-sm text-foreground" onClick={(e) => e.stopPropagation()}>
            {badge && <div className="mb-1 text-xs font-semibold">{badge.t}</div>}
            <p>{photo?.assessment ?? "Not assessed yet."}</p>
            {photo?.upload_error && <p className="mt-2 text-destructive">{photo.upload_error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

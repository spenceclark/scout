import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScoutMark } from "@/components/ScoutMark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/inspections/")({
  head: () => ({
    meta: [
      { title: "Inspections — Scout" },
      { name: "description", content: "Your site inspections and the evidence collected." },
      { property: "og:title", content: "Inspections — Scout" },
      { property: "og:description", content: "Your site inspections in Scout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InspectionsPage,
});

function InspectionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id,title,subject_name,record_reference,ready,summary,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function create() {
    setCreating(true);
    const { data, error } = await supabase.from("inspections").insert({}).select("id").single();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not start inspection");
      return;
    }
    navigate({ to: "/inspections/$id", params: { id: data.id } });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ScoutMark className="h-7 w-7" />
          <span className="font-display text-xl font-semibold">Scout</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>
      <h1 className="mt-8 text-3xl font-semibold">Inspections</h1>
      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data?.length === 0 && (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">
            No inspections yet. Start one when you arrive on site.
          </div>
        )}
        {data?.map((i) => (
          <Link
            key={i.id}
            to="/inspections/$id"
            params={{ id: i.id }}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-soft transition-colors hover:bg-secondary"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{i.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {i.record_reference && <span className="font-mono">{i.record_reference}</span>}
                <span>{new Date(i.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                {i.summary ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Handed over</span>
                ) : i.ready ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Ready</span>
                ) : null}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="h-14 w-full text-base shadow-soft" onClick={create} disabled={creating}>
            <Plus className="mr-1 h-5 w-5" /> New inspection
          </Button>
        </div>
      </div>
    </main>
  );
}

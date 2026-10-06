import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Camera, ClipboardCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoutMark } from "@/components/ScoutMark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scout — Field evidence for Astwood" },
      { name: "description", content: "Scout helps Astwood staff collect maintenance evidence on site and propose it to Cairn for review." },
      { property: "og:title", content: "Scout — Field evidence for Astwood" },
      { property: "og:description", content: "Collect maintenance photos and notes on site, guided by live Cairn procedures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inspections", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-14">
      <div className="flex items-center gap-3">
        <ScoutMark />
        <span className="text-sm font-medium tracking-wide text-muted-foreground">Astwood Property Management</span>
      </div>
      <h1 className="mt-14 text-5xl font-semibold leading-[1.05] text-foreground">Scout</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Your field assistant for collecting maintenance evidence before you leave site.
      </p>
      <ul className="mt-10 space-y-5">
        {[
          { icon: ClipboardCheck, t: "Follows the live Cairn procedure for each property" },
          { icon: Camera, t: "Checks your photos and asks for what's missing" },
          { icon: Send, t: "Proposes evidence to Cairn for office review" },
        ].map(({ icon: Icon, t }) => (
          <li key={t} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="pt-1 text-foreground">{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-12">
        <Button asChild size="lg" className="h-14 w-full text-base">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}

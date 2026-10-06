import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendScoutTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        inspectionId: z.string().uuid(),
        text: z.string().max(4000),
        photoIds: z.array(z.string().uuid()).max(12),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { runScoutTurn } = await import("./scout-agent.server");
    await runScoutTurn({ supabase: context.supabase, ...data });
    return { ok: true };
  });

// Server-only Cairn client: MCP tool calls + raw-bytes photo intake.
const CAIRN_HOST = "https://api-dev.cairnriver.io";
const MCP_URL = `${CAIRN_HOST}/mcp/v1`;
const INTAKE_URL = `${CAIRN_HOST}/api/intake/v1/candidates`;

function key(): string {
  const k = process.env["CAIRN_AGENT_KEY"];
  if (!k) throw new Error("Cairn is not configured (missing CAIRN_AGENT_KEY).");
  return k;
}

let rpcId = 1;

function parseRpcBody(text: string): any {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  // SSE: take the last data line containing a JSON-RPC response
  const lines = trimmed.split(/\r?\n/).filter((l) => l.startsWith("data:"));
  for (let i = lines.length - 1; i >= 0; i--) {
    const payload = (lines[i] ?? "").slice(5).trim();
    try {
      const obj = JSON.parse(payload);
      if (obj && ("result" in obj || "error" in obj)) return obj;
    } catch {
      /* ignore */
    }
  }
  throw new Error("Unreadable response from Cairn.");
}

export async function callCairnTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method: "tools/call", params: { name, arguments: args } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Cairn ${name} failed (${res.status}): ${text.slice(0, 300)}`);
  const rpc = parseRpcBody(text);
  if (rpc.error) throw new Error(`Cairn ${name} error: ${rpc.error.message ?? JSON.stringify(rpc.error)}`);
  const result = rpc.result ?? {};
  const textOut = (result.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
  let parsed: unknown = textOut;
  try {
    parsed = JSON.parse(textOut);
  } catch {
    /* keep as text */
  }
  if (result.isError) return { error: parsed };
  return parsed;
}

export interface PhotoUploadResult {
  ok: boolean;
  status: number;
  candidateId?: string | undefined;
  placement?: string | undefined;
  body: unknown;
}

export async function uploadPhotoCandidate(opts: {
  bytes: ArrayBuffer;
  filename: string;
  contentType: string;
  stepId: string;
  slotId: string;
}): Promise<PhotoUploadResult> {
  const safeName = opts.filename.replace(/["\\\r\n]/g, "_");
  const res = await fetch(INTAKE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": opts.contentType,
      "Content-Length": String(opts.bytes.byteLength),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cairn-Proposed-Step": opts.stepId,
      "Cairn-Proposed-Slot": opts.slotId,
    },
    body: opts.bytes,
  });
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* text */
  }
  const candidateId = body?.id ?? body?.candidateId ?? body?.candidate?.id;
  const placement =
    typeof body?.placement === "string" ? body.placement : body?.placement ? JSON.stringify(body.placement) : undefined;
  return { ok: res.ok, status: res.status, candidateId: candidateId ? String(candidateId) : undefined, placement, body };
}

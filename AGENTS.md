<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Scout architecture
- Cairn and OpenAI are called only from server code (`src/lib/*.server.ts`) via the `sendScoutTurn` server function — keeps CAIRN_AGENT_KEY / OPENAI_API_KEY out of the browser.
- The agent loop stores the full Responses history (incl. encrypted reasoning) per inspection; photos are stored as `photo:<id>` placeholders and rehydrated to data URLs per call — keeps rows small while preserving context.
- Submission guards (ready-before-submit, no duplicate photo/assertion uploads) live in `src/lib/scout-rules.ts` with tests — the model must not be trusted to enforce them.

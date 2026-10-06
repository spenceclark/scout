# Scout

**Get the right evidence before you leave.**

Scout is a mobile-first field assistant for a finctional company, Astwood Property Management Services. Staff describe a maintenance problem, take photographs and get practical guidance on what evidence is still needed before leaving the property.

Scout connects to Cairn to find the property and maintenance record, read the procedure's evidence requirements, and submit photographs and notes for human review. A live checklist shows progress, and a handover summary closes the visit. Approval and maintenance scheduling remain with the office.

## Built at the hackathon

Scout was built for the GPT-6 Astra Hackathon in London. The new work in this repository is the field assistant: its mobile interface, inspection conversations, photo capture/upload, evidence checklist, Astra agent loop and server-side integration with Cairn.

**Cairn is an existing SaaS product.** Its property records, procedures, evidence intake and human review workflow predate this entry and live outside this repository. Scout adds the on-site collection experience on top of those capabilities.

## What powers it

| Technology | Role |
| --- | --- |
| **Lovable** | Used to build Scout's interface and application code, including authentication, inspection storage and the server-side integrations. This repository stays connected to the Lovable editor. |
| **OpenAI GPT-6 Astra** | Powers the running assistant through the Responses API (`gpt-6-astra`, medium reasoning). It interprets the report and photographs against Cairn's requirements, asks follow-up questions, updates the checklist and calls tools to propose evidence. |
| **Cairn** | Supplies live property and record data, published procedure guidance and evidence slots through MCP. Receives proposed text evidence through MCP and photographs through its HTTP intake API. |
| **Supabase** | Provides sign-in, saved inspections and conversation state, plus photo storage. |
| **React, TanStack Start and Tailwind CSS** | Provide the web interface and server functions. |

Photos are assessed together: a useful close-up may need a wider view to establish context. The assistant is intended to request missing evidence without imposing a fixed photo count. Submission readiness and duplicate-upload guards also run in application code; submission remains a proposal for human review.

OpenAI and Cairn calls run on the server, with `OPENAI_API_KEY` and `CAIRN_AGENT_KEY` kept out of browser code. Inspection history preserves context between turns.

## Development

Continue in the [Lovable editor](https://lovable.dev/projects/16b0b7a5-7aff-44d2-b71a-394b7c21850c), or run locally with Node.js and npm:

```sh
npm install
npm run dev
```

The full workflow requires the configured Supabase project, server-side Cairn and OpenAI credentials, and access to the Astra model. The Cairn client currently targets the development service at `api-dev.cairnriver.io`.

Run `npm test` for the automated tests and `npm run build` for a production build.

Changes pushed to the connected `main` branch sync back to Lovable. Preserve published Git history: do not force-push or rewrite pushed commits.

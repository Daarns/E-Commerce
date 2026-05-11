<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:skill-rules -->
# Skill System

All skills are located at `.claude/skills/<skill-name>/SKILL.md`.
**Read the relevant skill BEFORE writing, modifying, or reviewing any code.**
Reading a skill is not optional — it defines the rules for this codebase.

## Skill Trigger Table

| Keywords or conditions in the request | Skills to read FIRST |
|---|---|
| refactor, SoC, component, hook, service, page, `.tsx`, `.ts`, frontend | `frontend-soc` + `frontend-structure` |
| folder structure, where to put, lib vs utils, project organization, new file | `frontend-structure` |
| `any`, `unknown`, event handler, TypeScript error, linter, strict mode, type safety | `typescript-strictness` |
| database, query, locking, race condition, transaction, migration, soft delete, cleanup | `database-patterns` |
| security, auth, JWT, login, injection, XSS, upload, rate limit, CSRF, SSRF | `web-security` |
| background job, queue, retry, webhook, cron, BullMQ, worker, dead letter | `background-jobs` |
| error handling, try catch, status code, circuit breaker, graceful shutdown | `error-handling` |
| backend structure, folder, layer, controller, service, repository, handler | `backend-structure` |
| UI component, design, styling, Tailwind, shadcn, visual, layout, landing page | `frontend-design` |

## Multi-Skill Tasks

Some tasks require reading more than one skill. Read ALL relevant skills before starting.

| Task | Skills to read |
|---|---|
| Refactor a frontend component or page | `frontend-soc` + `frontend-structure` + `typescript-strictness` |
| Create a new frontend feature from scratch | `frontend-structure` + `frontend-soc` + `typescript-strictness` |
| Build or review a backend endpoint | `backend-structure` + `web-security` + `error-handling` |
| Design or review a database model or query | `database-patterns` + `web-security` |
| Build a form with validation | `frontend-soc` + `typescript-strictness` |
| Create or review a UI component | `frontend-design` + `frontend-soc` |
| Implement background processing | `background-jobs` + `error-handling` + `database-patterns` |

## Always-On Rules

These rules apply to every task without needing to be triggered:

1. **No `any` in TypeScript** — read `typescript-strictness` for the correct alternative
2. **No `fetch` or `axios` directly in components** — always go through the service layer
3. **No business logic in `page.tsx`** — pages are orchestrators only
4. **No API calls in custom hooks** — hooks call services, services call the API
5. **No two unrelated components in one file** — one component per file
6. **No secrets or API keys in client-side code or `NEXT_PUBLIC_` env vars**
7. **Every new file must follow the folder conventions** in `frontend-structure`
8. **Every TypeScript event handler must be explicitly typed** — no implicit `any`

## How to Apply Skills

1. Identify which skills apply using the table above
2. Read each relevant skill fully before writing any code
3. If the task is ambiguous, read the skill and report findings first — do not refactor blindly
4. If a skill and your training data conflict — **the skill wins**
<!-- END:skill-rules -->

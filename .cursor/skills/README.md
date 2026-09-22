# Dating Cursor skills

Agent playbooks for this repo. Open the skill file when the task matches its description.

## Sprint agents

- [`dating-agent--1`](./dating-agent-run/agent--1/SKILL.md) — Agent -1 (Pre-flight) for dating sprint stories. Validates dependencies, story readiness, and checks for conflicts before architecture starts. Use when the user runs --agent -1 story N.
- [`dating-agent-0`](./dating-agent-run/agent-0/SKILL.md) — Agent 0 (Architect) for dating sprint stories. Design-only step — schema and API contracts. Use when the user runs --agent 0 story N.
- [`dating-agent-1`](./dating-agent-run/agent-1/SKILL.md) — Agent 1 (Senior dev) for dating sprint stories. Implements backend and frontend from architect handoff. Use when the user runs --agent 1 story N.
- [`dating-agent-2.5`](./dating-agent-run/agent-2.5/SKILL.md) — Agent 2.5 (Security Review) for dating sprint stories. Deep security audit for high-risk changes (auth, permissions, PII, payments, crypto). Use when the user runs --agent 2.5 story N.
- [`dating-agent-2`](./dating-agent-run/agent-2/SKILL.md) — Agent 2 (Code review) for dating sprint stories. Reviews implementation, writes tests, fixes issues. Use when the user runs --agent 2 story N.
- [`dating-agent-3.5`](./dating-agent-run/agent-3.5/SKILL.md) — Agent 3.5 (UI/UX Review) for dating sprint stories. Checks accessibility, mobile responsiveness, design system compliance. Use when the user runs --agent 3.5 story N.
- [`dating-agent-3`](./dating-agent-run/agent-3/SKILL.md) — Agent 3 (PM) for dating sprint stories. Closes story — checks DoD, updates status, summarizes pipeline. Use when the user runs --agent 3 story N.
- [`dating-agent-4`](./dating-agent-run/agent-4/SKILL.md) — Agent 4 (E2E tester) for dating sprint stories. Runs end-to-end integration tests through the shared matching-engine harness for stories touching eligibility, preference dimensions, or ranking. Use when the user runs --agent 4 story N.
- [`dating-agent-5`](./dating-agent-run/agent-5/SKILL.md) — Agent 5 (Post-deployment verification) for dating sprint stories. Runs after production deploy to verify metrics, logs, user feedback. Use when the user runs --agent 5 story N.
- [`dating-autorun`](./dating-agent-run/autorun/SKILL.md) — Autorun orchestrator for dating sprint stories. Chains agents automatically until story is Done or blocked. Use when the user runs --autorun story N.
- [`dating-agent-run`](./dating-agent-run/SKILL.md) — Run dating-app sprint agents manually using --agent N sprint S story M. Resolves story ref, loads agent-N step skill + role skill, writes handoff for next agent. Use when the user writes --agent followed by a number, sprint, and story reference.

## Review and delivery

- [`dating-architect`](./dating-architect/SKILL.md) — Senior architect for the dating app — Prisma schemas, API contracts, migrations, service signatures. Loaded by agent 0; not invoked directly.
- [`dating-code-review`](./dating-code-review/SKILL.md) — Code review and testing for the dating app — Jest API tests, Vitest UI tests, security audit. Loaded by agent 2; not invoked directly.
- [`dating-e2e-tester`](./dating-e2e-tester/SKILL.md) — E2E integration test engineer for the dating app's matching engine — real Nest app boot, supertest, in-memory Prisma mock. Loaded by agent 4; not invoked directly.
- [`dating-e2e-verification`](./dating-e2e-verification/SKILL.md) — End-to-end integration test verification for the dating app's matching engine — real Nest app boot, real HTTP via supertest, in-memory Prisma mock. Loaded by architect, dev, and CR agents when stories touch eligibility, matching preferences/dimensions, ranking order, or GET /api/v1/me/matches.
- [`dating-pm-contractor`](./dating-pm-contractor/SKILL.md) — PM and sprint coordinator for the dating app — story status, DoD, epic breakdown. Loaded by agent 3; not invoked directly.
- [`dating-post-deploy`](./dating-post-deploy/SKILL.md) — Post-deployment verifier for dating app — error rates, latency, user feedback. Loaded by agent 5.
- [`dating-preflight`](./dating-preflight/SKILL.md) — Pre-flight validator for dating app stories — checks dependencies, story readiness, and conflicts before architecture starts.
- [`dating-runtime-verification`](./dating-runtime-verification/SKILL.md) — Browser and local-dev runtime verification for the dating app — WebSocket, Next.js proxy, cookies, migrations. Loaded by architect, dev, and CR agents when stories touch realtime, auth transport, or cross-origin setup.
- [`dating-security-review`](./dating-security-review/SKILL.md) — Security auditor for dating app — threat modeling, auth/authz audit, PII handling, injection prevention. Loaded by agent 2.5.
- [`dating-senior-dev`](./dating-senior-dev/SKILL.md) — Senior full-stack dev for the dating app — NestJS services, controllers, Next.js UI, Prisma. Loaded by agent 1; not invoked directly.
- [`dating-ux-review`](./dating-ux-review/SKILL.md) — UI/UX reviewer for dating app — accessibility, mobile, design system. Loaded by agent 3.5.

## First AWS upload

- [`dating-first-upload-architect`](./dating-first-upload-architect/SKILL.md) — DevOps architect for Dating first AWS upload. Designs how to execute one phase (Terraform targets, AWS APIs, order). No apply. Use with --upload-agent architect phase N.
- [`dating-first-upload-devops`](./dating-first-upload-devops/SKILL.md) — DevOps executor for Dating first AWS upload. Runs the architect's commands for one phase after operator consent on paid applies. Use with --upload-agent devops phase N.
- [`dating-first-upload-product`](./dating-first-upload-product/SKILL.md) — Product owner for Dating first AWS upload. Owns the phase list, locked decisions, and go/no-go. Use with --upload-agent product phase N.
- [`dating-first-upload-qa`](./dating-first-upload-qa/SKILL.md) — QA for Dating first AWS upload. Verifies one phase exit test with read-only AWS/curl checks. Pass or fail. Use with --upload-agent qa phase N.
- [`dating-first-upload-agent-architect`](./dating-first-upload-run/agent-architect/SKILL.md) — Step spec for first-upload architect agent. Use when --upload-agent architect.
- [`dating-first-upload-agent-devops`](./dating-first-upload-run/agent-devops/SKILL.md) — Step spec for first-upload devops executor. Use when --upload-agent devops.
- [`dating-first-upload-agent-product`](./dating-first-upload-run/agent-product/SKILL.md) — Step spec for first-upload product agent. Use when --upload-agent product.
- [`dating-first-upload-agent-qa`](./dating-first-upload-run/agent-qa/SKILL.md) — Step spec for first-upload QA agent. Use when --upload-agent qa.
- [`dating-first-upload-run`](./dating-first-upload-run/SKILL.md) — Orchestrator for Dating first AWS upload. Run one role per message with --upload-agent product/architect/devops/qa phase <id>. Loads role skill and phase playbook; writes handoffs under docs/first-upload/handoffs/.

## Ship

- [`dating-push`](./dating-push/SKILL.md) — When the user says push (or push to git / docker / aws) in the Dating repo: git push, build and push dating-api and dating-ui Docker images to Frankfurt ECR, then roll both ECS services. Never Going2Eat food-*.

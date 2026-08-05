# Sprint 20 — Agent commands (4 agents × 5 stories)

**Purpose:** Paste these into Cursor chat **one at a time**, in order.  
**Pattern:** Agent 0 → 1 → 2 → 3 per story (same as Sprints 22–24).  
**Agent 4:** skip unless Architect says e2e/HTTP harness is required.

> **Reality check:** Stories 1–5 **code already landed** on `main` (1-agent fast path).  
> Running this pipeline now = **retro architect lock + CR + PM sign-off** (and fix gaps), not a blank rewrite — unless you explicitly tell Agent 1 to redo.

**Handoff folder:** `dating-api/docs/sprints/sprint-20-aws-dev-deployment/handoffs/STORY_0X_*/`

---

## How to use

1. Pick a story.
2. Paste **Agent 0** cmd → wait until handoff file is written.
3. Paste **Agent 1** → implement/fix vs handoff (or document “already done”).
4. Paste **Agent 2** → CR vs architect lock.
5. Paste **Agent 3** → PM accept / close.
6. Next story.

Do **not** run Agent 0 of Story N+1 until Story N Agent 3 is done (unless stories are truly independent and you accept parallel risk).

---

## Story 1 — Containerize

Story file: `STORY_01_containerize.md`

```text
--agent 0 sprint 20 story 1
```

```text
--agent 1 sprint 20 story 1
```

```text
--agent 2 sprint 20 story 1
```

```text
--agent 3 sprint 20 story 1
```

**Expanded prompts (if short cmd needs context):**

```
Execute Sprint 20 Story 1 — Agent 0 Architect.
Read STORY_01_containerize.md. Lock decisions (base image, standalone Next, compose Redis, migrate entrypoint). Write handoff to handoffs/STORY_01_containerize/agent-0-architect.md. Skip Agent 4 unless you require live compose e2e.
```

```
Execute Sprint 20 Story 1 — Agent 1 Dev.
Follow handoffs/.../agent-0-architect.md. Implement or verify Dockerfiles/compose/migrate against lock. Tests/build as applicable. Commit only if gaps fixed. Write agent-1-dev.md.
```

```
Execute Sprint 20 Story 1 — Agent 2 CR.
Review code vs architect lock. Write agent-2-cr.md with pass/fail + required fixes.
```

```
Execute Sprint 20 Story 1 — Agent 3 PM.
Accept or reject story. Update STORY_01 status + README. Write agent-3-pm.md.
```

---

## Story 2 — Terraform / infra as code

Story file: `STORY_02_infra_as_code.md`

```text
--agent 0 sprint 20 story 2
```

```text
--agent 1 sprint 20 story 2
```

```text
--agent 2 sprint 20 story 2
```

```text
--agent 3 sprint 20 story 2
```

**Expanded:**

```
Execute Sprint 20 Story 2 — Agent 0 Architect.
Read STORY_02_infra_as_code.md + DEPLOY_AWS_DEV.md. Lock VPC/RDS/Redis/S3/ALB stickiness/ECS/ECR/outputs. Write handoffs/STORY_02_infra_as_code/agent-0-architect.md. Note apply is human-gated. Skip Agent 4.
```

```
Execute Sprint 20 Story 2 — Agent 1 Dev.
Follow architect lock. Implement/verify infra/terraform/**. terraform fmt/validate. Write agent-1-dev.md. Do not require terraform apply.
```

```
Execute Sprint 20 Story 2 — Agent 2 CR.
Review Terraform vs lock (SGs, /health, stickiness, outputs). Write agent-2-cr.md.
```

```
Execute Sprint 20 Story 2 — Agent 3 PM.
Accept/reject. Update story status. Write agent-3-pm.md.
```

---

## Story 3 — Secrets & runtime config

Story file: `STORY_03_secrets_and_config.md`

```text
--agent 0 sprint 20 story 3
```

```text
--agent 1 sprint 20 story 3
```

```text
--agent 2 sprint 20 story 3
```

```text
--agent 3 sprint 20 story 3
```

**Expanded:**

```
Execute Sprint 20 Story 3 — Agent 0 Architect.
Read STORY_03 + DEPLOY_AWS_DEV §6 + infra/env/DEV_CONFIG_MANIFEST.md. Lock secret vs SSM vs NEXT_PUBLIC bake rules + cloud defaults (COOKIE_SECURE, S3, Rekognition, STRUCTURED_LOG_FILE=0). Write handoffs/STORY_03_secrets_and_config/agent-0-architect.md.
```

```
Execute Sprint 20 Story 3 — Agent 1 Dev.
Follow lock. Implement/verify secrets module + ECS wiring + manifest. No real secrets in git. Write agent-1-dev.md.
```

```
Execute Sprint 20 Story 3 — Agent 2 CR.
Review classification, least-privilege IAM, no secret leakage. Write agent-2-cr.md.
```

```
Execute Sprint 20 Story 3 — Agent 3 PM.
Accept/reject. Write agent-3-pm.md.
```

---

## Story 4 — CI/CD pipeline

Story file: `STORY_04_cicd_pipeline.md`

```text
--agent 0 sprint 20 story 4
```

```text
--agent 1 sprint 20 story 4
```

```text
--agent 2 sprint 20 story 4
```

```text
--agent 3 sprint 20 story 4
```

**Expanded:**

```
Execute Sprint 20 Story 4 — Agent 0 Architect.
Read STORY_04 + CI_CD.md. Lock: OIDC only, migrate-before-deploy, API then UI, health gate, NEXT_PUBLIC rebuild. Write handoffs/STORY_04_cicd_pipeline/agent-0-architect.md. Skip Agent 4 (live deploy is human).
```

```
Execute Sprint 20 Story 4 — Agent 1 Dev.
Follow lock. Implement/verify .github/workflows + scripts. Write agent-1-dev.md.
```

```
Execute Sprint 20 Story 4 — Agent 2 CR.
Review OIDC, migrate-once, order, no static AWS keys. Write agent-2-cr.md.
```

```
Execute Sprint 20 Story 4 — Agent 3 PM.
Accept/reject. Write agent-3-pm.md.
```

---

## Story 5 — Cloud verification

Story file: `STORY_05_verification.md`

```text
--agent 0 sprint 20 story 5
```

```text
--agent 1 sprint 20 story 5
```

```text
--agent 2 sprint 20 story 5
```

```text
--agent 3 sprint 20 story 5
```

**Expanded:**

```
Execute Sprint 20 Story 5 — Agent 0 Architect.
Read STORY_05 + VERIFICATION_CHECKLIST.md + VERIFIED_DEV.md. Lock automated vs manual checks; PENDING_INFRA until live URL. Write handoffs/STORY_05_verification/agent-0-architect.md. Agent 4 only if live BASE_URL exists.
```

```
Execute Sprint 20 Story 5 — Agent 1 Dev.
Follow lock. Implement/verify smoke script + CI hook + checklist. Do not invent live passes. Write agent-1-dev.md.
```

```
Execute Sprint 20 Story 5 — Agent 2 CR.
Review checklist completeness vs L1–L10. Write agent-2-cr.md.
```

```
Execute Sprint 20 Story 5 — Agent 3 PM.
Accept tooling as Done / live gate PENDING_INFRA, or reject. Update VERIFIED_DEV.md status. Write agent-3-pm.md.
```

---

## Full paste order (copy block)

```text
--agent 0 sprint 20 story 1
--agent 1 sprint 20 story 1
--agent 2 sprint 20 story 1
--agent 3 sprint 20 story 1

--agent 0 sprint 20 story 2
--agent 1 sprint 20 story 2
--agent 2 sprint 20 story 2
--agent 3 sprint 20 story 2

--agent 0 sprint 20 story 3
--agent 1 sprint 20 story 3
--agent 2 sprint 20 story 3
--agent 3 sprint 20 story 3

--agent 0 sprint 20 story 4
--agent 1 sprint 20 story 4
--agent 2 sprint 20 story 4
--agent 3 sprint 20 story 4

--agent 0 sprint 20 story 5
--agent 1 sprint 20 story 5
--agent 2 sprint 20 story 5
--agent 3 sprint 20 story 5
```

**20 commands total** (4 × 5). Run sequentially unless you explicitly parallelize independent stories.

---

## After Sprint 20 agents

Talk before Sprint 27 — decide: same 4-agent pipeline for match-list stories, or different.

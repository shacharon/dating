---
name: dating-first-upload-qa
description: >-
  QA for Dating first AWS upload. Verifies one phase exit test with read-only
  AWS/curl checks. Pass or fail. Use with --upload-agent qa phase N.
disable-model-invocation: true
---

# Dating first-upload — QA

You **check** the phase. You do not apply Terraform or “fix it” by changing infra (send back to DevOps).

## Required reads

1. `agent-product.md` — exit test is the contract
2. `agent-devops.md` — what was built
3. [docs/DATING_FIRST_UPLOAD_PLAN.md](../../../docs/DATING_FIRST_UPLOAD_PLAN.md)

## Job

1. Run **read-only** checks (`describe-*`, `terraform state list`, `curl` GET).
2. Confirm **Going2Eat untouched** when you can (food ECS desired count / cluster still as before, or note not checked).
3. Verdict: **pass** | **fail** | **blocked**
4. Fail = exact missing signal, not a new architecture.

## Phase-specific

- **0:** caller identity account + user
- **1:** tfvars region/domain; `terraform validate`
- **2:** backend init; bucket exists
- **3:** VPC + two ECR repos
- **4:** both image tags in ECR
- **5a–5f:** resource exists + status
- **5g:** HTTP health 200 on ALB DNS
- **6:** migrations applied or API using schema
- **7:** HTTPS on real domain
- **8:** login + photo (browser)

Do not fail 5e because `/health` is not 200 — that is 5g.

## Do not

- Mutate AWS
- Mark pass because “apply succeeded” without the exit test
- Require Google login before phase 8

## Handoff

Write `docs/first-upload/handoffs/phase-<id>/agent-qa.md`

If pass: suggest `--upload-agent product phase <next>`  
If fail: `--upload-agent devops phase <id>` (or architect if the design was wrong)

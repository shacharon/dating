# Dating first upload — product plan

Source of truth for putting Dating on AWS the first time. Plain language. Agents read this before they work.

**Do not start this chat’s AWS spend until the operator says so.** Phases 1–2 are free. Cost starts at phase 3.

## Locked decisions (do not reopen without the operator)

| Decision | Value |
|----------|--------|
| AWS account | Same as Going2Eat: `907390934996` (profile `pizza`) |
| New account (old phase 0) | **Skipped.** One house, two apps. |
| IAM user | Existing `shachar-admin`. Not root. |
| Region | `eu-central-1` (Frankfurt) — Rekognition exists here; Stockholm does not |
| Domain | None for now. Use the ugly ALB hostname. Real domain later this week (phase 7). |
| Isolation | New VPC named `dating-*`. Never create, update, or delete `food-*` / Going2Eat resources. |
| Login / Google | Not in the first live check. Needs HTTPS (phase 7) then Google (phase 8). |

## How the four agents work

Run **one agent per message**. Do not auto-chain.

```text
--upload-agent product   phase <id>
--upload-agent architect phase <id>
--upload-agent devops    phase <id>
--upload-agent qa        phase <id>
```

Order for every phase:

1. **Product** — what this phase is, why, exit test, stop/go.
2. **Architect** — exact AWS/Terraform design for *this* phase only. No apply.
3. **DevOps** — does the work. Needs architect handoff. Asks before any paid apply.
4. **QA** — proves the exit test. Needs devops handoff. Pass or fail, no redesign.

Handoffs (local): `docs/first-upload/handoffs/phase-<id>/`

Orchestrator skill: `.cursor/skills/dating-first-upload-run/SKILL.md`

---

## Phase list

| ID | Name | Money | Exit test |
|----|------|-------|-----------|
| 0 | Account | $0 | Same account `907390934996`, profile `pizza`, not root |
| 1 | Settings file | $0 | `terraform.tfvars` exists; `terraform validate` passes |
| 2 | Terraform notebook (state) | pennies | State bucket + lock table exist; `dev/` uses them |
| 3 | Network + image shelves (ECR) | ~$1/day (NAT) | VPC `dating-*` + ECR repos `dating-api`, `dating-ui` |
| 4 | Build and push images | $0 extra | Both images tagged in ECR |
| 5a | Photo bucket (S3) | cheap | Photos bucket exists |
| 5b | Photo CDN (CloudFront) | cheap | CloudFront domain exists (skippable) |
| 5c | Database (RDS) | **expensive wait** | RDS status `available` |
| 5d | Redis | wait | Redis `available` |
| 5e | Load balancer (ALB) | ALB hourly | Ugly hostname exists |
| 5f | IAM + secret placeholders | cheap | Task roles + secrets exist |
| 5g | Start servers (ECS) | Fargate hourly | `http://<alb>/health` → 200 |
| 6 | Database tables | $0 extra | API talks to real schema |
| 7 | Domain + HTTPS | later | `https://<domain>/` loads |
| 8 | Google login | later | Operator can log in and upload a photo |

**First live app** = after **5g** (ugly URL, no login). **Real product** = after **8**.

---

## Phase 0 — Account (done)

**What:** Dating lives in the existing Going2Eat AWS account. No second signup.

**Why:** Operator opened root of `907390934996`, not a new account. Same `shachar-admin` is enough.

**Do:** Sign out of root. Use `shachar-admin` / `--profile pizza`.

**Do not:** Create another IAM user named `shachar-admin` in this account. Do not use root for Terraform.

**Exit test:** `aws sts get-caller-identity --profile pizza` shows account `907390934996` and user `shachar-admin`.

**Status:** Complete.

---

## Phase 1 — Settings file

**What:** Write `infra/terraform/dev/terraform.tfvars` (gitignored). Copy from the example. Set region Frankfurt, empty domain.

**Why:** Terraform will not guess. This is the answer sheet.

**Do not:** `terraform apply`. Do not commit secrets.

**Exit test:** File on disk; `cd infra/terraform/dev; terraform init -backend=false; terraform validate` succeeds.

---

## Phase 2 — Terraform notebook (remote state)

**What:** Apply `infra/terraform/bootstrap` so Terraform stores its memory in S3 + DynamoDB. Point `dev/backend.tf` at it.

**Why:** Without this, two applies can fight and duplicate resources.

**Exit test:** Bucket and lock table exist in `eu-central-1`. `terraform init` in `dev/` uses that backend.

---

## Phase 3 — Network + ECR (first real cost)

**What:** VPC, subnets, single NAT, security groups, two ECR repos. Terraform `-target` only these modules.

**Why:** Images need shelves. Servers need a private network. NAT is the first daily cost.

**Hard stop:** Confirm with operator before apply.

**Exit test:** VPC named for dating; ECR `dating-api` and `dating-ui` in `eu-central-1`. No `food-*` changes.

---

## Phase 4 — Build and push images

**What:** Docker build API + UI, push to those ECR repos with a real tag (not only `latest`).

**Why:** If ECS starts before images exist, services stay red for a fake reason.

**Exit test:** `aws ecr describe-images` shows both tags.

---

## Phase 5a — Photo bucket

**What:** S3 module only.

**Exit test:** Bucket exists; public access blocked.

---

## Phase 5b — Photo CDN (optional)

**What:** CloudFront in front of the bucket. Can skip until photos matter.

**Exit test:** CloudFront distribution domain exists, or operator signed skip.

---

## Phase 5c — Database

**What:** RDS Postgres. Slow (15–20+ min). This is the cost jump.

**Hard stop:** Operator consent.

**Exit test:** Instance `available`. Password stays in Secrets Manager, not chat.

---

## Phase 5d — Redis

**What:** ElastiCache for sessions/cache.

**Exit test:** Cluster `available`.

---

## Phase 5e — Load balancer

**What:** ALB, HTTP only (no cert). This creates the ugly hostname.

**Exit test:** DNS name printed. Browser/curl may fail until 5g — hostname must exist.

---

## Phase 5f — IAM + secrets placeholders

**What:** Task roles, execution role, empty/generated secrets. Google secret can stay placeholder.

**Exit test:** Roles exist; ECS can read secrets ARNs.

---

## Phase 5g — Start servers

**What:** ECS Fargate API + UI, 1 task each, behind the ALB.

**Exit test:** `curl http://<alb-dns>/health` returns 200. This is “the first upload.”

**Known gap:** Google login will fail until phase 7–8 (`Secure` cookies + HTTPS).

---

## Phase 6 — Database tables

**What:** Prisma migrate as a one-off task on the private network (or approved equivalent). Empty DB is not “app works.”

**Exit test:** A real API call that needs tables succeeds (or migrate status lists applied migrations).

---

## Phase 7 — Domain + HTTPS (later this week)

**What:** Operator buys/points a domain. ACM cert in `eu-central-1`. Fill `domain_name`, `route53_zone_id`, `acm_certificate_arn`. Re-apply ALB listeners.

**Exit test:** `https://<domain>/` loads.

---

## Phase 8 — Google login

**What:** Google Console authorized origin + redirect. Fill OAuth secrets. Set cookie/CORS to the real domain.

**Exit test:** Operator logs in and uploads a photo.

---

## Skills map

| Role | Skill |
|------|--------|
| Orchestrator | `.cursor/skills/dating-first-upload-run/SKILL.md` |
| Product | `.cursor/skills/dating-first-upload-product/SKILL.md` |
| Architect | `.cursor/skills/dating-first-upload-architect/SKILL.md` |
| DevOps (do it) | `.cursor/skills/dating-first-upload-devops/SKILL.md` |
| QA | `.cursor/skills/dating-first-upload-qa/SKILL.md` |
| Per-phase playbook | `.cursor/skills/dating-first-upload-run/phases.md` |
| Shared AWS how-to (personal) | `~/.cursor/skills/deploy-aws-app/SKILL.md` |

**Never load** `going2eat-deploy` / angular-piza AWS config in this pipeline.

## Safety

- Profile: `pizza`. Region: `eu-central-1`.
- Consent before `terraform apply`, ECS scale-up, RDS create.
- No root. No access keys in git or chat.
- Tear-down later is `terraform destroy` on the dating stack only — still needs consent.

## Parked issues (do not fix during first upload)

See [first-upload/OPEN_ISSUES.md](first-upload/OPEN_ISSUES.md). Revisit at conclusion of the first-upload pipeline.

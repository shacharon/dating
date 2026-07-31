# Story 02 — Provision AWS infra as code

**Sprint 20 · Status: ✅ Done (PENDING_APPLY)** — code + 4-agent CR complete; `terraform apply` is human-gated

**Handoffs:** [architect](./handoffs/STORY_02_infra_as_code/agent-0-architect.md) · [dev](./handoffs/STORY_02_infra_as_code/agent-1-dev.md) · [CR](./handoffs/STORY_02_infra_as_code/agent-2-cr.md) · [PM](./handoffs/STORY_02_infra_as_code/agent-3-pm.md)

## Objective
Define all AWS `dev` infrastructure as Terraform (click-ops is banned) so the environment is reproducible and reviewable in a PR.

## Why
Nothing in the repo provisions AWS today; services are only consumed at runtime via env vars. To deploy ECS Fargate we need networking, data stores, and the ECS control plane defined as code.

## Scope / tasks (Terraform modules under `infra/terraform/dev/`)
1. **State backend** — S3 bucket + DynamoDB lock table (or Terraform Cloud).
2. **Networking** — VPC (or reuse), public subnets (ALB), private subnets (Fargate/RDS/Redis), NAT, security groups:
   - ALB SG: 443 from internet.
   - API/UI SG: app ports from ALB only.
   - RDS SG: 5432 from API SG only.
   - Redis SG: 6379 from API SG only.
3. **RDS Postgres 16** — `db.t4g.small` (dev), db `dating`, app user, backups on, `sslmode=require`, not publicly accessible.
4. **ElastiCache Redis** — single node, private subnets, in-transit encryption optional (`rediss://` if on).
5. **S3** — private photo bucket, Block Public Access ON, lifecycle rules optional.
6. **IAM** — ECS **task role** with scoped S3 (`Put/Get/Delete` on bucket) + Rekognition (`DetectModerationLabels`, `DetectFaces`); **execution role** for ECR pull + secrets read.
7. **CloudFront** (optional this sprint) — distribution over the S3 bucket via OAC; key group for signed URLs.
8. **ALB + ACM + Route53** — HTTPS listener, one origin, path/host routing to UI (default) and API (`/api/*`, `/socket.io`); **stickiness enabled** on the API target group.
9. **ECS cluster + services** — Fargate cluster, task definitions for API and UI (image from ECR, secrets from SSM), service min/desired counts (API 1–2, UI 1), health check → `/health`.
10. **ECR repositories** — one per image.
11. **Outputs** — ALB DNS, RDS endpoint, Redis endpoint, bucket name, CloudFront domain, ECR URIs (consumed by Stories 03/04).

## Acceptance criteria
- [x] Terraform modules + README + outputs exist and CR-pass vs lock *(code-complete)*
- [ ] `terraform plan` is clean and reviewed; `terraform apply` provisions the full `dev` stack from zero. *(PENDING_APPLY — human)*
- [ ] RDS + Redis are reachable **only** from the API SG (verified, not public). *(enforced in code; live verify PENDING_APPLY)*
- [ ] ECS task role can read/write the S3 bucket and call Rekognition (dry-run/CLI check). *(IAM in code; live verify PENDING_APPLY)*
- [x] ALB health check on `/health` + API TG stickiness on *(in Terraform; CR PASS)*
- [x] All outputs needed by CI/CD exported *(outputs.tf)*
- [x] `terraform destroy` enabled for `dev` (deletion protection / force_destroy flags) *(in code)*

## Notes / gotchas
- `/health` is **not** under `/api` — set the ALB health check path accordingly.
- Fargate needs NAT (or VPC endpoints) to reach OpenAI/Rekognition/ECR/SSM. Prefer VPC endpoints for AWS APIs to cut NAT cost.
- Keep the module prod-extensible (workspaces or `dev`/`prod` var files) so prod is a copy with bigger sizing.

## Deliverables
`infra/terraform/dev/` module set, README with `init/plan/apply` instructions, outputs documented.

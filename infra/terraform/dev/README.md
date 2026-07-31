# Terraform — AWS `dev` (ECS Fargate)

Provisions the Sprint 20 `dev` stack from [`DEPLOY_AWS_DEV.md`](../../../DEPLOY_AWS_DEV.md) as code. Click-ops is banned.

```
Route53 → ACM/HTTPS → ALB ──┬── UI (Fargate :3000)
                            └── API (Fargate :3001, sticky)
RDS Postgres 16 · ElastiCache Redis · S3 · Rekognition · CloudFront (optional)
```

## Layout

```
infra/terraform/
├── bootstrap/          # One-shot S3 + DynamoDB for remote state
├── modules/            # Reusable modules (prod-extensible)
│   ├── networking/
│   ├── security_groups/
│   ├── vpc_endpoints/
│   ├── rds/
│   ├── redis/
│   ├── s3_photos/
│   ├── cloudfront/     # toggle via enable_cloudfront
│   ├── iam/
│   ├── ecr/
│   ├── alb/
│   └── ecs/
└── dev/                # Root module for the `dev` environment
```

For a future `prod` environment, copy `dev/` → `prod/` (or use workspaces) and override sizing via tfvars.

## Prerequisites

- Terraform **≥ 1.5**
- AWS credentials with permission to create VPC, RDS, ElastiCache, S3, IAM, ECR, ECS, ALB, ACM/Route53 (optional), CloudFront (optional)
- (Recommended) An ACM certificate in the **same region** as the ALB, plus a Route53 hosted zone
- Container images (Story 01 Dockerfiles + Story 04 CI push). First apply creates ECS services pointing at `:latest`; tasks stay unhealthy until images exist

## 1. Bootstrap remote state (recommended)

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
# Edit state_bucket_name to a globally unique value
terraform init
terraform apply
```

Copy the printed `backend_hcl_snippet` into `../dev/backend.tf` (uncomment / replace the commented block), then:

```bash
cd ../dev
terraform init -migrate-state
```

**First apply without remote state is fine** — leave `backend.tf` commented and use local state until the bucket exists.

## 2. Configure `dev`

```bash
cd infra/terraform/dev
cp terraform.tfvars.example terraform.tfvars
# Edit domain_name, acm_certificate_arn, route53_zone_id as available
```

Useful variables:

| Variable | Default | Notes |
|----------|---------|--------|
| `aws_region` | `us-east-1` | |
| `acm_certificate_arn` | `""` | Empty → HTTP-only ALB (bootstrap) |
| `domain_name` / `route53_zone_id` | `""` | Optional alias to the ALB |
| `enable_cloudfront` | `true` | Photo CDN + OAC + signing key |
| `enable_vpc_endpoints` | `true` | Cuts NAT cost for AWS APIs |
| `api_image_tag` / `ui_image_tag` | `latest` | Overridden by CI later |
| `api_secrets` / `ui_secrets` | `[]` | Story 03 fills SSM/Secrets ARNs |

## 3. Init / plan / apply

```bash
cd infra/terraform/dev
terraform init
terraform fmt -recursive ..
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Typical first apply takes **20–40+ minutes** (RDS + ElastiCache dominate).

### Apply blockers (expected)

| Blocker | What to do |
|---------|------------|
| No AWS credentials | Configure `AWS_PROFILE` / `aws configure`; code still reviews via PR |
| No ACM cert yet | Leave `acm_certificate_arn=""`; use `http://<alb_dns>` until cert exists |
| ECR images missing | Services create but fail health checks until Story 01/04 push images |
| Secrets empty | API will crash-loop without `OPENAI_API_KEY` / `DATABASE_URL` — Story 03 |

## 4. Outputs (Stories 03 / 04)

```bash
terraform output
```

| Output | Used for |
|--------|----------|
| `alb_dns_name` / `app_url` | Smoke tests, CORS |
| `rds_endpoint` / `rds_secrets_manager_arn` | `DATABASE_URL` (Story 03) |
| `redis_endpoint` / `redis_url` | `REDIS_URL` |
| `photo_bucket_name` | `PHOTO_S3_BUCKET` |
| `cloudfront_domain` / `cloudfront_key_pair_id` | Photo CDN |
| `cloudfront_signing_private_key_pem` | **Sensitive** — store in Secrets Manager, never commit |
| `ecr_dating_api_url` / `ecr_dating_ui_url` | CI image push |
| `ecs_cluster_name` / `ecs_api_service_name` / `ecs_ui_service_name` | Deploy pipeline |
| `ecs_task_role_arn` / `ecs_execution_role_arn` | IAM verification |
| `api_service_discovery_hostname` | UI `API_PROXY_TARGET` |

## Security group summary

| SG | Inbound |
|----|---------|
| ALB | 443 (and 80) from `0.0.0.0/0` |
| API | `:3001` from ALB SG (+ UI SG for SSR proxy) |
| UI | `:3000` from ALB SG |
| RDS | `5432` from API SG only |
| Redis | `6379` from API SG only |

## ALB routing & health

- Default action → **UI** target group
- Path rules → **API** target group: `/api/*`, `/socket.io*`, `/health*`
- API target group **stickiness ON** (`lb_cookie`)
- API health check path: **`/health`** (not under `/api`)

## Destroy (cost hygiene)

Dev has deletion protection **OFF** on RDS/ALB and `force_destroy` on the photo bucket / ECR.

```bash
cd infra/terraform/dev
terraform destroy
```

CloudFront + RDS deletion can take a long time. Bootstrap state bucket is **not** destroyed by this (manage separately).

## Module map

| Module | Responsibility |
|--------|----------------|
| `networking` | VPC, public/private subnets, IGW, NAT |
| `security_groups` | ALB / API / UI / RDS / Redis SGs |
| `vpc_endpoints` | S3 gateway + ECR/SSM/Secrets/Logs/Rekognition interfaces |
| `rds` | Postgres 16 `db.t4g.small`, db `dating`, Secrets Manager password |
| `redis` | Single-node ElastiCache Redis 7 |
| `s3_photos` | Private bucket, Block Public Access ON |
| `cloudfront` | OAC distribution + optional signed-URL key group |
| `iam` | Task role (S3+Rekognition) + execution role (ECR+secrets) |
| `ecr` | `dating-api`, `dating-ui` repos |
| `alb` | HTTPS listener, path routing, sticky API TG |
| `ecs` | Fargate cluster, API/UI services, Cloud Map DNS |

## Related stories

- Story 01 — Dockerfiles (images consumed here)
- Story 03 — SSM / Secrets Manager wiring into `api_secrets` / `ui_secrets`
- Story 04 — CI/CD push to ECR + rolling ECS deploy using outputs above

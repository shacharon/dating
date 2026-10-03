# Dating-dev AWS cost reduction

**Status: PLANNED. Nothing has been applied. Documentation only.**
Written: 2026-10-03. Account `907390934996` (profile `pizza`), region `eu-central-1`.
Terraform: `infra/terraform/dev` (all resources tagged `ManagedBy=terraform`, `Project=dating`).

---

## 1. Existing state (verified read-only on 2026-10-03)

### Cost
- Steady daily cost for `eu-central-1`: about **$4.83/day, about $145/month** (pre-tax).
- Estimated split (list-price estimate, not billed lines):

| Item | ~$/month |
|---|---|
| NAT gateway `dating-dev-nat-0` (hours, data, IP) | 48 |
| Fargate: api 0.5 vCPU / 1 GB, ui 0.25 vCPU / 0.5 GB | 31 |
| RDS `dating-dev-postgres` db.t4g.small, 20 GB gp3 | 26 |
| ALB `dating-dev-alb` | 17 |
| Redis `dating-dev-redis-001` cache.t4g.micro | 12 |
| Public IPv4 addresses (ALB) | 10 |

### Network
- ECS services `dating-dev-api` and `dating-dev-ui` (cluster `dating-dev-cluster`) run in the **private** subnets
  (`dating-dev-private-eu-central-1a/b`) with `assign_public_ip = false`
  (`modules/ecs/main.tf`, lines ~248-294). They therefore depend on the NAT gateway for ECR pulls and outbound calls.
- Security groups (`modules/security_groups/main.tf`): api and ui accept inbound only from the ALB security group,
  and api from ui. RDS (5432) and Redis (6379) accept inbound only from the api security group.
- NAT is controlled by `enable_nat_gateway` (default `true`) and `single_nat_gateway = true` in `modules/networking`.

### Drift found by `terraform plan` (read-only, no lock, nothing saved)
Plan result: **13 to add, 0 to change, 1 to destroy.**
1. `enable_vpc_endpoints = true` in `dev/terraform.tfvars`, but **no VPC endpoints exist in AWS**.
   A plain `terraform apply` would create 8 interface endpoints (ecr.api, ecr.dkr, logs, secretsmanager, ssm,
   ssmmessages, ec2messages, rekognition) + S3 gateway endpoint + security group and rules.
   Interface endpoints cost about $7/month each per AZ, so this would **add roughly $100/month**.
2. `module.ecs.aws_ecs_task_definition.api` **must be replaced**: `container_definitions` differs from what is
   running (likely a change deployed outside Terraform). Cause not yet identified.

**Do not run a plain `terraform apply` until both are resolved.**

---

## 2. Planned change

1. Set `enable_vpc_endpoints = false` in `dev/terraform.tfvars` (matches what is actually deployed).
2. Identify the `container_definitions` drift and align the code with the running task definition
   (do not overwrite a newer deployed image with an older one).
3. Add an `assign_public_ip` variable to `modules/ecs` and pass `module.networking.public_subnet_ids` for api and ui.
4. Set `enable_nat_gateway = false`. Terraform then removes the NAT gateway, its elastic IP and the private
   default route to it.

## 3. Reason

- The NAT gateway is the largest single dev cost (~$48/month) for a dev environment.
- Only the ECS tasks need outbound access. Database and Redis do not.
- Public subnets plus a public IP on the tasks give the same outbound access through the internet gateway,
  costing about $3.65/month per task for IPv4, about $7 for two.
- VPC endpoints are not a cheaper replacement here: interface endpoints cost more than the NAT they replace.

## 4. Expected result

| | $/month |
|---|---|
| NAT removed | -48 |
| Public IPv4 on 2 tasks | +7 |
| **Net** | **about -40** (dev: about $145 to about $105) |

Security: tasks get public IPs, but inbound is still limited by security groups to the ALB only.
Verify this before applying (see checklist).

---

## 5. To-do (in order, each step needs explicit approval)

- [x] 1. Edit `dev/terraform.tfvars`: `enable_vpc_endpoints = false`. (Done 2026-10-03, local edit only, not committed, not applied.)
- [x] 2. Task definition drift found (2026-10-03): the ONLY difference is the API container health check command.
      Terraform tracked rev 6 (`wget ...`); code since commit 28f9ca98 (Sep 22) uses `node -e fetch(...)`. Never applied via Terraform.
      Running service is on rev 15 (deployed by the pipeline). Both ECS services have
      `lifecycle { ignore_changes = [task_definition, desired_count] }`, so applying cannot repoint the services.
      Harmless: an apply only registers an unused new API task definition revision.
- [x] 3. Plan after step 1: 1 add, 1 destroy (task definition only), no VPC endpoints.
- [x] 4. Code change written (2026-10-03, local only, NOT applied, NOT committed): ecs module got `task_subnet_ids` and
      `assign_public_ip` (defaults keep old behaviour); `dev` got `ecs_assign_public_ip` (set `true` in terraform.tfvars).
      NAT still **enabled**. Plan: `1 to add, 2 to change, 1 to destroy` =
      api + ui services updated in place (private -> public subnets, assign_public_ip false -> true; this triggers a
      rolling redeploy) + unused api task definition revision replaced.
- [x] 5. Applied 2026-10-03 (targeted: api + ui ECS services; `1 added, 2 changed, 1 destroyed`, the 1+1 being the unused api task definition revision).
      Before: api -> dating-dev-api:15, ui -> dating-dev-ui:11, tasks in private subnets (targets 10.20.51.181 / 10.20.44.72).
- [x] 6. Verified after apply: both services rollout COMPLETED, running 1/1, same task defs (:15 / :11),
      ALB targets healthy on public-subnet IPs (10.20.7.65 / 10.20.13.158), https://findyouraidate.com returns 200,
      0 errors in `/ecs/dating-dev/*` logs (ERROR/ETIMEDOUT/ECONNREFUSED/EAI_AGAIN) in the 10 minutes after.
      Task security groups: ingress only from ALB/ui security groups, no CIDR rules.
      NAT gateway is still in place (removal is step 7).
- [x] 7. Applied 2026-10-03: `enable_nat_gateway = false` (new `dev` variable, set in terraform.tfvars).
      Plan/apply: `1 added, 1 changed, 3 destroyed` = NAT gateway nat-03249cf7e7b786b31 (public IP was 63.184.96.35,
      not referenced anywhere in the repo), its EIP, the private NAT route; plus a per-AZ private route table recreated.
      Only Redis and RDS remain in the private subnets (no internet needed).
- [x] 8. Verified: forced a new deployment of api and ui WITHOUT a NAT (fresh tasks had to pull from ECR and read secrets):
      rollout COMPLETED 1/1 both, ALB targets healthy (10.20.21.47 / 10.20.6.168), https://findyouraidate.com -> 200,
      0 errors in `/ecs/dating-dev/*` logs. No NAT gateways remain.
- [ ] 8b. Watch the next day's cost (target about $3.3-3.6/day, was $4.83/day).
- [ ] 9. Later, separate change: stop ECS and RDS outside working hours (about -$35-40/month).

### Verification checklist
- Both ECS services `runningCount == desiredCount`, rollout `COMPLETED`.
- ALB target groups healthy; site and API health endpoint respond.
- Tasks can pull images and read secrets (no errors in `/ecs/` log groups).
- Task security groups allow inbound only from the ALB security group (no `0.0.0.0/0` ingress).
- RDS and Redis connectivity from api (check app logs).

## 6. Rollback ("back")

- **Before step 7 (NAT still exists):** revert the ecs module change (`assign_public_ip = false`, private subnets),
  `terraform apply`. Services go back to private subnets through the existing NAT.
- **After step 7 (NAT removed):** set `enable_nat_gateway = true`, then revert the ecs module change,
  `terraform apply`. Terraform recreates the NAT gateway and a new EIP (about a few minutes).
  The NAT's old public IP address is not recoverable. This matters only if an external allow-list uses it.
  **Action before step 7: confirm no third-party service allow-lists the NAT IP of `dating-dev-nat-0`.**
- Git: all code changes happen on a branch of `shacharon/dating`; rollback of code is a revert of that commit.
- Keep a copy of the currently running task definition ARNs (api and ui) before step 5.

## 6b. When to switch back (production / more budget)

- Private subnets + NAT gateway (`assign_public_ip = false`, `enable_nat_gateway = true`) is the standard, more secure
  design for production: tasks have no public IP. Return to it when dating has real users.
- VPC endpoints (`enable_vpc_endpoints`) are intentionally **off**. The 8 endpoints (ecr.api, ecr.dkr, logs,
  secretsmanager, ssm, ssmmessages, ec2messages, rekognition) cost about $100/month. Only enable them if
  (a) NAT data charges exceed that, or (b) a security rule forbids any internet egress from tasks.

## 7. Open questions
- Is anyone actively using dating-dev (timing of redeploys)?
- Does any external service allow-list the NAT public IP?
- What changed in the api task definition outside Terraform, and who deployed it?

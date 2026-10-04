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

---

# Phase 2: Stop dating-dev outside working hours (PLANNED, nothing applied)

Written: 2026-10-03. Account `907390934996`, `eu-central-1`.

## Existing (verified read-only)
- Everything runs 24/7: ECS api (0.5 vCPU/1 GB) + ui (0.25 vCPU/0.5 GB), RDS `dating-dev-postgres` (db.t4g.small, 20 GB, backups 7d), ALB, Redis, 2 task public IPs.
- The API has an Application Auto Scaling target (`service/dating-dev-cluster/dating-dev-api`, min 1, max 2). The UI has none.
- Both ECS services have `ignore_changes = [task_definition, desired_count]` in Terraform, so Terraform will not fight a schedule that changes the desired count.
- Deploy pipeline (`.github/workflows/deploy-dev.yml`, push to `main`) calls `ecs-update-service.sh`, which updates the service and waits for `services-stable`.
- The installed AWS CLI (2.6.3) has no `scheduler` command, so the schedule is created through Terraform (EventBridge Scheduler), not the CLI.

## Cost: 8 hours a day (pre-tax, per month; dating-dev after NAT removal is about $110 running 24/7)

| Item | 24/7 | 8h/day, 7 days | 8h/day, Mon-Fri |
|---|---|---|---|
| Fargate api + ui | 31 | 10 | 7 |
| RDS instance compute | 27 | 9 | 6 |
| RDS storage + backups (always) | 3 | 3 | 3 |
| Task public IPv4 (hourly) | 7 | 2 | 2 |
| ALB (always) | 20 | 20 | 20 |
| Redis (always) | 13 | 13 | 13 |
| ALB public IPv4 (always) | 7 | 7 | 7 |
| Secrets Manager (always) | 4 | 4 | 4 |
| **Total** | **~112** | **~68** | **~62** |
| Saving vs 24/7 | | **~44** | **~50** |

The ALB, Redis, ALB IPs and secrets cannot be stopped, so about $44/month is the floor while the environment exists.

## Planned change
1. Terraform module `modules/scheduler` + `dev` wiring, variable `enable_dev_schedule` (default false).
2. EventBridge Scheduler schedules, timezone `Asia/Jerusalem`:
   - 08:45 start RDS (`rds:startDBInstance`) so it is ready.
   - 09:00 ECS ui desired count 1; API: Application Auto Scaling scheduled action sets min/max back to 1/2.
   - 17:00 API scheduled action sets min/max to 0/0; ECS ui desired count 0.
   - 17:15 stop RDS (`rds:stopDBInstance`).
   - Optional weekdays only (`MON-FRI`).
3. One IAM role for the scheduler with only: start/stop this DB, update-service on these two services, register scalable target for the api.

## Reason
Same as phase 1: dev environment is idle most of the day; compute-hours are the only part that can be switched off.

## Risks and how they are handled
- **API autoscaling min=1** would undo "desired 0". Handled by scheduling the autoscaling min/max, not the desired count.
- **RDS startup takes ~5-10 minutes**: start RDS 15 minutes before ECS.
- **AWS auto-restarts a stopped RDS after 7 days.** A daily schedule restarts it every morning, so this never triggers. For long holidays, disable the schedule on purpose (the restart would otherwise bill compute).
- **Deploy on push to `main` while stopped**: `services-stable` returns immediately at 0/0 and the new image only runs the next morning. Smoke tests in the pipeline would fail at night. Option: deploy only during hours, or add a pipeline step that starts the environment first.
- **Demo outside hours**: manual start = run the same start steps (documented below).
- **Redis** keeps running (cannot be paused), cache loses nothing important.

## To-do (each step needs explicit approval)
- [ ] 1. Decide hours and days (default: 09:00-17:00 Asia/Jerusalem, Sun-Thu or Mon-Fri; 8 hours).
- [ ] 2. Write `modules/scheduler`, `enable_dev_schedule = false` by default. `terraform plan` shows only new resources.
- [ ] 3. Set `enable_dev_schedule = true` locally (tfvars + example), plan, review, apply.
- [ ] 4. Verify at the first scheduled stop and the next morning start (ECS 1/1, RDS available, ALB healthy, site 200).
- [ ] 5. Add a "start now" / "stop now" script for demos.
- [ ] 6. Watch the daily cost (target about $2.0-2.3/day on working days).

## Rollback
Set `enable_dev_schedule = false` and apply: removes the schedules. Then start the environment manually once (RDS start, then ECS desired 1 and autoscaling min/max 1/2).

---

# Phase 3: Fargate Spot for dating-dev (PLANNED, nothing applied)

Written: 2026-10-03. Account `907390934996`, `eu-central-1`. Branch `infra/dev-cost-reduction`.

## Existing (verified read-only)
- Both ECS services (`dating-dev-api`, `dating-dev-ui`) use `launch_type = "FARGATE"` (on-demand), `modules/ecs/main.tf` lines 243 and 287.
- The cluster already has both capacity providers registered: `FARGATE` and `FARGATE_SPOT` (`aws_ecs_cluster_capacity_providers`), default strategy FARGATE base 1 weight 1.
- Fargate cost today (api 0.5 vCPU/1 GB + ui 0.25 vCPU/0.5 GB): about $31/month.
- The one-off DB migration task (`.github/scripts/ecs-run-migrate.sh`) uses `--launch-type FARGATE`; it stays on-demand (it must not be interrupted).
- Provider: hashicorp/aws 5.100.0. Services have `ignore_changes = [task_definition, desired_count]`.

## Planned change
1. Add variable `use_fargate_spot` (bool) to `modules/ecs`, passed from `dev` as `ecs_use_fargate_spot` (default **false**, set `true` in local tfvars and the example, like the NAT settings).
2. In both services: when true, drop `launch_type` and use
   `capacity_provider_strategy { capacity_provider = "FARGATE_SPOT" weight = 1 }`; when false, keep `launch_type = "FARGATE"` (unchanged behaviour).
3. First check with `terraform plan` whether AWS/Terraform can switch the services **in place** (rolling redeploy) or wants to **replace** them. If the plan shows a replacement of the services, stop and discuss before applying (replacement means recreating the services and re-registering with the load balancer).

## Reason
Dev environment, no SLA. Spot capacity costs about 60-70% less than on-demand Fargate for the same task size.

## Expected result

| | $/month |
|---|---|
| Fargate on-demand (api + ui) | ~31 |
| Fargate Spot (api + ui) | ~10-12 |
| **Saving** | **~18-21** |

Dating-dev after this: about $111 to about $91 (24/7). If the parked 13-hour schedule is added later, the two savings overlap: Fargate would be about $6, so the schedule would then save only about $20 instead of $29.

## Risks
- **Interruption**: AWS can reclaim Spot capacity with a 2-minute warning (SIGTERM). ECS then starts a replacement task, which takes about 1-2 minutes. Dev users see a short outage; rare in practice.
- **No Spot capacity available**: new tasks can stay pending until capacity returns. There is no automatic fallback to on-demand with a single capacity provider. Rollback is one setting.
- **Deploys**: unchanged (rolling, min healthy 50% / max 200%).
- **Not for production**: Going2Eat stays on on-demand Fargate.

## To-do (each step needs explicit approval)
- [ ] 1. Approve this plan.
- [ ] 2. Write the variable and service changes (default off), `terraform validate`.
- [ ] 3. Set `ecs_use_fargate_spot = true` locally, `terraform plan`: expect the two services updated in place only (or STOP if it says replace).
- [ ] 4. Show the plan, get approval, apply targeted to the two services from a saved plan file.
- [ ] 5. Verify: both services running 1/1 on `FARGATE_SPOT`, ALB targets healthy, https://findyouraidate.com 200, no errors in `/ecs/dating-dev/*` logs.
- [ ] 6. Commit and push to the branch; update this document with the result.
- [ ] 7. Next day: check the Fargate line on the bill (about $1.0/day to about $0.35/day).

## Rollback
Set `ecs_use_fargate_spot = false`, `terraform plan`, apply: services return to on-demand `FARGATE` through a rolling redeploy.

## Phase 3 result of step 3 (2026-10-03): STOPPED, nothing applied
Code written locally (`use_fargate_spot` / `ecs_use_fargate_spot`, default false; set true in local tfvars + example). `terraform validate` OK.
`terraform plan` (targeted to the two services): **both services "must be replaced"** (`capacity_provider_strategy` forces replacement; `launch_type` goes from FARGATE to unset). Plan: 2 to add, 2 to destroy.
Why this matters: a replaced service would start from the task definition Terraform tracks (not the revisions the pipeline deployed: api :15, ui :11), so it could briefly run an older image until a repoint. Short downtime in dev while the new services register with the load balancer.
Decision pending (see options in chat): A) accept replacement + immediately repoint to :15/:11, B) change the capacity provider with the ECS API in place and tell Terraform to ignore it, C) skip Spot for the services.

## Phase 3 DONE 2026-10-03: dating-dev on Fargate Spot (option A, approved)
- Applied (targeted): `aws_ecs_service.api` and `.ui` replaced (2 added, 2 destroyed; about 3.5 minutes of downtime while the old services drained).
- Immediately repointed with `update-service` to the deployed revisions: api `dating-dev-api:15`, ui `dating-dev-ui:11` (same as before).
- Side effect: deleting the api service removed its Application Auto Scaling target and CPU policy. Restored with a second targeted apply (min 1 / max 2, policy `dating-dev-api-cpu`).
- Verified: both services running 1/1, `FARGATE_SPOT`, rollout COMPLETED; tasks RUNNING (api HEALTHY); ALB targets healthy; https://findyouraidate.com -> 200; 0 ERROR/ETIMEDOUT/ECONNREFUSED in `/ecs/dating-dev/*` logs in the 10 minutes after; full `terraform plan` = **No changes**.
- Expected saving: about $18-21/month (check the Fargate line on the bill from tomorrow: about $1.0/day to about $0.35/day).
- Rollback: set `ecs_use_fargate_spot = false`, plan, apply (services are replaced again), then repoint to :15/:11.

## Will normal deploys undo these changes? (checked in code, 2026-10-03)
| Deploy | Effect on our changes |
|---|---|
| Dating CI (`deploy-dev.yml`) api/ui | `ecs-register-image.sh` clones the live task definition and only changes the image; `ecs-update-service.sh` only sets the task definition + force-new-deployment. Network (public subnets, public IP), Spot and sizes are NOT touched. Safe. |
| Dating CI migration step (`ecs-run-migrate.sh`) | **Not an issue today (corrected 2026-10-03).** The GitHub "Deploy dev" pipeline has failed on every run since at least 2026-09-25 (UI CI TypeScript errors, before the migrate step) and has no successful run, so it is not the real deploy path. The real path is the `dating-push` skill, which copies `networkConfiguration` from the live service (now public subnets + public IP), so the migrate task works without a NAT. **If the GitHub pipeline is fixed later**, its migrate step reads GitHub variables `ECS_SUBNET_IDS` and `ECS_ASSIGN_PUBLIC_IP` (default `DISABLED`): set them to the public subnets `subnet-08702ce87ad2a209c,subnet-0b93dbcd01f2e6cce` and `ENABLED`. Variable values could not be read; nothing was changed in GitHub. |
| `terraform apply` from `main` or another machine | Would bring the NAT back and revert tasks to private subnets, because the settings are in the gitignored `terraform.tfvars`. Merge branch `infra/dev-cost-reduction`; the example file has the values. |
| Going2Eat deploy (`going2eat-deploy`) | Copies the live task definition, so 0.5 vCPU / 1 GB (rev 39) carries forward. Safe. |


---

# Phase 4: dating RDS db.t4g.small -> db.t4g.micro (PLANNED, nothing applied)

Written: 2026-10-03. Account `907390934996`, `eu-central-1`. Instance `dating-dev-postgres`.

## Existing (verified read-only)
- `db.t4g.small` (2 vCPU, 2 GB RAM), PostgreSQL 16.13, 20 GB gp3, single-AZ, backups 7 days, maintenance window Sun 06:00-07:00 (UTC), deletion protection off.
- Class is set by `rds_instance_class` in the local `terraform.tfvars` (and the default in `dev/variables.tf`).
- Parameter group `dating-dev-pg16-...` has **no custom parameters** (all defaults), so Postgres memory settings scale with the instance size automatically.
- Cost: about $27/month for the instance (about $0.036/hour).

## Measured over the last 14 days
| Metric | Value |
|---|---|
| Freeable memory | minimum 1,025 MB, average 1,057 MB (of 2 GB, so about 1 GB in use) |
| Swap | max 1 MB |
| Connections | max 5 |
| CPU | max 32% |
| IOPS | read max 14, write max 51 |
| CPU credits | balance full (576) since Sep 21; usage about 110 credits/day; **no surplus credits charged** |

## Planned change
`rds_instance_class = "db.t4g.micro"` (1 GB RAM, same 2 vCPU, baseline 10% CPU, credit cap 288, earns 288/day).
Credits: usage 110/day is well under 288/day, so no throttling expected. Memory: Postgres sizes `shared_buffers` to 25% of RAM, so about 256 MB on micro; current total use of about 1 GB should shrink to roughly 600-700 MB, leaving roughly 300 MB free. Tight but workable for 5 connections.

## Reason / expected saving
Instance cost halves: about $27 -> about $13.5/month. **Saving about $13/month.** If the schedule (13 h/day) is added later, the saving would overlap (about $7).

## Risks
- **Downtime about 5-10 minutes** while the instance class is modified (single-AZ). The api will return errors during that time and reconnect afterwards.
- **Memory too tight** under heavier use (migrations, many connections, `prisma migrate deploy`): possible out-of-memory restart or slow queries. Mitigation: watch `FreeableMemory`; rollback = set `db.t4g.small` again (another 5-10 minutes of downtime).
- A snapshot is taken first (manual, cheap: 20 GB) so data is safe either way.

## To-do (each step needs explicit approval)
- [ ] 1. Approve this plan (and pick a time: now or during the Sunday maintenance window).
- [ ] 2. Take a manual snapshot `dating-dev-before-micro-20261003`.
- [ ] 3. Set `rds_instance_class = "db.t4g.micro"` in local tfvars; `terraform plan`: expect only the instance modified in place.
- [ ] 4. Show the plan, get approval, apply targeted to the RDS instance from a saved plan (check `apply_immediately`).
- [ ] 5. Verify: instance available, api healthy, site 200, no DB errors in `/ecs/dating-dev/dating-api`, FreeableMemory stays above about 150 MB over the next days.
- [ ] 6. Update this document; commit.

## Rollback
Set `rds_instance_class = "db.t4g.small"`, plan, apply (5-10 minutes downtime). The manual snapshot is the data safety net.

---

# Phase 4 timing update (2026-10-03)
Approved by the user. To be executed in the night window **23:00-08:00 Israel time** (not during the day), after the manual snapshot. Phase 4 must be finished BEFORE the Phase 5 schedule is turned on (both touch the RDS instance).

---

# Phase 5: nightly shutdown of dating-dev, 23:00 to 08:00 Israel time (PLANNED, nothing applied)

Written: 2026-10-03. Account `907390934996`, `eu-central-1`. Companion plan for Going2Eat: `angular-piza/docs/infra/COST_REDUCTION_GOING2EAT.md` (Step 2). Replaces the earlier parked 08:00-21:00 idea with a longer "on" window (15 hours on, 9 hours off).

## Existing (verified read-only)
- Everything runs 24/7: ECS api + ui on Fargate Spot, RDS `dating-dev-postgres`, ALB, Redis, 2 task public IPs.
- API has an Application Auto Scaling target (`service/dating-dev-cluster/dating-dev-api`, min 1 / max 2, CPU policy). The UI has none.
- Only autoscaling's own CloudWatch alarms exist. No EventBridge rules or Route 53 health checks.
- The installed AWS CLI (2.6.3) has no `scheduler` command, so the RDS schedule must be created through Terraform.
- Services have `ignore_changes = [task_definition, desired_count]` in Terraform.

## Planned design
Times in `Asia/Jerusalem` (daylight saving handled by the service).

| Time | Action | How |
|---|---|---|
| 07:45 | Start RDS | EventBridge Scheduler -> `rds:startDBInstance` |
| 08:00 | api min/max 1/2, ui min/max 1/1 | Application Auto Scaling scheduled action |
| 23:00 | api min/max 0/0, ui min/max 0/0 | Application Auto Scaling scheduled action |
| 23:15 | Stop RDS | EventBridge Scheduler -> `rds:stopDBInstance` |

Terraform: new `modules/scheduler`, switch `enable_night_schedule` (default false, set in local tfvars + example like the other cost settings). New resources: `aws_appautoscaling_target.ui` (min 1 / max 1), 4 `aws_appautoscaling_scheduled_action`, 2 `aws_scheduler_schedule`, one IAM role limited to start/stop this DB. Why autoscaling and not desired count: the api target has min 1, so a plain "desired 0" would be reversed by autoscaling.

## Cost (pre-tax, per month; dating-dev after Phases 1-4 = about $78 running 24/7)
| Item | 24/7 | 23:00-08:00 off |
|---|---|---|
| Fargate Spot api + ui | 10.5 | 6.6 |
| RDS micro (instance) | 13.5 | 8.7 (on 15.5 h/day) |
| RDS storage | 2.7 | 2.7 |
| Task public IPv4 | 7.3 | 4.6 |
| ALB + ALB IPv4 | 26.8 | 26.8 |
| Redis | 12.9 | 12.9 |
| Secrets | 3.9 | 3.9 |
| **Total** | **~78** | **~66** |
| **Saving** | | **~11-12** |

The ALB, Redis, their IPs and secrets (about $44) cannot be switched off.

## Risks
- **Nobody can use dating-dev 23:00-08:00** (load balancer answers 503). A one-command "start now" is part of the plan for demos at night.
- **Cold start at 08:00**: RDS 07:45 (about 5-10 min), tasks about 1-2 min. Site is up by about 08:05.
- **Deploys at night** via `dating-push`: the rolling update waits for stable; with 0 tasks it finishes immediately and the new image only starts in the morning.
- **RDS 7-day auto-start**: a daily stop/start cycle means it never triggers.
- **Holidays**: if the schedule is off for weeks while RDS is stopped, AWS restarts it after 7 days; disable the schedule on purpose or leave it on.
- **Phase 4 first**: do not enable this schedule while the RDS class change is pending.

## To-do (each step needs explicit approval)
- [ ] 1. Approve this plan (hours 23:00-08:00, Asia/Jerusalem; 7 days a week unless told otherwise).
- [ ] 2. Phase 4 done (RDS micro) and verified.
- [ ] 3. Write `modules/scheduler` (default off), `terraform validate`.
- [ ] 4. Set `enable_night_schedule = true` locally; `terraform plan`: expect only new resources (ui scalable target, 4 scheduled actions, 2 schedules, IAM role).
- [ ] 5. Show the plan, get approval, apply from a saved plan file.
- [ ] 6. Verify at the first 23:00 stop and the next 08:00 start: ECS 0/0 then 1/1, RDS stopped then available, site 200 by 08:10.
- [ ] 7. Add `start-now` / `stop-now` helper commands; update this document and commit.
- [ ] 8. Next day: check cost (target dating about $2.2/day).

## Rollback
Set `enable_night_schedule = false`, plan, apply: removes the schedules and the ui target. Then start the environment once by hand (RDS start; api min/max 1/2).

## Status update 2026-10-04 09:11
- Phase 4 DONE: RDS is db.t4g.micro (snapshot dating-dev-before-micro-20261004 kept for rollback). Verified: API/UI 1/1, site 200, no DB errors. Local tfvars rds_apply_immediately set back to false.
- Phase 5 DONE: enable_night_schedule=true applied (9 resources). ECS off 23:00, on 08:00; RDS stop 23:15, start 07:45 (Asia/Jerusalem). Rollback: set enable_night_schedule=false and apply.

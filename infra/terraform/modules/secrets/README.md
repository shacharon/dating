# Secrets & runtime config module (Sprint 20 Story 03)

Self-contained Terraform module that owns the **env contract** for AWS `dev`:

- **Secrets Manager** — sensitive values (`DATABASE_URL`, `OPENAI_API_KEY`, peppers, API keys, DSNs)
- **SSM Parameter Store (String)** — non-secret config with cloud-correct defaults
- **IAM policy** — least-privilege read for the ECS **execution** role
- **ECS task mapping outputs** — ready for Story 02 / 04 task definitions

This module does **not** create VPC/ECS/ALB. Story 02 wires it into the root stack via `infra/terraform/dev/secrets.tf`.

## Story 02 wiring

Root files (Story 03):

- `dev/secrets.tf` — `module "secrets"` + IAM attachment + CDN private-key version
- `dev/secrets_variables.tf` — non-secret inputs
- `dev/secrets_outputs.tf` — ARNs / mappings for operators & Story 04

In `dev/main.tf` `module "ecs"` (avoid duplicate keys with ECS plain `environment`):

```hcl
api_secrets = length(var.api_secrets) > 0 ? var.api_secrets : module.secrets.ecs_secrets_from_secretsmanager_only

api_extra_environment = merge(
  {
    GOOGLE_CLIENT_ID    = var.google_client_id
    SESSION_COOKIE_NAME = "dating_session"
    # … see main.tf / DEV_CONFIG_MANIFEST.md
  },
  var.cookie_domain != "" ? { COOKIE_DOMAIN = var.cookie_domain } : {},
)

# Attach execution-role policy (also in secrets.tf):
# aws_iam_role_policy_attachment.ecs_execution_secrets
```

Do **not** pass `module.secrets.ecs_api_secrets` into the Story 02 ECS module — that list includes SSM keys that the ECS module already sets as `environment` (`NODE_ENV`, `PORT`, `PHOTO_*`, …), which AWS rejects as duplicates.

### `DATABASE_URL`

Prefer the Story 02 RDS secret JSON key `database_url`:

```text
valueFrom = "${module.rds.secrets_manager_secret_arn}:database_url::"
```

Pass that ARN as `database_url_secret_arn` (already done in `dev/secrets.tf`).

## Operator-supplied secrets (never commit)

Terraform creates secret **shells**. Set values out of band (preferred) or via sensitive `TF_VAR_*` at apply time:

```bash
aws secretsmanager put-secret-value \
  --secret-id <ARN from terraform output> \
  --secret-string 'sk-...'

# PHOTO_CDN_PRIVATE_KEY: keep \n escapes as a single line
# (dev/secrets.tf auto-writes this from CloudFront signing key when enable_cloudfront=true)
aws secretsmanager put-secret-value \
  --secret-id <ARN> \
  --secret-string '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----'
```

Auto-generated (in Secrets Manager, not git): `SESSION_SECRET_PEPPER`, `EMAIL_UNSUBSCRIBE_SECRET`.

**Before first API task start:** put `OPENAI_API_KEY` (boot blocker). Empty secret versions cause ECS task failures.

## Intentionally unset in cloud

| Var | Why |
|-----|-----|
| `PHOTO_MODERATION_AUTO_APPROVE` | Dev-only escape hatch; skips ML |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Use ECS task role instead |

## Rotation = redeploy

Changing a secret or SSM value does **not** hot-reload the running task. After `put-secret-value` / SSM update:

1. Force a new ECS deployment (`update-service --force-new-deployment`), **or**
2. Re-apply Terraform if the task def hash must change.

`NEXT_PUBLIC_*` changes require a **UI image rebuild** (Story 04), not only a task restart.

## Docs

- Manifest: [`../../../env/DEV_CONFIG_MANIFEST.md`](../../../env/DEV_CONFIG_MANIFEST.md)
- Non-secret defaults: [`../../../env/dev.tfvars.example`](../../../env/dev.tfvars.example)
- Runbook: [`../../../../DEPLOY_AWS_DEV.md`](../../../../DEPLOY_AWS_DEV.md) §6

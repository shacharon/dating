# github_oidc — GitHub Actions deploy role (OIDC)

Sprint 20 Story 04. Provides an IAM role assumable via **GitHub OIDC** (no static AWS keys) with ECR push + ECS deploy/migrate permissions.

## Usage

See [`dating-api/docs/sprints/sprint-20-aws-dev-deployment/CI_CD.md`](../../../../dating-api/docs/sprints/sprint-20-aws-dev-deployment/CI_CD.md).

Set GitHub Environment `dev` variable `AWS_ROLE_ARN` to `module.github_oidc.role_arn`.

## Thumbprints

`aws_iam_openid_connect_provider` uses GitHub’s published CA thumbprints. If AWS rejects them after a CA rotation, update `thumbprint_list` or reuse an existing account-level provider (`create_oidc_provider = false` + `existing_oidc_provider_arn`).

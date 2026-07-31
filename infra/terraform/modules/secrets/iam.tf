# Least-privilege read policy for the ECS task *execution* role.
# Attach via Story 02 IAM module: aws_iam_role_policy / aws_iam_role_policy_attachment
# using output `execution_role_secrets_policy_json` or `execution_role_secrets_policy_document`.

data "aws_iam_policy_document" "ecs_execution_secrets_read" {
  statement {
    sid    = "SsmGetApiConfig"
    effect = "Allow"
    actions = [
      "ssm:GetParameters",
      "ssm:GetParameter",
      "ssm:GetParametersByPath",
    ]
    resources = local.ssm_parameter_arns
  }

  statement {
    sid    = "SecretsManagerGetApiSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = local.secretsmanager_arns
  }

  # KMS decrypt only if secrets use a CMK later; default AWS-managed key needs no extra grant.
  # Story 02 may extend this if a customer-managed key is introduced.
}

resource "aws_iam_policy" "ecs_execution_secrets_read" {
  name_prefix = "${var.name_prefix}-ecs-exec-secrets-"
  description = "ECS execution role: read dating ${var.environment} SSM params + Secrets Manager secrets"
  policy      = data.aws_iam_policy_document.ecs_execution_secrets_read.json

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ecs-exec-secrets"
  })
}

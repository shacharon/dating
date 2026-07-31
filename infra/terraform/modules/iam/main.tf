data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    sid     = "ECSTasksAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ---------------------------------------------------------------------------
# Task role — app runtime (S3 photos + Rekognition)
# ---------------------------------------------------------------------------

resource "aws_iam_role" "task" {
  name_prefix        = "${var.name_prefix}-task-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  description        = "ECS task role for dating-api (S3 + Rekognition)"

  tags = var.tags
}

data "aws_iam_policy_document" "task" {
  statement {
    sid    = "S3Photos"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.photo_bucket_arn}/*"]
  }

  statement {
    sid       = "S3ListBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [var.photo_bucket_arn]
  }

  statement {
    sid    = "Rekognition"
    effect = "Allow"
    actions = [
      "rekognition:DetectModerationLabels",
      "rekognition:DetectFaces",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task" {
  name_prefix = "${var.name_prefix}-task-"
  role        = aws_iam_role.task.id
  policy      = data.aws_iam_policy_document.task.json
}

# ---------------------------------------------------------------------------
# Execution role — ECR pull + secrets/SSM + CloudWatch logs
# ---------------------------------------------------------------------------

resource "aws_iam_role" "execution" {
  name_prefix        = "${var.name_prefix}-exec-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  description        = "ECS execution role for dating (ECR + secrets + logs)"

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid    = "ReadSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "ssm:GetParameters",
      "ssm:GetParameter",
      "ssm:GetParametersByPath",
    ]
    resources = length(var.secrets_arns) > 0 ? var.secrets_arns : [
      "arn:aws:secretsmanager:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:secret:${var.name_prefix}-*",
      "arn:aws:ssm:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:parameter/${var.ssm_parameter_path_prefix}/*",
    ]
  }

  statement {
    sid       = "DecryptKms"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values = [
        "secretsmanager.${data.aws_region.current.id}.amazonaws.com",
        "ssm.${data.aws_region.current.id}.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name_prefix = "${var.name_prefix}-exec-secrets-"
  role        = aws_iam_role.execution.id
  policy      = data.aws_iam_policy_document.execution_secrets.json
}

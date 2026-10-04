# Nightly shutdown of the dev environment (cost saving). See docs/infra/COST_REDUCTION_DEV.md, Phase 5.
#
#   RDS   start 07:45 / stop 23:15   -> EventBridge Scheduler (aws-sdk:rds)
#   ECS   on    08:00  / off  23:00   -> Application Auto Scaling scheduled actions (min/max capacity)
#
# ECS is scaled through min/max capacity, not desired count, because the api service has an autoscaling target
# (min 1) that would otherwise undo "desired 0".

data "aws_caller_identity" "current" {}

locals {
  cluster_resource = "service/${var.cluster_name}"
  api_resource_id  = "${local.cluster_resource}/${var.api_service_name}"
  ui_resource_id   = "${local.cluster_resource}/${var.ui_service_name}"
  db_arn           = "arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:db:${var.db_instance_id}"
}

# ---------------------------------------------------------------------------
# ECS: the ui service has no autoscaling target yet (api already has one in the ecs module)
# ---------------------------------------------------------------------------

resource "aws_appautoscaling_target" "ui" {
  service_namespace  = "ecs"
  scalable_dimension = "ecs:service:DesiredCount"
  resource_id        = local.ui_resource_id
  min_capacity       = var.ui_on_min
  max_capacity       = var.ui_on_max

  # The scheduled actions change min/max every day; Terraform must not revert them.
  lifecycle {
    ignore_changes = [min_capacity, max_capacity]
  }
}

resource "aws_appautoscaling_scheduled_action" "api_off" {
  name               = "${var.name_prefix}-api-night-off"
  service_namespace  = "ecs"
  scalable_dimension = "ecs:service:DesiredCount"
  resource_id        = local.api_resource_id
  schedule           = var.ecs_off_cron
  timezone           = var.timezone

  scalable_target_action {
    min_capacity = 0
    max_capacity = 0
  }
}

resource "aws_appautoscaling_scheduled_action" "api_on" {
  name               = "${var.name_prefix}-api-morning-on"
  service_namespace  = "ecs"
  scalable_dimension = "ecs:service:DesiredCount"
  resource_id        = local.api_resource_id
  schedule           = var.ecs_on_cron
  timezone           = var.timezone

  scalable_target_action {
    min_capacity = var.api_on_min
    max_capacity = var.api_on_max
  }
}

resource "aws_appautoscaling_scheduled_action" "ui_off" {
  name               = "${var.name_prefix}-ui-night-off"
  service_namespace  = aws_appautoscaling_target.ui.service_namespace
  scalable_dimension = aws_appautoscaling_target.ui.scalable_dimension
  resource_id        = aws_appautoscaling_target.ui.resource_id
  schedule           = var.ecs_off_cron
  timezone           = var.timezone

  scalable_target_action {
    min_capacity = 0
    max_capacity = 0
  }
}

resource "aws_appautoscaling_scheduled_action" "ui_on" {
  name               = "${var.name_prefix}-ui-morning-on"
  service_namespace  = aws_appautoscaling_target.ui.service_namespace
  scalable_dimension = aws_appautoscaling_target.ui.scalable_dimension
  resource_id        = aws_appautoscaling_target.ui.resource_id
  schedule           = var.ecs_on_cron
  timezone           = var.timezone

  scalable_target_action {
    min_capacity = var.ui_on_min
    max_capacity = var.ui_on_max
  }
}

# ---------------------------------------------------------------------------
# RDS: EventBridge Scheduler calls the RDS API directly (no Lambda)
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  name               = "${var.name_prefix}-night-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "scheduler_rds" {
  statement {
    actions   = ["rds:StartDBInstance", "rds:StopDBInstance"]
    resources = [local.db_arn]
  }
}

resource "aws_iam_role_policy" "scheduler_rds" {
  name   = "${var.name_prefix}-night-scheduler-rds"
  role   = aws_iam_role.scheduler.id
  policy = data.aws_iam_policy_document.scheduler_rds.json
}

resource "aws_scheduler_schedule" "rds_stop" {
  name                         = "${var.name_prefix}-rds-night-stop"
  schedule_expression          = var.rds_stop_cron
  schedule_expression_timezone = var.timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ DbInstanceIdentifier = var.db_instance_id })
  }
}

resource "aws_scheduler_schedule" "rds_start" {
  name                         = "${var.name_prefix}-rds-morning-start"
  schedule_expression          = var.rds_start_cron
  schedule_expression_timezone = var.timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ DbInstanceIdentifier = var.db_instance_id })
  }
}

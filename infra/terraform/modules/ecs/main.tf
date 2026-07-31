resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.name_prefix}/dating-api"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "ui" {
  name              = "/ecs/${var.name_prefix}/dating-ui"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cluster"
  })
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name = aws_ecs_cluster.this.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ---------------------------------------------------------------------------
# Service discovery (optional internal DNS for UI → API SSR proxy)
# ---------------------------------------------------------------------------

resource "aws_service_discovery_private_dns_namespace" "this" {
  count = var.enable_service_discovery ? 1 : 0

  name        = var.service_discovery_namespace
  description = "Internal DNS for ${var.name_prefix}"
  vpc         = var.vpc_id

  tags = var.tags
}

resource "aws_service_discovery_service" "api" {
  count = var.enable_service_discovery ? 1 : 0

  name = "dating-api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this[0].id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# API task definition
# ---------------------------------------------------------------------------

locals {
  api_image = "${var.api_repository_url}:${var.api_image_tag}"
  ui_image  = "${var.ui_repository_url}:${var.ui_image_tag}"

  # Non-secret env; secrets injected via SSM/Secrets Manager placeholders (Story 03 fills real values)
  api_environment = concat(
    [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.api_port) },
      { name = "STRUCTURED_LOG_FILE", value = "0" },
      { name = "PHOTO_STORAGE_DRIVER", value = "s3" },
      { name = "PHOTO_S3_BUCKET", value = var.photo_bucket_name },
      { name = "PHOTO_S3_REGION", value = var.aws_region },
      { name = "PHOTO_S3_PREFIX", value = var.photo_s3_prefix },
      { name = "PHOTO_MODERATION_DRIVER", value = "rekognition" },
      { name = "PHOTO_FACE_DETECTION_ENABLED", value = "1" },
      { name = "COOKIE_SECURE", value = "true" },
      { name = "CORS_CREDENTIALS", value = "true" },
    ],
    var.redis_url != "" ? [{ name = "REDIS_URL", value = var.redis_url }] : [],
    var.cors_origin != "" ? [{ name = "CORS_ORIGIN", value = var.cors_origin }] : [],
    var.photo_cdn_domain != "" ? [
      { name = "PHOTO_CDN_ENABLED", value = "1" },
      { name = "PHOTO_CDN_DOMAIN", value = var.photo_cdn_domain },
    ] : [],
    [for k, v in var.api_extra_environment : { name = k, value = v }]
  )

  ui_environment = concat(
    [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = tostring(var.ui_port) },
      { name = "NEXT_PUBLIC_REALTIME", value = "ws" },
    ],
    var.enable_service_discovery ? [
      {
        name  = "API_PROXY_TARGET"
        value = "http://dating-api.${var.service_discovery_namespace}:${var.api_port}"
      },
      {
        name  = "INTERNAL_API_URL"
        value = "http://dating-api.${var.service_discovery_namespace}:${var.api_port}"
      },
      ] : [
      # Fallback: same-origin via ALB public DNS (works; prefer service discovery)
      {
        name  = "API_PROXY_TARGET"
        value = "http://${var.alb_dns_name}"
      },
      {
        name  = "INTERNAL_API_URL"
        value = "http://${var.alb_dns_name}"
      },
    ],
    [for k, v in var.ui_extra_environment : { name = k, value = v }]
  )
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "dating-api"
      image     = local.api_image
      essential = true

      portMappings = [
        {
          containerPort = var.api_port
          hostPort      = var.api_port
          protocol      = "tcp"
        }
      ]

      environment = local.api_environment

      # Placeholders — Story 03 wires real SSM/Secrets Manager ARNs
      secrets = var.api_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://127.0.0.1:${var.api_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_task_definition" "ui" {
  family                   = "${var.name_prefix}-ui"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ui_cpu
  memory                   = var.ui_memory
  execution_role_arn       = var.execution_role_arn
  # UI does not need S3/Rekognition; reuse task role or leave null — reuse for simplicity
  task_role_arn = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "dating-ui"
      image     = local.ui_image
      essential = true

      portMappings = [
        {
          containerPort = var.ui_port
          hostPort      = var.ui_port
          protocol      = "tcp"
        }
      ]

      environment = local.ui_environment
      secrets     = var.ui_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ui.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ui"
        }
      }
    }
  ])

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

resource "aws_ecs_service" "api" {
  name            = "${var.name_prefix}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  platform_version = "LATEST"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.api_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.api_target_group_arn
    container_name   = "dating-api"
    container_port   = var.api_port
  }

  dynamic "service_registries" {
    for_each = var.enable_service_discovery ? [1] : []
    content {
      registry_arn = aws_service_discovery_service.api[0].arn
    }
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 120

  enable_execute_command = var.enable_execute_command

  # Don't fail apply when image isn't pushed yet — CI (Story 04) updates the service
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = var.tags

  depends_on = [aws_ecs_task_definition.api]
}

resource "aws_ecs_service" "ui" {
  name            = "${var.name_prefix}-ui"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.ui.arn
  desired_count   = var.ui_desired_count
  launch_type     = "FARGATE"

  platform_version = "LATEST"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ui_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.ui_target_group_arn
    container_name   = "dating-ui"
    container_port   = var.ui_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60

  enable_execute_command = var.enable_execute_command

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = var.tags

  depends_on = [aws_ecs_task_definition.ui]
}

# Autoscaling for API (min–max; Story wants 1–2)
resource "aws_appautoscaling_target" "api" {
  count = var.api_max_count > var.api_desired_count ? 1 : 0

  max_capacity       = var.api_max_count
  min_capacity       = var.api_min_count
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  count = var.api_max_count > var.api_desired_count ? 1 : 0

  name               = "${var.name_prefix}-api-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

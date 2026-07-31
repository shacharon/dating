output "task_role_arn" {
  description = "ECS task role ARN (S3 + Rekognition)"
  value       = aws_iam_role.task.arn
}

output "task_role_name" {
  description = "ECS task role name"
  value       = aws_iam_role.task.name
}

output "execution_role_arn" {
  description = "ECS execution role ARN (ECR + secrets)"
  value       = aws_iam_role.execution.arn
}

output "execution_role_name" {
  description = "ECS execution role name"
  value       = aws_iam_role.execution.name
}

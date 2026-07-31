# -----------------------------------------------------------------------------
# Remote state backend — OPTIONAL for first apply.
#
# Bootstrap once:
#   cd ../bootstrap && cp terraform.tfvars.example terraform.tfvars
#   # edit state_bucket_name to a globally unique value
#   terraform init && terraform apply
#
# Then uncomment the block below (fill bucket / table from bootstrap outputs)
# and migrate:
#   cd ../dev
#   terraform init -migrate-state
#
# terraform {
#   backend "s3" {
#     bucket         = "dating-tfstate-CHANGE-ME"
#     key            = "dating/dev/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "dating-terraform-locks"
#     encrypt        = true
#   }
# }
# -----------------------------------------------------------------------------

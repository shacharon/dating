# Bootstrap Terraform remote state (S3 + DynamoDB lock).
#
# First-time setup (local state is fine for this directory only):
#
#   cp terraform.tfvars.example terraform.tfvars   # edit bucket name
#   terraform init
#   terraform apply
#
# Then enable the backend in ../dev/backend.tf using the printed snippet.

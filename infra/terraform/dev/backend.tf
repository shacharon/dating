# Remote state — created by infra/terraform/bootstrap (phase 2 first upload).
# Do not apply the full dev stack in this file's bootstrap step.

terraform {
  backend "s3" {
    bucket         = "dating-tfstate-907390934996-euc1"
    key            = "dating/dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "dating-terraform-locks"
    encrypt        = true
  }
}

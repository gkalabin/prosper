// Production version of Prosper deployment on GCP.
// This module just calls the main module and forwards the variables and output.

provider "google" {
  region  = var.region
  project = var.project_id
}

module "gcp_continuous_deployment_prod" {
  source                   = "../module"
  project_id               = var.project_id
  region                   = var.region
  domain_name              = var.domain_name
  true_layer_client_id     = var.true_layer_client_id
  true_layer_client_secret = var.true_layer_client_secret
  nordigen_secret_id       = var.nordigen_secret_id
  nordigen_secret_key      = var.nordigen_secret_key
  cloudsource_repo_name    = var.cloudsource_repo_name
  db_deletion_protection   = true
}

// This module just uses gcp-continuous-deployment.
// Handy for testing where the state can be different from the prod.
module "gcp-continuous-deployment" {
  source                   = "../gcp-continuous-deployment"
  project_id               = var.project_id
  region                   = var.region
  domain_name              = var.domain_name
  true_layer_client_id     = var.true_layer_client_id
  true_layer_client_secret = var.true_layer_client_secret
  nordigen_secret_id       = var.nordigen_secret_id
  nordigen_secret_key      = var.nordigen_secret_key
  cloudsource_repo_name    = var.cloudsource_repo_name
}



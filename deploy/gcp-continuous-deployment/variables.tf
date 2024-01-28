variable "project_id" {
  description = "project id where to deploy"
  type        = string
}

variable "region" {
  description = "region where the service should run"
  type        = string
  default     = "europe-west1"
}

variable "domain_name" {
  description = "domain name to map to the service"
  type        = string
}

variable "true_layer_client_id" {
  type    = string
  default = null
}

variable "true_layer_client_secret" {
  type      = string
  sensitive = true
  default   = null
}

variable "nordigen_secret_id" {
  type    = string
  default = null
}

variable "nordigen_secret_key" {
  type      = string
  sensitive = true
  default   = null
}

variable "cloudsource_repo_name" {
  type    = string
  default = "github_gkalabin_prosper"
}

variable "deploy_branch" {
  description = "each push to this branch will trigger a new build and deployment to cloud run"
  type    = string
  default = "main"
}

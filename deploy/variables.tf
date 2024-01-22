variable "project_id" {
  description = "google cloud project id"
  type        = string
}

variable "region" {
  description = "which region to deploy to"
  type        = string
  default     = "europe-west2"
}

variable "build_region" {
  // Some projects are not allowed to run builds everywhere, but in a limited set of regions, so var.region might not work.
  // Use us-central1 to make sure the build runs no matter which project is being used.
  // See also: https://stackoverflow.com/questions/73472715/cloud-build-error-genericfailed-precondition-no-concurrent-builds-quota-available
  description = "which GCP region to use for building the container"
  type        = string
  default     = "us-central1"
}

variable "public_url" {
  description = "address where the app is accessible from, like https://example.com"
  type        = string
}

variable "true_layer_client_id" {
  type    = string
  default = ""
}

variable "true_layer_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "nordigen_secret_id" {
  type    = string
  default = ""
}

variable "nordigen_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_app_installation_id" {
  type    = number
  default = 0
}

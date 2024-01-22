variable "project_id" {
  description = "project id where to deploy"
  type        = string
}

variable "region" {
  description = "region where the service should run"
  type        = string
  default     = "europe-west2"
}

variable "public_url" {
  description = "external address where the app is accessible from, like https://example.com"
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

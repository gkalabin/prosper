variable "project_id" {
  description = "google cloud project id"
  type        = string
}

variable "region" {
  description = "which region to deploy to"
  type        = string
  default     = "europe-west2"
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

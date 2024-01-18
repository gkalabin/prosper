variable "project_id" {
  description = "project id, remember the project id has to be unique"
  type        = string
}

variable "region" {
  description = "which region to deploy to"
  type        = string
  default     = "europe-west2"
}

variable "public_url" {
  description = "address where the app is accessible from, like https://prosper.com"
  type        = string
}
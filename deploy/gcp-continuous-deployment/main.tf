terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.13.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.13.0"
    }
  }
}

provider "google" {
  region  = var.region
  project = var.project_id
}

locals {
  fe_docker_image       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}/fe:$COMMIT_SHA"
  service_account_email = "${data.google_project.prosper.number}-compute@developer.gserviceaccount.com"
}

data "google_project" "prosper" {}

resource "google_project_service" "project_services" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sourcerepo.googleapis.com",
    "sqladmin.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

// Set of resources to delay creation of the role binding
// because the service account creation is eventually consistent.
resource "null_resource" "before_service_account_creation" {
  depends_on = [
    google_service_account.builder,
    google_service_account.runner,
  ]
}

resource "null_resource" "delay_after_service_account_creation" {
  provisioner "local-exec" {
    command = "sleep 30"
  }
  triggers = {
    "before" = null_resource.before_service_account_creation.id
  }
}

resource "null_resource" "after_service_account_creation" {
  depends_on = [null_resource.delay_after_service_account_creation]
}

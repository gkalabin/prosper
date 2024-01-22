terraform {
  required_version = "~> 1.7.0"
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
  fe_docker_image       = "${var.region}-docker.pkg.dev/$PROJECT_ID/${google_artifact_registry_repository.prosper_artifact_repo.repository_id}/fe:$COMMIT_SHA"
  service_account_email = "${data.google_project.prosper.number}-compute@developer.gserviceaccount.com"
}

data "google_project" "prosper" {}

resource "google_project_service" "project_services" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  service = each.value
}

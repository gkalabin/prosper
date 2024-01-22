terraform {
  required_providers {
    google = {}
  }
}

provider "google" {
  region  = var.region
  project = var.project_id
}

locals {
  services = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  fe_docker_image = "${var.region}-docker.pkg.dev/$PROJECT_ID/${google_artifact_registry_repository.prosper_artifact_repo.repository_id}/fe:$COMMIT_SHA"
  service_account_email = "${data.google_project.prosper.number}-compute@developer.gserviceaccount.com"
}

data "google_project" "prosper" {}

resource "google_project_service" "project_services" {
  for_each = local.services
  service  = each.value
}

resource "random_password" "prosperdb_password" {
  length  = 19
  special = false
}

resource "random_password" "nextauth_secret" {
  length  = 42
  special = false
}

resource "google_sql_database_instance" "prosperdb" {
  name             = "prosperdb"
  database_version = "MYSQL_8_0"
  settings {
    tier = "db-f1-micro"
  }
  deletion_protection = "true"
}

resource "google_sql_user" "prosperdb_user" {
  name     = "prosper"
  instance = google_sql_database_instance.prosperdb.name
  password = random_password.prosperdb_password.result
}

resource "google_secret_manager_secret" "prosperdb_password" {
  secret_id = "prosperdb_password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "prosperdb_password" {
  secret      = google_secret_manager_secret.prosperdb_password.name
  secret_data = google_sql_user.prosperdb_user.password
}

resource "google_secret_manager_secret_iam_member" "prosperdb_password" {
  secret_id  = google_secret_manager_secret.prosperdb_password.id
  role       = "roles/secretmanager.secretAccessor"
  member     = "serviceAccount:${local.service_account_email}"
  depends_on = [google_secret_manager_secret.prosperdb_password]
}

resource "google_project_iam_member" "db_access_cloudsql" {
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${local.service_account_email}"
  project = var.project_id
}

resource "google_project_iam_member" "cloud_run_access" {
  role    = "roles/run.admin"
  member  = "serviceAccount:${data.google_project.prosper.number}@cloudbuild.gserviceaccount.com"
  project = var.project_id
}

resource "google_artifact_registry_repository" "prosper_artifact_repo" {
  provider      = google-beta
  repository_id = "prosper"
  location      = var.region
  project       = var.project_id
  format        = "DOCKER"
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "delete-older-than-1-year"
    action = "DELETE"
    condition {
      older_than = "31536000s" // 1 year
    }
  }
}

resource "google_cloudbuild_trigger" "github_push_main" {
  name     = "build-on-push-to-github-main"
  location = "global"
  trigger_template {
    branch_name = "main"
    repo_name   = "github_gkalabin_prosper"
  }
  build {
    images = [local.fe_docker_image]
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", local.fe_docker_image, "-f", "Dockerfile", "."]
    }
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", local.fe_docker_image]
    }
    step {
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args       = ["run", "deploy", "prosper", "--image", local.fe_docker_image, "--region", var.region]
    }
  }
}

resource "google_cloud_run_v2_service" "prosper" {
  name     = "prosper"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  template {
    service_account = local.service_account_email
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.prosperdb.connection_name]
      }
    }
    scaling {
      max_instance_count = 1
    }
    containers {
      name  = "prosper"
      image = "docker.io/gkalabin/prosper:latest"
      env {
        name  = "DB_SOCKET_PATH"
        value = "/cloudsql/${data.google_project.prosper.project_id}:${var.region}:${google_sql_database_instance.prosperdb.name}"
      }
      env {
        name  = "DB_PORT"
        value = "3306"
      }
      env {
        name  = "DB_USER"
        value = google_sql_user.prosperdb_user.name
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.prosperdb_password.secret_id
            version = google_secret_manager_secret_version.prosperdb_password.version
          }
        }
      }
      env {
        name  = "DB_NAME"
        value = "prosperdb"
      }
      env {
        name  = "PUBLIC_APP_URL"
        value = var.public_url
      }
      env {
        name  = "NEXTAUTH_URL"
        value = var.public_url
      }
      env {
        name  = "NEXTAUTH_SECRET"
        value = random_password.nextauth_secret.result
      }
      env {
        name  = "TRUE_LAYER_CLIENT_ID"
        value = var.true_layer_client_id
      }
      env {
        name  = "TRUE_LAYER_CLIENT_SECRET"
        value = var.true_layer_client_secret
      }
      env {
        name  = "NORDIGEN_SECRET_ID"
        value = var.nordigen_secret_id
      }
      env {
        name  = "NORDIGEN_SECRET_KEY"
        value = var.nordigen_secret_key
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }
  depends_on = [google_secret_manager_secret_version.prosperdb_password]
}

data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers"
    ]
  }
}

resource "google_cloud_run_v2_service_iam_policy" "cloudrun_noauth" {
  project     = google_cloud_run_v2_service.prosper.project
  location    = google_cloud_run_v2_service.prosper.location
  name        = google_cloud_run_v2_service.prosper.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

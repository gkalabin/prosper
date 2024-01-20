provider "google" {
  region  = var.region
  project = var.project_id
}

locals {
  services = toset(["run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com"
  ])
}

data "google_project" "prosper" {}

resource "google_project_service" "project_services" {
  for_each                   = local.services
  service                    = each.value
  disable_on_destroy         = true
  disable_dependent_services = true
}

resource "random_password" "prosperdb_password" {
  min_lower   = 1
  min_numeric = 1
  min_upper   = 1
  length      = 19
  special     = true
  min_special = 1
  lifecycle {
    ignore_changes = [
      min_lower, min_upper, min_numeric, special, min_special, length
    ]
  }
}


resource "random_password" "nextauth_secret" {
  min_lower   = 1
  min_numeric = 1
  min_upper   = 1
  length      = 42
  special     = false
  lifecycle {
    ignore_changes = [
      min_lower, min_upper, min_numeric, special, length
    ]
  }
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
  member     = "serviceAccount:${data.google_project.prosper.number}-compute@developer.gserviceaccount.com"
  depends_on = [google_secret_manager_secret.prosperdb_password]
}

resource "google_cloud_run_v2_service" "prosper" {
  name     = "prosper"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.prosperdb.connection_name]
      }
    }

    containers {
      name  = "prosper"
      image = "docker.io/gkalabin/prosper:latest"
      env {
        name  = "DB_HOST"
        value = "/cloudsql/${data.google_project.prosper.project_id}:${var.region}:${google_sql_database_instance.prosperdb.name}"
      }
      env {
        name  = "DB_PORT"
        value = "3306"
      }
      env {
        name  = "DB_USER"
        value = "prosper"
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

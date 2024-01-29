resource "random_password" "nextauth_secret" {
  length  = 42
  special = false
}

resource "google_service_account" "runner" {
  account_id   = "runner"
  display_name = "Account to run the main prosper app"
}

resource "google_secret_manager_secret_iam_member" "runner_secrets_access" {
  secret_id = google_secret_manager_secret.prosperdb_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runner.email}"
  depends_on = [
    google_project_service.project_services["iam.googleapis.com"],
    google_project_service.project_services["run.googleapis.com"],
    google_project_service.project_services["secretmanager.googleapis.com"],
    google_secret_manager_secret.prosperdb_password,
    null_resource.after_service_account_creation
  ]
}

resource "google_project_iam_member" "runner_db_access" {
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runner.email}"
  project = var.project_id
  depends_on = [
    google_project_service.project_services["compute.googleapis.com"],
    google_project_service.project_services["iam.googleapis.com"],
    google_project_service.project_services["run.googleapis.com"],
    null_resource.after_service_account_creation
  ]
}

resource "google_cloud_run_v2_service" "prosper" {
  name     = "prosper"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  template {
    service_account = google_service_account.runner.email
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
      name    = "prosper"
      image   = "docker.io/gkalabin/prosper:latest"
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
        value = "https://${var.domain_name}"
      }
      env {
        name  = "NEXTAUTH_URL"
        value = "https://${var.domain_name}"
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
  depends_on = [
    google_project_service.project_services,
    google_secret_manager_secret_version.prosperdb_password,
  ]
}

data "google_iam_policy" "noauth" {
  binding {
    role    = "roles/run.invoker"
    members = ["allUsers"]
  }
}

resource "google_cloud_run_v2_service_iam_policy" "cloudrun_noauth" {
  project     = google_cloud_run_v2_service.prosper.project
  location    = google_cloud_run_v2_service.prosper.location
  name        = google_cloud_run_v2_service.prosper.name
  policy_data = data.google_iam_policy.noauth.policy_data
  depends_on  = [google_cloud_run_v2_service.prosper]
}

resource "google_cloud_run_domain_mapping" "main" {
  location = var.region
  name     = var.domain_name
  metadata {
    namespace = data.google_project.prosper.project_id
  }
  spec {
    route_name = google_cloud_run_v2_service.prosper.name
  }
}

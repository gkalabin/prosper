locals {
  image_base      = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}"
  image_app       = "${local.image_base}/app:$COMMIT_SHA"
  image_migration = "${local.image_base}/dbmigration:$COMMIT_SHA"
}

resource "google_service_account" "builder" {
  account_id   = "builder"
  display_name = "Account to build the prosper app and start the newly built container"
}

resource "google_project_iam_custom_role" "build" {
  title       = "Prosper Build"
  description = "Role which has the minimal set of permissions required for the build role."
  permissions = [
    "artifactregistry.repositories.downloadArtifacts",
    "artifactregistry.repositories.uploadArtifacts",
    // Required for writing build logs.
    "logging.logEntries.create",
    "logging.logEntries.route",
    // Required for starting cloud run job.
    "iam.serviceAccounts.actAs",
    "run.services.get",
    "run.services.update",
    "run.operations.get",
    // Running migrations during build requires CloudSQL access.
    "cloudsql.instances.connect",
    "cloudsql.instances.get",
  ]
  role_id = "prosper.build"
}

resource "google_project_iam_binding" "bind_build_permissions" {
  project    = google_project_iam_custom_role.build.project
  role       = "projects/${google_project_iam_custom_role.build.project}/roles/${google_project_iam_custom_role.build.role_id}"
  members    = ["serviceAccount:${google_service_account.builder.email}"]
  depends_on = [null_resource.after_service_account_creation]
}

resource "google_sourcerepo_repository_iam_member" "build_source_access" {
  repository = var.cloudsource_repo_name
  role       = "roles/viewer"
  member     = "serviceAccount:${google_service_account.builder.email}"
  depends_on = [null_resource.after_service_account_creation]
}

// Builder service account runs DB migrations during build,
// in order to do that it needs the DB password.
resource "google_secret_manager_secret_iam_member" "build_secrets_access" {
  secret_id = google_secret_manager_secret.prosperdb_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.builder.email}"
  depends_on = [
    google_project_service.project_services["iam.googleapis.com"],
    google_project_service.project_services["secretmanager.googleapis.com"],
    google_secret_manager_secret.prosperdb_password,
    null_resource.after_service_account_creation
  ]
}

resource "google_artifact_registry_repository" "main" {
  provider               = google-beta
  repository_id          = "prosper"
  location               = var.region
  project                = var.project_id
  format                 = "DOCKER"
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "delete-older-than-1-year"
    action = "DELETE"
    condition {
      older_than = "31536000s" // 1 year
    }
  }
  depends_on = [
    google_project_service.project_services["artifactregistry.googleapis.com"]
  ]
}

resource "google_cloudbuild_trigger" "github_push_main" {
  name            = "build-on-push-to-github-main"
  location        = "global"
  service_account = google_service_account.builder.id
  trigger_template {
    branch_name = "main"
    repo_name   = var.cloudsource_repo_name
  }
  build {
    images = [local.image_app]
    step {
      id         = "Build prosper app"
      name       = "gcr.io/cloud-builders/docker"
      entrypoint = "/bin/bash"
      args = ["-c",
        <<-EOT
        docker build -f Dockerfile -t ${local.image_app} .
        docker push ${local.image_app}
        EOT
      ]
    }
    step {
      id         = "Build DB migration image"
      name       = "gcr.io/cloud-builders/docker"
      entrypoint = "/bin/bash"
      args = ["-c",
        <<-EOT
        echo "FROM ${local.image_app}" > Dockerfile-migration
        echo "COPY --from=gcr.io/cloud-sql-connectors/cloud-sql-proxy /cloud-sql-proxy /cloudsql/cloud-sql-proxy" >> Dockerfile-migration
        # echo "RUN npm install -g prisma" >> Dockerfile-migration
        # In order to mount the sql proxy socket, the current user has to be root.
        echo "USER root" >> Dockerfile-migration
        docker build -f Dockerfile-migration -t ${local.image_migration} .
        docker push ${local.image_migration}
        EOT
      ]
    }
    step {
      id         = "Run DB migration"
      name       = local.image_migration
      entrypoint = "/bin/bash"
      env = [
        "DB_NAME=${local.db_name}",
        "DB_USER=${google_sql_user.prosperdb_user.name}",
        "DB_SOCKET_PATH=/cloudsql/${local.db_connection_name}"
      ]
      secret_env = [
        "DB_PASSWORD"
      ]
      args = ["-c",
        <<-EOT
        /cloudsql/cloud-sql-proxy --unix-socket /cloudsql ${local.db_connection_name} &
        sleep 2
        echo "Starting migration..."
        /app/scripts/migrate.sh
        echo "Migration finished"
        EOT
      ]
    }
    step {
      id         = "Deploy to Cloud Run"
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk"
      entrypoint = "gcloud"
      args = [
        "run",
        "deploy",
        "prosper",
        "--image", local.image_app,
        "--region", var.region
      ]
    }
    options {
      logging = "CLOUD_LOGGING_ONLY"
    }
    available_secrets {
      secret_manager {
        version_name = google_secret_manager_secret_version.prosperdb_password.name
        env          = "DB_PASSWORD"
      }
    }
  }
  depends_on = [
    google_project_service.project_services["cloudbuild.googleapis.com"],
    google_project_service.project_services["run.googleapis.com"],
    google_project_service.project_services["sourcerepo.googleapis.com"]
  ]
}

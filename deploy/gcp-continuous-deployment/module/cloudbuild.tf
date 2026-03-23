locals {
  image_base = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}"
  image_app  = "${local.image_base}/app:$COMMIT_SHA"
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
  }
  depends_on = [
    google_project_service.project_services["cloudbuild.googleapis.com"],
    google_project_service.project_services["run.googleapis.com"],
    google_project_service.project_services["sourcerepo.googleapis.com"]
  ]
}

resource "google_service_account" "builder" {
  account_id   = "builder"
  display_name = "Account to build the prosper app and start the newly built container"
}

resource "google_project_iam_member" "build_permissions" {
  for_each = toset(["roles/iam.serviceAccountUser", "roles/run.admin"])
  role     = each.value
  member   = "serviceAccount:${google_service_account.builder.email}"
  project  = var.project_id
  depends_on = [
    google_project_service.project_services["cloudbuild.googleapis.com"],
    google_project_service.project_services["run.googleapis.com"]
  ]
}

resource "google_project_iam_custom_role" "prosper_build" {
  title       = "Prosper Build"
  description = "Role which has the minimal set of permissions required for the build role."
  permissions = [
    "artifactregistry.repositories.uploadArtifacts",
    "run.services.get",
    "run.services.update"
  ]
  role_id = "prosperBuild"
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
    branch_name = var.deploy_branch
    repo_name   = var.cloudsource_repo_name
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
  depends_on = [
    google_project_service.project_services["cloudbuild.googleapis.com"],
    google_project_service.project_services["run.googleapis.com"],
    google_project_service.project_services["sourcerepo.googleapis.com"]
  ]
}

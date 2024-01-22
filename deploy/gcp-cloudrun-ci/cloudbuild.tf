resource "google_project_iam_member" "build_permissions" {
  for_each = toset(["roles/iam.serviceAccountUser", "roles/run.admin"])
  role     = each.value
  member   = "serviceAccount:${data.google_project.prosper.number}@cloudbuild.gserviceaccount.com"
  project  = var.project_id
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
  depends_on = [google_project_service.project_services]
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

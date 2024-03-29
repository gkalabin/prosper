locals {
  db_name            = "prosperdb"
  db_connection_name = "${data.google_project.prosper.project_id}:${var.region}:${google_sql_database_instance.prosperdb.name}"
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
    command = "sleep 60"
  }
  triggers = {
    "before" = null_resource.before_service_account_creation.id
  }
}

resource "null_resource" "after_service_account_creation" {
  depends_on = [null_resource.delay_after_service_account_creation]
}

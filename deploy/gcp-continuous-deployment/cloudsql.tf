resource "random_password" "prosperdb_password" {
  length  = 19
  special = false
}

resource "google_sql_database_instance" "prosperdb" {
  name             = "prosperdb"
  database_version = "MYSQL_8_0"
  settings {
    tier = "db-f1-micro"
  }
  deletion_protection = "true"
  depends_on = [google_project_service.project_services]
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
  depends_on = [google_project_service.project_services]
}

resource "google_secret_manager_secret_version" "prosperdb_password" {
  secret      = google_secret_manager_secret.prosperdb_password.name
  secret_data = google_sql_user.prosperdb_user.password
}

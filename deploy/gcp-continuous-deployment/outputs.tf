output "public_url" {
  value = google_cloud_run_domain_mapping.main.name
}
output "cloudrun_url" {
  value = google_cloud_run_v2_service.prosper.uri
}
output "custom_domain_status" {
  value = google_cloud_run_domain_mapping.main.status
}
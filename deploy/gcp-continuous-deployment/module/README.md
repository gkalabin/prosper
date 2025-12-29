# Prosper continuous deployment with terraform

Components:

- CloudRun runs prosper docker image.
- CloudSQL hosts prosper database.
- CloudBuild triggers a build everytime a commit is pushed to `main`.
  - Build pushes the newly build image to GCP's arifact registry.
  - Then build starts the newly built image on CloudRun.

Prerequisites:

- Mirror repository to Google Cloud Source.
  - Docs:
    https://cloud.google.com/source-repositories/docs/mirroring-a-github-repository
- Set `cloudsource_repo_name` variable to the repo name, eg.
  `github_gkalabin_prosper`.

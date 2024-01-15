.PHONY: dockerbuild
dockerbuild:
	docker build -t gkalabin/prosper .

# Release runs build and pushes the image to Docker Hub.
.PHONY: release
release: dockerbuild
	docker push gkalabin/prosper

.PHONY: dockerpull
dockerpull:
	docker pull gkalabin/prosper

# On Linux we can use --net=host to access host's network from inside the container.
# Inside .env file we can use localhost as a host for DB_URL.
.PHONY: prodrun
prodrun: dockerpull
	docker run --rm -v $(PWD)/.env:/app/.env --net=host gkalabin/prosper

# On MacOS docker containers run inside a VM, so --net=host doesn't work and
# we need to map ports manually. Also DB_HOST should be host.docker.internal
# instead of localhost.
.PHONY: dockerrun-mac
dockerrun-mac:
	docker run --rm -p 3000:3000 -v $(PWD)/.env:/app/.env gkalabin/prosper

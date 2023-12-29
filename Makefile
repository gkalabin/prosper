.PHONY: build
build:
	docker build -t gkalabin/prosper .

.PHONY: dockerrun
dockerrun:
	docker run --rm -p 3000:3000 -v $(PWD)/.env:/app/.env gkalabin/prosper
.PHONY: dev backend frontend proto lint dockerrun-mac

# Load .env and export every variable when running dev targets.
ifneq (,$(filter dev backend frontend,$(MAKECMDGOALS)))
-include .env
export
endif

# Start both backend and frontend dev servers.
dev:
	@echo "Starting backend + frontend..."
	$(MAKE) backend & BACKEND_PID=$$!; \
	$(MAKE) frontend & FRONTEND_PID=$$!; \
	trap 'kill $$BACKEND_PID $$FRONTEND_PID 2>/dev/null' INT TERM; \
	wait

backend:
	cd backend && (air || go run ./cmd/backend)

frontend:
	cd frontend && npm run dev

proto:
	cd proto && buf generate

# Run the full polyglot lint suite via lefthook.
lint:
	lefthook run lint --all-files

# On MacOS docker containers run inside a VM, so --net=host doesn't work and
# we need to map ports manually. Also DB_HOST should be host.docker.internal
# instead of localhost.
dockerrun-mac:
	docker run --rm -p 3000:3000 -v $(PWD)/.env:/app/.env gkalabin/prosper

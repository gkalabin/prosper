#!/bin/sh
# Shared runtime for booting the backend + frontend together. Sourced
# by start.sh (production container entrypoint) and e2e-server.sh
# (Playwright web server). Each caller sets the input variables below
# and then invokes app_run.
#
# Inputs (the caller exports / sets these before calling app_run):
#   BACKEND_BIN  — path to the backend binary
#   FRONTEND_CMD — command (string) that starts the frontend server

# socket_wait_timeout_seconds bounds how long wait_for_socket spends
# polling for the backend to open its socket before giving up.
socket_wait_timeout_seconds=30

# log writes a line to stderr.
log() {
  printf '%s\n' "$*" >&2
}

# wait_for_socket polls GRPC_SOCKET_PATH once per second up to
# socket_wait_timeout_seconds. Returns 0 once the socket exists.
# Returns 1 if the timeout elapses or the backend pid (passed as $1)
# exits before the socket appears.
wait_for_socket() {
  pid=$1
  i=0
  while [ "$i" -lt "$socket_wait_timeout_seconds" ]; do
    if [ -S "$GRPC_SOCKET_PATH" ]; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      log "backend exited before opening $GRPC_SOCKET_PATH"
      return 1
    fi
    sleep 1
    i=$((i + 1))
  done
  log "ERROR: backend did not open $GRPC_SOCKET_PATH within ${socket_wait_timeout_seconds}s"
  return 1
}

# app_run starts the backend, waits for its socket, starts the
# frontend, and supervises both. When either child exits, both are
# stopped and the caller's process exits with the failing child's
# status.
app_run() {
  log "starting backend..."
  "$BACKEND_BIN" &
  backend_pid=$!

  cleanup() {
    [ -n "$backend_pid" ] && kill "$backend_pid" 2>/dev/null || true
    [ -n "$frontend_pid" ] && kill "$frontend_pid" 2>/dev/null || true
    wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
    rm -f "$GRPC_SOCKET_PATH"
  }
  trap cleanup EXIT INT TERM

  if ! wait_for_socket "$backend_pid"; then
    exit 1
  fi
  log "backend ready at $GRPC_SOCKET_PATH"

  log "starting frontend..."
  # eval lets the caller pass a command with arguments via FRONTEND_CMD.
  eval "$FRONTEND_CMD" &
  frontend_pid=$!
  log "both started (backend=$backend_pid, frontend=$frontend_pid)"

  # Block until the first child exits, then propagate its status.
  while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
    sleep 1
  done

  if ! kill -0 "$backend_pid" 2>/dev/null; then
    wait "$backend_pid"
    status=$?
    log "backend exited with code $status"
  else
    wait "$frontend_pid"
    status=$?
    log "frontend exited with code $status"
  fi
  exit "$status"
}

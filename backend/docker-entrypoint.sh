#!/bin/sh
set -e
# Fix ownership of named-volume mount points so appuser can write to them.
# Runs as root (Docker default) before exec-ing the app as appuser.
chown -R appuser:appgroup /app/data /app/sessions
exec su-exec appuser "$@"

#!/bin/bash
# The older always-on Spade (a LaunchAgent that ran the server at login) was replaced by the desktop app. This only removes it and shows its last logs.
# Usage: npm run app:uninstall | app:logs
set -euo pipefail

LABEL="com.planner.app"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOGS="$HOME/Library/Logs/Planner"

case "${1:-}" in
  uninstall)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Removed. Your data and logs are untouched."
    ;;
  logs)
    tail -n 50 "$LOGS/server.log"
    ;;
  *)
    echo "Usage: npm run app:uninstall | app:logs" >&2
    exit 1
    ;;
esac

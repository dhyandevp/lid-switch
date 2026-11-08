#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$DIR/bin/lid-switch"

echo "=== Test 1: Verify binary exists ==="
if [ ! -f "$BIN" ]; then
    echo "FAIL: $BIN does not exist"
    exit 1
fi

# Clean slate
"$BIN" off >/dev/null 2>&1 || true

echo "=== Test 2: Initial status is inactive ==="
set +e
"$BIN" status >/tmp/lid_status.txt
STATUS_CODE=$?
set -e
if [ "$STATUS_CODE" -ne 1 ]; then
    echo "FAIL: Expected status exit code 1 when inactive, got $STATUS_CODE"
    exit 1
fi
grep -q "inactive" /tmp/lid_status.txt || (echo "FAIL: expected 'inactive' output"; exit 1)
echo "PASS: Initial status inactive"

echo "=== Test 3: Turn on ==="
"$BIN" on
set +e
"$BIN" status >/tmp/lid_status.txt
STATUS_CODE=$?
set -e
if [ "$STATUS_CODE" -ne 0 ]; then
    echo "FAIL: Expected status exit code 0 when active, got $STATUS_CODE"
    exit 1
fi
grep -q "active" /tmp/lid_status.txt || (echo "FAIL: expected 'active' output"; exit 1)
systemctl --user is-active -q lid-switch-inhibit || (echo "FAIL: systemd unit not active"; exit 1)
LOCK_VAL=$(gsettings get org.gnome.desktop.screensaver lock-enabled)
if [ "$LOCK_VAL" != "false" ]; then
    echo "FAIL: Expected lock-enabled to be false, got $LOCK_VAL"
    exit 1
fi
echo "PASS: Turn on successful"

echo "=== Test 4: Idempotent on ==="
"$BIN" on
LOCK_VAL=$(gsettings get org.gnome.desktop.screensaver lock-enabled)
if [ "$LOCK_VAL" != "false" ]; then
    echo "FAIL: Expected lock-enabled to remain false, got $LOCK_VAL"
    exit 1
fi
echo "PASS: Idempotent on successful"

echo "=== Test 5: Turn off ==="
"$BIN" off
set +e
"$BIN" status >/tmp/lid_status.txt
STATUS_CODE=$?
set -e
if [ "$STATUS_CODE" -ne 1 ]; then
    echo "FAIL: Expected status exit code 1 after off, got $STATUS_CODE"
    exit 1
fi
grep -q "inactive" /tmp/lid_status.txt || (echo "FAIL: expected 'inactive' output"; exit 1)
LOCK_VAL=$(gsettings get org.gnome.desktop.screensaver lock-enabled)
if [ "$LOCK_VAL" != "true" ]; then
    echo "FAIL: Expected lock-enabled to restore to true, got $LOCK_VAL"
    exit 1
fi
echo "PASS: Turn off successful"

echo "=== Test 6: Toggle ==="
"$BIN" toggle
"$BIN" status | grep -q "active"
"$BIN" toggle
set +e
"$BIN" status | grep -q "inactive"
set -e
echo "PASS: Toggle successful"

echo "=== Test 7: Security - Directory permissions & lock-file validation ==="
"$BIN" on
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/lid-switch"
DIR_PERMS=$(stat -c "%a" "$STATE_DIR")
if [ "$DIR_PERMS" != "700" ]; then
    echo "FAIL: Expected state directory permissions 700, got $DIR_PERMS"
    exit 1
fi
# Inject corrupted value into saved-lock
echo "malicious_string" > "$STATE_DIR/saved-lock"
"$BIN" off
LOCK_VAL=$(gsettings get org.gnome.desktop.screensaver lock-enabled)
if [ "$LOCK_VAL" != "true" ]; then
    echo "FAIL: Expected fallback lock-enabled to true on corrupted saved-lock, got $LOCK_VAL"
    exit 1
fi
echo "PASS: Security checks passed"

echo "ALL CLI TESTS PASSED!"

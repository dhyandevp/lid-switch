#!/usr/bin/env bash
# Uninstaller for Lid Switch (GNOME Shell 51 Extension + CLI Companion)
set -euo pipefail

UUID="lid-switch@dhyandevp"
USER_BIN="$HOME/.local/bin/lid-switch"
USER_EXT="$HOME/.local/share/gnome-shell/extensions/$UUID"
UNIT_NAME="lid-switch-inhibit"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/lid-switch"
LOCK_FILE="$STATE_DIR/saved-lock"
SCREENSAVER_SCHEMA="org.gnome.desktop.screensaver"
POWER_SCHEMA="org.gnome.settings-daemon.plugins.power"

echo "=== Uninstalling Lid Switch ==="

# 1. Stop any active inhibitor unit
if systemctl --user is-active -q "$UNIT_NAME" 2>/dev/null; then
    echo "Stopping active lid inhibitor..."
    systemctl --user stop "$UNIT_NAME" 2>/dev/null || true
fi

# 2. Restore screensaver lock and power settings
if [ -f "$LOCK_FILE" ]; then
    SAVED_LOCK=$(cat "$LOCK_FILE" 2>/dev/null || echo "true")
    if [[ "$SAVED_LOCK" =~ ^(true|false)$ ]]; then
        gsettings set "$SCREENSAVER_SCHEMA" lock-enabled "$SAVED_LOCK" 2>/dev/null || true
    else
        gsettings set "$SCREENSAVER_SCHEMA" lock-enabled true 2>/dev/null || true
    fi
else
    gsettings set "$SCREENSAVER_SCHEMA" lock-enabled true 2>/dev/null || true
fi

if gsettings list-keys "$SCREENSAVER_SCHEMA" 2>/dev/null | grep -qx "ubuntu-lock-on-suspend"; then
    gsettings set "$SCREENSAVER_SCHEMA" ubuntu-lock-on-suspend true 2>/dev/null || true
fi

if gsettings list-keys "$POWER_SCHEMA" 2>/dev/null | grep -qx "lid-close-ac-action"; then
    gsettings set "$POWER_SCHEMA" lid-close-ac-action suspend 2>/dev/null || true
fi
if gsettings list-keys "$POWER_SCHEMA" 2>/dev/null | grep -qx "lid-close-battery-action"; then
    gsettings set "$POWER_SCHEMA" lid-close-battery-action suspend 2>/dev/null || true
fi

# 3. Disable extension if gnome-extensions is available
if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions disable "$UUID" 2>/dev/null || true
fi

# 4. Remove installed files
if [ -f "$USER_BIN" ]; then
    rm -f "$USER_BIN"
    echo "✓ Removed CLI companion from $USER_BIN"
fi

if [ -d "$USER_EXT" ]; then
    rm -rf "$USER_EXT"
    echo "✓ Removed GNOME Extension from $USER_EXT"
fi

# 5. Clean up state directory
rm -rf "$STATE_DIR"

echo ""
echo "=== Uninstallation Complete ==="
echo "Restart your GNOME session or log out to finalize extension removal."

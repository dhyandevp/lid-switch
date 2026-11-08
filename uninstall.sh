#!/usr/bin/env bash
# Uninstaller for Lid Switch (GNOME Shell 51 Extension + CLI Companion)
set -euo pipefail

UUID="lid-switch@dhyandevp"
USER_BIN="$HOME/.local/bin/lid-switch"
USER_EXT="$HOME/.local/share/gnome-shell/extensions/$UUID"
UNIT_NAME="lid-switch-inhibit"

echo "=== Uninstalling Lid Switch ==="

# 1. Stop any active inhibitor unit
if systemctl --user is-active -q "$UNIT_NAME" 2>/dev/null; then
    echo "Stopping active lid inhibitor..."
    systemctl --user stop "$UNIT_NAME" 2>/dev/null || true
fi

# 2. Disable extension if gnome-extensions is available
if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions disable "$UUID" 2>/dev/null || true
fi

# 3. Remove installed files
if [ -f "$USER_BIN" ]; then
    rm -f "$USER_BIN"
    echo "✓ Removed CLI companion from $USER_BIN"
fi

if [ -d "$USER_EXT" ]; then
    rm -rf "$USER_EXT"
    echo "✓ Removed GNOME Extension from $USER_EXT"
fi

# 4. Clean up state directory
rm -rf "${XDG_STATE_HOME:-$HOME/.local/state}/lid-switch"

echo ""
echo "=== Uninstallation Complete ==="
echo "Restart your GNOME session or log out to finalize extension removal."

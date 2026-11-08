#!/usr/bin/env bash
# Installer for Lid Switch (GNOME Shell 51 Extension + CLI Companion)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_SRC="$SCRIPT_DIR/bin/lid-switch"
EXT_SRC="$SCRIPT_DIR/extension"
UUID="lid-switch@dhyandevp"

USER_BIN="$HOME/.local/bin"
USER_EXT="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "=== Installing Lid Switch ==="

# 1. Install CLI helper
mkdir -p "$USER_BIN"
cp "$BIN_SRC" "$USER_BIN/lid-switch"
chmod +x "$USER_BIN/lid-switch"
echo "✓ Installed CLI companion to $USER_BIN/lid-switch"

# Ensure ~/.local/bin is in PATH for future sessions
if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
    echo "Notice: $USER_BIN is not currently in your PATH."
    echo "Add 'export PATH=\"\$HOME/.local/bin:\$PATH\"' to your ~/.bashrc or ~/.zshrc."
fi

# 2. Install GNOME Shell Extension
mkdir -p "$USER_EXT/schemas"
cp "$EXT_SRC/metadata.json" "$USER_EXT/"
cp "$EXT_SRC/extension.js" "$USER_EXT/"
if [ -d "$EXT_SRC/schemas" ]; then
    cp "$EXT_SRC/schemas/"*.xml "$USER_EXT/schemas/"
    glib-compile-schemas "$USER_EXT/schemas" 2>/dev/null || true
fi
echo "✓ Installed GNOME Extension to $USER_EXT"

# 3. Pre-enable extension in GSettings
python3 -c "
import subprocess, ast
try:
    out = subprocess.check_output(['gsettings', 'get', 'org.gnome.shell', 'enabled-extensions']).decode().strip()
    exts = ast.literal_eval(out)
    if '$UUID' not in exts:
        exts.append('$UUID')
        subprocess.check_call(['gsettings', 'set', 'org.gnome.shell', 'enabled-extensions', str(exts)])
    print('✓ Added extension to org.gnome.shell enabled-extensions')
except Exception as e:
    pass
"

if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions enable "$UUID" 2>/dev/null || true
fi

echo ""
echo "=== Installation Complete! ==="
echo "CLI Usage:"
echo "  lid-switch on      # Keep running on lid close"
echo "  lid-switch off     # Normal suspend on lid close"
echo "  lid-switch toggle  # Toggle state"
echo "  lid-switch status  # Show current status"
echo ""
echo "In GNOME Shell: Toggle 'Lid Switch' from the Quick Settings menu (top right)."

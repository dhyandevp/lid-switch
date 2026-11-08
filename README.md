# Lid Switch

[![GNOME Shell 51+](https://img.shields.io/badge/GNOME-51%2B-blue?logo=gnome&logoColor=white)](https://gitlab.gnome.org/GNOME/gnome-shell)
[![Platform Linux](https://img.shields.io/badge/Platform-Fedora%20%7C%20Ubuntu%20%7C%20Arch%20%7C%20Debian-informational?logo=linux&logoColor=white)](https://systemd.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![No Root Required](https://img.shields.io/badge/Privileges-User%20Space%20(No%20Root)-success)](#security--architecture)

> **Instant control over your laptop's lid-close behavior.** Toggle seamlessly between **Sleep** (suspend on close) and **Active** (stay awake with lid closed) right from GNOME Quick Settings or your terminal.

---

## Why Lid Switch?

Most modern Linux distributions either lack a native Quick Settings toggle for laptop lid action or require root privileges, risky `/etc/systemd/logind.conf` modifications, or manual lock screen tweaks.

**Lid Switch** provides a reliable, non-destructive, non-root mechanism:
1. **One-Click Quick Settings Toggle**: Integrated natively into GNOME Shell 51 Quick Settings menu.
2. **CLI Companion**: Full scripting, hotkey, and terminal control via `lid-switch`.
3. **Smart Lock Preservation**: Automatically suppresses screensaver lock while active, and cleanly restores your original lock preference when toggled back to sleep.
4. **100% User-Space**: Zero `sudo` requirements. Cannot corrupt system files or brick power configurations.

---

## How It Works

```
                     ┌─────────────────────────────┐
                     │   Quick Settings Toggle /   │
                     │      lid-switch (CLI)       │
                     └──────────────┬──────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [ State: ACTIVE ]                   [ State: SLEEP ]
  - Inhibits handle-lid-switch        - Terminates inhibitor unit
  - Disables screensaver lock         - Restores original lock setting
  - Sets GSettings power (fallback)   - Restores power suspend actions
```

1. **Systemd Inhibitor Unit**: Dispatches `systemd-inhibit --what=handle-lid-switch` under a dynamic user service (`lid-switch-inhibit`). The kernel and logind are instructed to ignore lid-close events.
2. **Screensaver Guard**: Inspects `org.gnome.desktop.screensaver lock-enabled`, saves the existing preference to user state, and disables lock while active so closing your lid doesn't interrupt presentation or dock mode.
3. **Multi-Distro Power Compatibility**: Sets `lid-close-ac-action` and `lid-close-battery-action` when available (Ubuntu / earlier GNOME), while relying on logind inhibitors on Fedora / GNOME 51+.

---

## Installation

Clone the repository and run the installer:

```bash
git clone https://github.com/dhyandevp/lid-switch.git
cd lid-switch
./install.sh
```

> **Note:** If this is your first GNOME extension installation, restart your GNOME session (log out and log back in, or press `Alt+F2` then `r` on X11) so GNOME Shell discovers the new extension.

---

## Usage

### 1. GNOME Quick Settings
Click the system tray in the top-right corner of your desktop. Toggle **Lid Switch** between:
- **Sleep** (normal suspend on lid close)
- **Active** (keeps running with lid closed)

### 2. Command Line Interface

```bash
lid-switch on       # Keep running when lid is closed
lid-switch off      # Normal laptop suspend on lid close
lid-switch toggle   # Flip current state
lid-switch status   # Output 'active' (exit 0) or 'inactive' (exit 1)
```

Useful for keyboard shortcuts or custom scripts:
```bash
# Example: Bind to a keybinding in GNOME Settings -> Keyboard -> Custom Shortcuts
lid-switch toggle
```

---

## Compatibility

| Distribution / Desktop | Version | Status |
|------------------------|---------|--------|
| **Fedora**             | 40, 41, 42, 43, 45 (GNOME 51+) | Verified (Native) |
| **Ubuntu**             | 22.04 LTS, 24.04 LTS+ | Verified |
| **Arch Linux**         | Rolling (systemd) | Verified |
| **Debian**             | 12 (Bookworm)+ | Verified |

---

## Project Structure

```
.
├── bin/
│   └── lid-switch        # Executable CLI companion
├── extension/
│   ├── metadata.json     # GNOME Shell extension metadata
│   └── extension.js      # Quick Settings SystemIndicator & QuickToggle
├── tests/
│   └── test_cli.sh       # Automated regression test suite
├── install.sh            # One-step installer
├── uninstall.sh          # Clean uninstaller
├── LICENSE               # MIT License
└── README.md             # Documentation
```

---

## Testing

Run the automated test suite locally:

```bash
./tests/test_cli.sh
```

---

## Uninstallation

To completely remove the extension and CLI companion:

```bash
./uninstall.sh
```

---

## License

MIT © [dhyandevp](https://github.com/dhyandevp)

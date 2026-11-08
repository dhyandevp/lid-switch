# Lid Switch - GNOME 51 Extension & CLI Companion

Toggle your laptop's lid-close behavior between **suspend** (default) and **do nothing** (stay active with lid closed).

Works out of the box on **Fedora (GNOME 51+)**, Ubuntu, Debian, Arch, and other systemd-based Linux distributions.

## Features

- **GNOME Quick Settings Toggle**: Switch state with one click from the system menu in the top-right corner.
- **CLI Companion**: Control or script behavior directly from the terminal.
- **3-Layer Control**:
  1. **Logind Inhibitor**: Blocks systemd from triggering suspend on lid switch (`handle-lid-switch`).
  2. **Screen Lock**: Automatically disables screensaver lock when active and restores original preference when turned off.
  3. **Power Settings**: Gracefully sets GSettings power actions where supported (Ubuntu / older GNOME) while operating cleanly on Fedora / GNOME 51.
- **Safe & Non-Root**: No `sudo` or `/etc` edits required. Cannot corrupt system or brick power configuration.

## Installation

Run the installer:

```bash
chmod +x install.sh
./install.sh
```

If this is your first time installing a GNOME extension, log out and log back in (or restart your session) for GNOME Shell to pick up the new extension.

## CLI Usage

```bash
lid-switch on      # Keep running on lid close (disables suspend & lock)
lid-switch off     # Normal laptop behavior (suspend on lid close)
lid-switch toggle  # Flip between on and off
lid-switch status  # Print current state (active / inactive)
```

## Project Structure

```
.
├── bin/
│   └── lid-switch        # Executable CLI companion
├── extension/
│   ├── metadata.json     # GNOME Shell 51 extension metadata
│   └── extension.js      # Quick Settings SystemIndicator & QuickToggle
├── tests/
│   └── test_cli.sh       # Automated test suite
├── install.sh            # One-step installer
└── README.md
```

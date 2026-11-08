import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SCREENSAVER_SCHEMA = 'org.gnome.desktop.screensaver';
const POWER_SCHEMA = 'org.gnome.settings-daemon.plugins.power';

const LidIndicator = GObject.registerClass(
class LidIndicator extends SystemIndicator {
    _init(extension) {
        super._init();
        this._extension = extension;
        this._inhibitFd = null;
        this._savedLock = null;

        const schemaSource = Gio.SettingsSchemaSource.get_default();
        if (schemaSource) {
            if (schemaSource.lookup(SCREENSAVER_SCHEMA, true))
                this._screensaverSettings = new Gio.Settings({schema_id: SCREENSAVER_SCHEMA});
            if (schemaSource.lookup(POWER_SCHEMA, true))
                this._powerSettings = new Gio.Settings({schema_id: POWER_SCHEMA});
        }

        this._toggle = new QuickToggle({
            title: _('Lid Switch'),
            subtitle: _('Sleep'),
            iconName: 'computer-symbolic',
            toggleMode: true,
        });

        this.quickSettingsItems.push(this._toggle);

        this._toggle.connect('clicked', () => {
            this._onToggleClicked();
        });

        this._sync();
    }

    _getStateDir() {
        return GLib.build_filenamev([GLib.get_user_state_dir(), 'lid-switch']);
    }

    _getLockFilePath() {
        return GLib.build_filenamev([this._getStateDir(), 'saved-lock']);
    }

    _saveLockState() {
        if (!this._screensaverSettings)
            return;
        try {
            const currentLock = this._screensaverSettings.get_boolean('lock-enabled');
            this._savedLock = currentLock;
            const dir = this._getStateDir();
            GLib.mkdir_with_parents(dir, 0o700);
            const path = this._getLockFilePath();
            GLib.file_set_contents(path, currentLock ? 'true\n' : 'false\n');
        } catch (e) {
            console.error(`LidSwitch: failed to save lock state: ${e.message}`);
        }
    }

    _restoreLockState() {
        if (!this._screensaverSettings)
            return;
        try {
            let restoreVal = true;
            if (this._savedLock !== null) {
                restoreVal = this._savedLock;
            } else {
                const path = this._getLockFilePath();
                if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                    const [, data] = GLib.file_get_contents(path);
                    const content = new TextDecoder().decode(data).trim();
                    restoreVal = content !== 'false';
                }
            }
            this._screensaverSettings.set_boolean('lock-enabled', restoreVal);
            this._savedLock = null;
            const path = this._getLockFilePath();
            if (GLib.file_test(path, GLib.FileTest.EXISTS))
                GLib.unlink(path);
        } catch (e) {
            console.error(`LidSwitch: failed to restore lock state: ${e.message}`);
        }
    }

    _setPowerAction(action) {
        if (!this._powerSettings)
            return;
        try {
            const keys = this._powerSettings.list_keys();
            if (keys.includes('lid-close-ac-action'))
                this._powerSettings.set_string('lid-close-ac-action', action);
            if (keys.includes('lid-close-battery-action'))
                this._powerSettings.set_string('lid-close-battery-action', action);
        } catch (e) {
            console.error(`LidSwitch: failed to set power action: ${e.message}`);
        }
    }

    _onToggleClicked() {
        if (this._toggle.checked)
            this._enableInhibit();
        else
            this._disableInhibit();
    }

    _enableInhibit() {
        this._saveLockState();
        if (this._screensaverSettings) {
            try {
                this._screensaverSettings.set_boolean('lock-enabled', false);
            } catch (e) {
                console.error(`LidSwitch: failed to disable lock: ${e.message}`);
            }
        }
        this._setPowerAction('nothing');

        Gio.DBus.system.call_with_unix_fd_list(
            'org.freedesktop.login1',
            '/org/freedesktop/login1',
            'org.freedesktop.login1.Manager',
            'Inhibit',
            new GLib.Variant('(ssss)', [
                'handle-lid-switch',
                'lid-switch',
                'Laptop lid close configured to keep system running',
                'block',
            ]),
            new GLib.VariantType('(h)'),
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            null,
            (conn, res) => {
                try {
                    const [, fdList] = conn.call_with_unix_fd_list_finish(res);
                    const fds = fdList.steal_fds();
                    this._inhibitFd = fds[0];
                    this._updateUi(true);
                } catch (e) {
                    console.error(`LidSwitch: Inhibit call failed: ${e.message}`);
                    this._restoreLockState();
                    this._setPowerAction('suspend');
                    this._updateUi(false);
                }
            }
        );
    }

    _disableInhibit() {
        if (this._inhibitFd !== null) {
            try {
                GLib.close(this._inhibitFd);
            } catch (e) {
                console.error(`LidSwitch: error closing fd: ${e.message}`);
            }
            this._inhibitFd = null;
        }

        // Cleanly stop any systemd user unit started from CLI companion
        Gio.DBus.session.call(
            'org.freedesktop.systemd1',
            '/org/freedesktop/systemd1',
            'org.freedesktop.systemd1.Manager',
            'StopUnit',
            new GLib.Variant('(ss)', ['lid-switch-inhibit.service', 'replace']),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            () => {}
        );

        this._restoreLockState();
        this._setPowerAction('suspend');
        this._updateUi(false);
    }

    _updateUi(active) {
        this._toggle.checked = active;
        this._toggle.subtitle = active ? _('Active') : _('Sleep');
    }

    _sync() {
        if (this._inhibitFd !== null) {
            this._updateUi(true);
            return;
        }

        Gio.DBus.system.call(
            'org.freedesktop.login1',
            '/org/freedesktop/login1',
            'org.freedesktop.login1.Manager',
            'ListInhibitors',
            null,
            new GLib.VariantType('(a(ssssuu))'),
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (conn, res) => {
                try {
                    const out = conn.call_finish(res);
                    const [items] = out.deepUnpack();
                    const active = items.some(([what, who]) =>
                        what.includes('handle-lid-switch') && who === 'lid-switch'
                    );
                    this._updateUi(active);
                } catch (e) {
                    this._updateUi(false);
                }
            }
        );
    }

    cleanUp() {
        if (this._inhibitFd !== null) {
            try {
                GLib.close(this._inhibitFd);
            } catch {
                // ignore
            }
            this._inhibitFd = null;
            this._restoreLockState();
            this._setPowerAction('suspend');
        }
    }
});

export default class LidSwitchExtension extends Extension {
    enable() {
        this._indicator = new LidIndicator(this);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

        this._menuSignal = Main.panel.statusArea.quickSettings.menu.connect(
            'open-state-changed',
            (menu, isOpen) => {
                if (isOpen && this._indicator)
                    this._indicator._sync();
            }
        );
    }

    disable() {
        if (this._menuSignal) {
            Main.panel.statusArea.quickSettings.menu.disconnect(this._menuSignal);
            this._menuSignal = null;
        }

        if (this._indicator) {
            this._indicator.quickSettingsItems.forEach(item => item.destroy());
            this._indicator.cleanUp();
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

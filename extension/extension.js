import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const LidIndicator = GObject.registerClass(
class LidIndicator extends SystemIndicator {
    _init(extension) {
        super._init();
        this._extension = extension;

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

    _resolveBinary() {
        const userBin = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'bin', 'lid-switch']);
        if (GLib.file_test(userBin, GLib.FileTest.IS_EXECUTABLE))
            return userBin;

        const pathBin = GLib.find_program_in_path('lid-switch');
        if (pathBin)
            return pathBin;

        if (this._extension && this._extension.path) {
            const extBin = GLib.build_filenamev([this._extension.path, '..', 'bin', 'lid-switch']);
            if (GLib.file_test(extBin, GLib.FileTest.IS_EXECUTABLE))
                return extBin;
        }

        return 'lid-switch';
    }

    _onToggleClicked() {
        const bin = this._resolveBinary();
        try {
            const proc = new Gio.Subprocess({
                argv: [bin, 'toggle'],
                flags: Gio.SubprocessFlags.NONE,
            });
            proc.init(null);
            proc.wait_async(null, () => {
                this._sync();
            });
        } catch (e) {
            console.error(`LidSwitch: failed to run toggle: ${e.message}`);
        }
    }

    _sync() {
        const bin = this._resolveBinary();
        try {
            const proc = new Gio.Subprocess({
                argv: [bin, 'status'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
            });
            proc.init(null);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, stdout] = p.communicate_utf8_finish(res);
                    const status = (stdout || '').trim();
                    const isActive = status === 'active';
                    this._toggle.checked = isActive;
                    this._toggle.subtitle = isActive ? _('Active') : _('Sleep');
                } catch {
                    this._toggle.checked = false;
                    this._toggle.subtitle = _('Sleep');
                }
            });
        } catch (e) {
            console.error(`LidSwitch: status check failed: ${e.message}`);
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
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

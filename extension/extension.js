import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

const LidToggle = GObject.registerClass(
class LidToggle extends QuickSettings.QuickToggle {
    constructor() {
        super({
            title: _('Lid Switch'),
            subtitle: _('Sleep'),
            iconName: 'computer-symbolic',
            toggleMode: true,
        });

        this._inhibitFd = null;
        this._cancellable = new Gio.Cancellable();

        this._clickedId = this.connect('clicked', () => {
            if (this.checked)
                this._inhibit();
            else
                this._uninhibit();
        });
    }

    _inhibit() {
        Gio.DBus.system.call_with_unix_fd_list(
            'org.freedesktop.login1',
            '/org/freedesktop/login1',
            'org.freedesktop.login1.Manager',
            'Inhibit',
            new GLib.Variant('(ssss)', [
                'handle-lid-switch',
                'lid-switch',
                'Prevent suspend on lid close',
                'block',
            ]),
            new GLib.VariantType('(h)'),
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            this._cancellable,
            (conn, res) => {
                try {
                    const [, fdList] = conn.call_with_unix_fd_list_finish(res);
                    const [fd] = fdList.steal_fds();
                    this._inhibitFd = fd;
                    this.checked = true;
                    this.subtitle = _('Active');
                } catch {
                    this.checked = false;
                    this.subtitle = _('Sleep');
                }
            }
        );
    }

    _uninhibit() {
        if (this._inhibitFd !== null) {
            GLib.close(this._inhibitFd);
            this._inhibitFd = null;
        }
        this.checked = false;
        this.subtitle = _('Sleep');
    }

    destroy() {
        if (this._clickedId) {
            this.disconnect(this._clickedId);
            this._clickedId = null;
        }
        this._cancellable.cancel();
        this._uninhibit();
        super.destroy();
    }
});

const LidIndicator = GObject.registerClass(
class LidIndicator extends QuickSettings.SystemIndicator {
    constructor() {
        super();

        this._statusIcon = this._addIndicator();
        this._statusIcon.icon_name = 'computer-symbolic';

        this._toggle = new LidToggle();
        this.quickSettingsItems.push(this._toggle);

        this._toggle.bind_property(
            'checked',
            this._statusIcon,
            'visible',
            GObject.BindingFlags.SYNC_CREATE
        );
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});

export default class LidSwitchExtension extends Extension {
    enable() {
        this._indicator = new LidIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

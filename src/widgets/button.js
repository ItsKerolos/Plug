/* eslint-disable camelcase */

const { St, Clutter } = imports.gi;

const PanelMenuButton = imports.ui.panelMenu.Button;

// now we can this the GNOME way
// by extending PanelMenu.Button registering a custom class
// and dealing with all the weird GObject stuff
// or we could just use the original widgets
// do everything inside a function then return the parent widget
// which is technically not any different
// but way easier to read and maintain and
// only uses acutal real EcmaScript

/**
* @param { { label: string, icon: string } } param0
*/
export const Button = ({ label, icon }) =>
{
  // I have no idea what this (0.0) value is for
  // but GNOME will crash and burn without it, so.....
  const button = new PanelMenuButton(0.0);

  button.add_child(Title({ label, icon }));

  return button;
};

/**
* @param { { label: string, icon: string } } param0
*/
export const Title = ({ label, icon }) =>
{
  const box = new St.BoxLayout();

  if (icon)
  {
    const _icon =  new St.Icon({
      // gicon: new Gio.ThemedIcon({ name: 'system-search-symbolic' }),
      // icon_name: 'system-search-symbolic',
      icon_name: icon,
      style_class: 'system-status-icon'
    });

    box.add(_icon);
  }

  if (label)
  {
    const _label = new St.Label({
      text: label,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    });

    box.add(_label);
  }

  return box;
};
/* eslint-disable camelcase */

const { St, Clutter } = imports.gi;

const Base = imports.ui.panelMenu.Button;

// now we can this the GNOME way
// by extending PanelMenu.Button registering a custom class
// and dealing with all the weird GObject stuff
// or we could just use the original widgets
// do everything inside a function then return the parent widget
// which is technically not any different
// but way easier to read and maintain and
// only uses acutal real EcmaScript

// eslint-disable-next-line no-unused-vars, no-var
export const Button = ({ label, icon }) =>
{
  const stButton = new Base();

  const stBox = new St.BoxLayout();

  if (icon)
  {
    const stIcon =  new St.Icon({
      // gicon: new Gio.ThemedIcon({ name: 'system-search-symbolic' }),
      // icon_name: 'system-search-symbolic',

      icon_name: icon,
      style_class: 'system-status-icon'
    });

    stBox.add(stIcon);
  }

  if (label)
  {
    const stLabel = new St.Label({
      text: label,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    });

    stBox.add(stLabel);
  }

  stButton.add_child(stBox);

  return stButton;
};
/* eslint-disable camelcase */

const { St } = imports.gi;

const { PopupMenuItem } = imports.ui.popupMenu;

/**
* @param { { label: string, icon: string, style_class: string, contain: boolean } } param0
*/
export const Label = ({ label, icon, style_class, contain }) =>
{
  if (typeof contain !== 'boolean')
    contain = true;
  
  const item = new PopupMenuItem('');

  const box = new St.BoxLayout({
    style_class: style_class || 'label-box',
    x_expand: true
  });

  item.label.visible = false;

  if (icon)
  {
    const _icon =  new St.Icon({
      // gicon: new Gio.ThemedIcon({ name: 'system-search-symbolic' }),
      // icon_name: 'system-search-symbolic',
      icon_name: icon,
      style_class: 'popup-menu-icon'
    });

    box.add(_icon);
  }

  if (label)
  {
    const _label = new St.Label({
      text: label
    });

    box.add(_label);
  }

  if (contain)
  {
    item.add_child(box);
  
    return item;
  }
  
  return box;
};
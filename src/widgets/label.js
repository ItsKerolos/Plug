/* eslint-disable camelcase */

import { Image } from './image.js';

import { spawnAsync } from '../utilities.js';

const { St } = imports.gi;

const { PopupBaseMenuItem } = imports.ui.popupMenu;

/**
* @param { { text: string, vertical: boolean, image: any, icon: any, contain: boolean, press: string } } param0
*/
export const Label = ({ vertical, text, image, icon, contain, press }) =>
{
  if (typeof contain !== 'boolean')
    contain = true;
  
  if (typeof vertical !== 'boolean')
    vertical = false;

  const item = new PopupBaseMenuItem();

  const box = new St.BoxLayout({
    vertical,
    x_expand: true,
    style_class: (vertical) ? 'vertical-label-box' : 'label-box'
  });

  if (image)
  {
    const _image = Image({
      ...image,
      mode: 'image'
    });

    box.add(_image);
  }
  else if (icon)
  {
    const _icon = Image({
      ...icon,
      mode: 'icon'
    });

    box.add(_icon);
  }

  if (text)
  {
    const _label = new St.Label({
      text: text
    });

    box.add(_label);
  }

  if (contain)
  {
    item.add_child(box);

    if (press)
      item.connect('button-press-event', () => spawnAsync(press));
  
    return item;
  }
  
  return box;
};
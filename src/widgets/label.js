/* eslint-disable camelcase */

import { Image } from './image.js';

import { spawnAsync } from '../utilities.js';

const { St, GLib, Clutter } = imports.gi;

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

  if (image || icon)
  {
    let props;
    let mode;

    let _img;

    if (image)
    {
      props = image;
      mode = 'image';
    }
    else
    {
      props = icon;
      mode = 'icon';
    }
    
    if (typeof props === 'object')
    {
      _img = Image({
        ...props,
        mode
      });
    }
    else
    {
      _img = Image({
        url: props,
        mode
      });
    }

    box.add(_img);
  }

  if (text)
  {
    const _label = new St.Label({
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    });

    const clutterText = _label.get_clutter_text();
    
    clutterText.use_markup = true;
    clutterText.text = GLib.strcompress(text);

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
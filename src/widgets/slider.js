/* eslint-disable camelcase */

import { Label } from './label.js';

const { St } = imports.gi;

const { PopupMenuItem } = imports.ui.popupMenu;

const Base = imports.ui.slider;

/**
* @param { { label: string, icon: string } } param0
*/
export const Slider = ({ label, icon }) =>
{
  const item = new PopupMenuItem('');

  const slider = new Base.Slider(0);

  const box = new St.BoxLayout({
    style_class: 'slider-box',
    vertical: true,
    x_expand: true
  });
  
  const details = Label({
    style_class: 'slider-details-box',
    contain: false,
    label,
    icon
  });
  
  item.label.visible = false;

  box.add_child(details);
  box.add_child(slider);

  item.add_child(box);

  // this._slider.value;
  // his._slider.connect('drag-end', this._notifyVolumeChange.bind(this));

  return item;
};
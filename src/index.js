/* eslint-disable no-unused-vars */

/// <reference path="../node_modules/gnome-shell-extension-types/global.d.ts"/>

import { Button } from './widgets/button.js';
import { Toggle } from './widgets/toggle.js';

import { Separator } from './widgets/separator.js';

import { Label } from './widgets/label.js';
import { Dropdown } from './widgets/dropdown.js';
import { Slider } from './widgets/slider.js';
import { Image } from './widgets/image.js';

const { main } = imports.ui;

/**
* @type { Button }
*/
let indicator;

/** this function is called once when your extension is loaded, not enabled
*/
function init()
{
  log('[plug@ker0olos]: initializing Plug');
}
/** this function could be called after your extension is installed, enabled
* or when you log in or when the screen is unlocked
*/
function enable()
{
  log('[plug@ker0olos]: enabling Plug');

  indicator = Button({ label: 'Hello, World.' });

  // indicator.menu.addMenuItem(Label({ label: 'Beep Boop', icon: 'system-search-symbolic' }));
  // indicator.menu.addMenuItem(Separator());
  // indicator.menu.addMenuItem(Dropdown({ label: 'Hello', items: [ 'Mana', 'Skye', 'Mika' ] }));
  // indicator.menu.addMenuItem(Separator());
  // indicator.menu.addMenuItem(Slider({ label: 'Slider Example', icon: 'applications-multimedia-symbolic' }));
  // indicator.menu.addMenuItem(Separator());
  // indicator.menu.addMenuItem(Toggle({ label: 'AAA', state: true }));
  
  indicator.menu.addMenuItem(Image({
    // mode: 'icon',
    mode: 'image',
    url: 'system-search-symbolic'
    // url: '/home/ker0olos/Pictures/gnome-shell-screenshot-3NA8H0.png',
    // url: 'https://i.scdn.co/image/ab67616d00001e029a69d046c6872ba4eb9ce82c'
  }));

  main.panel.addToStatusArea('Plug Debug Button', indicator, 2, 'left');
}

/** this function could be called after your extension is uninstalled, disabled
* or when you log out or when the screen locks
*/
function disable()
{
  log('[plug@ker0olos]: disabling Plug');

  indicator?.destroy();

  indicator = undefined;
}
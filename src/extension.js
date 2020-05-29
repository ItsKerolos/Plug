/// <reference path="../node_modules/gnome-shell-extension-types/global.d.ts"/>

const { main } = imports.ui;

const Extension = imports.misc.extensionUtils.getCurrentExtension();

import { Button } from './widgets/button.js';

/** We're going to declare `indicator` in the scope of the whole script so it can
// be accessed in both `enable()` and `disable()`
* @type { ExampleIndicator }
*/
let indicator;

// This function is called once when your extension is loaded, not enabled.
// You MUST NOT make any changes to GNOME Shell, connect any signals or add any
// MainLoop sources here.
function init()
{
  log(`[plug@ker0olos]: initializing ${Extension.metadata.name} version ${Extension.metadata.version}`);
}

// This function could be called after your extension is enabled, which could
// be done from GNOME Tweaks, when you log in or when the screen is unlocked.

// This is when you setup any UI for your extension, change existing widgets,
// connect signals or modify GNOME Shell's behaviour.
function enable()
{
  log(`[plug@ker0olos]: enabling ${Extension.metadata.name} version ${Extension.metadata.version}`);

  indicator = Button({ label: 'aaa', icon: 'system-search-symbolic' });

  // The `main` import is an example of file that is mostly live instances of
  // objects, rather than reusable code. `Main.panel` is the actual panel you
  // see at the top of the screen.
  main.panel.addToStatusArea(`${Extension.metadata.name} Debug Button`, indicator, 2, 'left');
}

// This function could be called after your extension is uninstalled, disabled
// in GNOME Tweaks, when you log out or when the screen locks.

// Anything you created, modified or setup in enable() MUST be undone here. Not
// doing so is the most common reason extensions are rejected during review!
function disable()
{
  log(`[plug@ker0olos]: disabling ${Extension.metadata.name} version ${Extension.metadata.version}`);

  // REMINDER: It's required for extensions to clean up after themselves when
  // they are disabled. This is required for approval during review!
  if (!indicator)
    return;
  
  indicator.destroy();

  indicator = undefined;
}
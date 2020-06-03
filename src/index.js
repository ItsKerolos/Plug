/* eslint-disable camelcase, no-unused-vars */
/* eslint-disable security/detect-object-injection */

/// <reference path="../node_modules/gnome-shell-extension-types/global.d.ts"/>

// import { Button } from './widgets/button.js';
// import { Toggle } from './widgets/toggle.js';

// import { Separator } from './widgets/separator.js';

// import { Label } from './widgets/label.js';
// import { Dropdown } from './widgets/dropdown.js';
// import { Slider } from './widgets/slider.js';
// import { Image } from './widgets/image.js';

const { GLib, Gio } = imports.gi;
const { main } = imports.ui;

const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

let directory;
let directory_monitor;
let directory_monitor_delay;

let directory_monitor_id;

/**
* @type { Object<string, {
*  config: Config,
*  monitor: any,
*  monitorId: any,
*  monitorDelay: any,
*  button: any
}> }
*/
let plugins;

/**
* @typedef { Object } Config
* @property { string } name
* @property { string } execute
* @property { string } main
* @property { number } refresh
* @property { 'left' | 'center' | 'right' } position
* @property { number } priority
*/

/** this function is called once when your extension is loaded, not enabled
*/
function init()
{
  // /home/[user]/.config/plug
  const directoryPath = [ GLib.get_user_config_dir(), 'plug' ].join('/');

  directory = Gio.File.new_for_path(directoryPath);
}

/** need a directory using GJS needlessly complicated api
* @param { string } dir
* @param { () => void } callback
*/
function readDir(dir, callback)
{
  const enumerator = dir.enumerate_children(Gio.FILE_ATTRIBUTE_STANDARD_NAME, Gio.FileQueryInfoFlags.NONE, null);
  
  let fileInfo = enumerator.next_file(null);

  while (fileInfo)
  {
    const file = enumerator.get_child(fileInfo);

    callback(file);

    fileInfo = enumerator.next_file(null);
  }
}

/** this function could be called after your extension is installed, enabled
* or when you log in or when the screen is unlocked
*/
function enable()
{
  log('plug@ker0olos: enabled');

  plugins = {};

  // if the plug root directory does not exist then create it
  // the plug root directory is where plugins are stored and loaded from
  if (!directory.query_exists(null))
    directory.make_directory(null);

  // initial load of all plugins
  
  // read the plug root directory
  readDir(directory, (plugin_directory) =>
  {
    const path = plugin_directory.get_path();

    // if the file is not a directory then ignore it
    if (!GLib.file_test(path, GLib.FileTest.IS_DIR))
      return;

    enable_plugin(path);
    load_plugin(path);
  });

  // start monitoring the plug directory for changes
  // allows plug to load and unload plugins in runtime
  // instead of requiring an extension reload or a GNOME Shell reload

  directory_monitor = directory.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null);

  directory_monitor_id = directory_monitor.connect('changed', (monitor, file, otherFile) =>
  {
    // if no callback is currently scheduled
    // then schedule it after 100ms
    // prevents GNOME from calling the callback 20 times in a single millisecond
    if (!directory_monitor_delay)
      directory_monitor_delay = Mainloop.timeout_add(100, () => monitor_root_callback(file, otherFile));
  });
}

function monitor_root_callback(file, otherFile)
{
  const path = file.get_path();
  const otherPath = otherFile?.get_path();

  const exists = file.query_exists(null);
  
  // remove delay indicator
  directory_monitor_delay = null;

  // directory deleted or moved
  if (!exists)
  {
    // moved
    if (otherPath && plugins[path])
    {
      // if a plugin directory moved

      // the old path needs to be unloaded
      // and the new path needs to be loaded

      unload_plugin(path);
      load_plugin(otherPath);

      // the old path needs to be disabled
      // and the new path needs to be enabled

      disable_plugin(path);
      enable_plugin(otherPath);
    }
    // deleted
    else if (plugins[path])
    {
      // unload the plugin

      unload_plugin(path);
      disable_plugin(path);
    }
  }
  // directory added or changed
  else if (GLib.file_test(path, GLib.FileTest.IS_DIR))
  {
    // if plugin is not enabled yet
    if (!plugins[path])
      enable_plugin(path);
    
    // reload plugin

    unload_plugin(path);
    load_plugin(path);
  }
}

function monitor_plugin_callback(file)
{
  const path = file.get_parent().get_path();

  // remove delay indicator
  plugins[path].monitorDelay = null;

  // reload plugin

  unload_plugin(path);
  load_plugin(path);
}

/** monitor the plugin directory for changes
* @param { string } path
*/
function enable_plugin(path)
{
  const directory = Gio.File.new_for_path(path);

  // start monitoring the plugin directory for changes
  // allows plug to load and unload plugins in runtime
  // instead of requiring an extension reload or a GNOME Shell reload

  const monitor = directory.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null);

  const monitorId = monitor.connect('changed', (monitor, file) =>
  {
    // if no callback is currently scheduled
    // then schedule it after 100ms
    // prevents GNOME from calling the callback 20 times in a single millisecond
    if (!plugins[path].monitorDelay)
      plugins[path].monitorDelay = Mainloop.timeout_add(100, () => monitor_plugin_callback(file));
  });

  plugins[path] = {
    monitor,
    monitorId
  };
}

/** stop monitoring the plugin directory
* @param { string } path
*/
function disable_plugin(path)
{
  const plugin = plugins[path];

  // stop monitoring the plugin directory

  // no need to stop the monitor delay here
  // all disabled plugins are also unloaded first
  // and unload_plugins stops the delay

  plugin.monitor.disconnect(plugin.monitorId);
  plugin.monitor.cancel();

  plugin.monitor = plugin.monitorId = null;

  plugins[path] = null;
}

/** loads the plugin config and executes the its code
* @param { string } path
*/
function load_plugin(path)
{
  // const configPath = [ path, 'config.json' ].join('/');

  // const [ success, data ] = GLib.file_get_contents(filePath);

  // // file couldn't be read
  // if (!success)
  //   return;

  // // start monitoring the plugin ug directory for changes
  // // allows plug to load and unload plugins in runtime
  // // instead of requiring an extension reload or a GNOME Shell reload

  // /** convert data to string then to an object
  // * @type { Config }
  // */
  // const config = JSON.parse(ByteArray.toString(data));

  // plugins[dirPath].config = config;

  // // TODO load plugin's button

  // indicator.menu.addMenuItem(Label({ label: 'Plugin: ' + config.name }));

  // main.panel.addToStatusArea('Plug Debug Button', indicator, 2, 'left');

  // indicator.menu.addMenuItem(Label({ label: 'Beep Beep', icon: 'system-search-symbolic' }));
  // indicator.menu.addMenuItem(Separator());
  // indicator.menu.addMenuItem(Dropdown({ label: 'Hello', items: [ 'Mana', 'Skye', 'Mika' ] }));
  // indicator.menu.addMenuItem(Separator());
  // indicator.menu.addMenuItem(Toggle({ label: 'AAA', state: true }));
  
  // indicator.menu.addMenuItem(Image({
  //   // mode: 'icon',
  //   mode: 'image',
  //   width: 100,
  //   height: 100,
  //   // url: 'system-search-symbolic'
  //   // url: '/home/ker0olos/Pictures/gnome-shell-screenshot-3NA8H0.png',
  //   url: 'https://i.scdn.co/image/ab67616d00001e029a69d046c6872ba4eb9ce82c'
  // }));
}

/** unload the plugin config and destroys its button
* @aram { string } path
*/
function unload_plugin(path)
{
  const plugin = plugins[path];

  // if a monitor call is awaiting then cancel it
  if (plugin.monitorDelay)
  {
    Mainloop.source_remove(plugin.monitorDelay);

    plugin.monitorDelay = null;
  }
}

/** this function could be called after your extension is uninstalled, disabled
* or when you log out or when the screen locks
*/
function disable()
{
  log('plug@ker0olos: disabled');

  // stop monitoring the root directory

  // if a monitor call is awaiting then cancel it
  if (directory_monitor_delay)
  {
    Mainloop.source_remove(directory_monitor_delay);

    directory_monitor_delay = null;
  }

  directory_monitor.disconnect(directory_monitor_id);
  directory_monitor.cancel();

  directory_monitor = directory_monitor_id = null;

  // unload plugins

  Object.keys(plugins).forEach((path) =>
  {
    unload_plugin(path);
    disable_plugin(path);
  });

  plugins = null;
}
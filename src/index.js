/* eslint-disable camelcase, no-unused-vars */
/* eslint-disable security/detect-object-injection */

/// <reference path="../node_modules/gnome-shell-extension-types/global.d.ts"/>

import { Button } from './widgets/button.js';

// import { Label } from './widgets/label.js';
// import { Image } from './widgets/image.js';
// import { Separator } from './widgets/separator.js';

// import { Toggle } from './widgets/toggle.js';
// import { Slider } from './widgets/slider.js';
// import { Dropdown } from './widgets/dropdown.js';

const { GLib, Gio } = imports.gi;
const { main } = imports.ui;

const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

let directory;
let directory_monitor;
let directory_monitor_timeout;

let directory_monitor_id;

/**
* @type { Object<string, {
*  config: Config,
*  monitor: any,
*  monitorId: any,
*  monitorTimeout: any,
*  intervalTimeout: any,
*  button: Button
}> }
*/
let plugins;

/**
* @typedef { Object } Config
* @property { string } name
* @property { string } execute
* @property { string } main
* @property { number } interval
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

/** replace invalid or missing properties from config
* to make sure GNOME does not catch fire
* @param { Config } config
*/
function valid_config(config)
{
  // default is none (won't be updated)
  if (typeof config.interval !== 'number')
    config.interval = -1;

  // if interval is higher than -1 but lower than 1000ms
  // then force it to be 1000ms
  if (config.interval > -1 && config.interval < 1000)
    config.interval = 1000;
  
  // default position is right
  if (config.position !== 'left' && config.position !== 'center' && config.position !== 'right')
    config.position = 'right';

  // default and minimal priority is 0
  if (typeof config.priority !== 'number' || config.priority <= -1)
    config.priority = 0;
  
  return config;
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
    if (!directory_monitor_timeout)
      directory_monitor_timeout = Mainloop.timeout_add(100, () => monitor_root_callback(file, otherFile));
  });
}

function monitor_root_callback(file, otherFile)
{
  const path = file.get_path();
  const otherPath = otherFile?.get_path();

  const exists = file.query_exists(null);
  
  // remove the timeout indicator
  directory_monitor_timeout = null;

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

  // remove the timeout indicator
  plugins[path].monitorTimeout = null;

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
    if (!plugins[path].monitorTimeout)
      plugins[path].monitorTimeout = Mainloop.timeout_add(100, () => monitor_plugin_callback(file));
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

  // no need to stop the monitor timeout here
  // all disabled plugins are also unloaded first
  // and unload_plugins stops the timeout

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
  const id = path.split('/').pop();

  const configPath = [ path, 'config.json' ].join('/');

  const configFile = Gio.File.new_for_path(configPath);

  // file doesn't exists
  // using just file_get_contents throws an error
  if (!configFile.query_exists(null))
    return;

  const [ success, data ] = GLib.file_get_contents(configPath);

  // file couldn't be read
  if (!success)
    return;

  /** convert data to string then to an object
  * @type { Config }
  */
  let config;

  // try to avoid throwing any errors if something
  // goes wrong with the config file data
  try
  {
    config = ByteArray.toString(data);
    config = JSON.parse(config);
  }
  catch
  {
    config = null;
  }

  // required properties are required, and required is !important
  if (!config || !config.main || !config.execute)
    return;

  // validate the config object
  plugins[path].config = valid_config(config);

  // TODO load plugin's button
  // spawn the main file using the config.execute and config.main

  const button = plugins[path].button = Button({ label: config.name });

  // indicator.menu.addMenuItem(Label({ label: 'Plugin: ' + config.name }));

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

  // add the button to the top panel
  main.panel.addToStatusArea(id, button, config.priority, config.position);

  // run the plugin on a update interval if its config specify it
  if (config.interval > -1)
  {
    plugins[path].intervalTimeout = Mainloop.timeout_add(config.interval, () =>
    {
      // reload plugin

      unload_plugin(path);
      load_plugin(path);
    });
  }
}

/** unload the plugin config and destroys its button
* @param { string } path
*/
function unload_plugin(path)
{
  const plugin = plugins[path];

  // if a monitor call is awaiting then cancel it
  if (plugin.monitorTimeout)
  {
    Mainloop.source_remove(plugin.monitorTimeout);

    plugin.monitorTimeout = null;
  }

  // stop the reload interval if its running
  if (plugin.intervalTimeout)
  {
    Mainloop.source_remove(plugin.intervalTimeout);

    plugin.intervalTimeout = null;
  }

  // destroy the widget
  plugin.button?.destroy();

  plugin.config = plugin.button = null;
}

/** this function could be called after your extension is uninstalled, disabled
* or when you log out or when the screen locks
*/
function disable()
{
  log('plug@ker0olos: disabled');

  // stop monitoring the root directory

  // if a monitor call is awaiting then cancel it
  if (directory_monitor_timeout)
  {
    Mainloop.source_remove(directory_monitor_timeout);

    directory_monitor_timeout = null;
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
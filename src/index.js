/* eslint-disable camelcase */
/* eslint-disable security/detect-object-injection */

/// <reference path="../node_modules/gnome-shell-extension-types/global.d.ts"/>

import { readDir, isEmpty, parseLine, spawnPlugin, killProcess } from './utilities.js';

import { Button } from './widgets/button.js';

import { Label } from './widgets/label.js';
import { Separator } from './widgets/separator.js';

// import { Dropdown } from './widgets/dropdown.js';
// import { Toggle } from './widgets/toggle.js';
// import { Slider } from './widgets/slider.js';

const { GLib, Gio } = imports.gi;

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
*  processTimeout: any,
*  processId: any,
*  intervalTimeout: any,
*  button: import('./widgets/button').Button
*  lastOutput: string
}> }
*/
let plugins;

/**
* @typedef { Object } Config
* @property { boolean } killed
* @property { string } name
* @property { string } execute
* @property { string } main
* @property { number } interval
* @property { 'left' | 'center' | 'right' } alignment
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

      // the old path needs to be disabled

      unload_plugin(path);
      disable_plugin(path);

      // then the new path should to be enabled

      enable_plugin(otherPath);
      load_plugin(otherPath);
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
  const path = file.get_path();
  const parent_path = file.get_parent().get_path();

  // if the parent itself changes
  // monitor_plugin_callback gets triggered with the plugin
  // directory path instead of a file path
  // in that case parent_path returns the ~/.config/plug instead of a ~/.config/plug/[plug-in]
  // but changes to the parent directories
  // are handled in a different callback

  // only reload if the path is a plugin directory
  if (plugins[parent_path])
  {
    // remove the timeout indicator
    plugins[parent_path].monitorTimeout = null;

    // reload plugin
    unload_plugin(parent_path);
    load_plugin(parent_path);
  }
  // however the timeout indicator
  // should always be removed
  else if (plugins[path])
  {
    // remove the timeout indicator
    plugins[path].monitorTimeout = null;
  }
}

/** replace invalid or missing properties from config
* to make sure GNOME does not catch fire
* @param { Config } config
*/
function valid_config(config)
{
  // default is no-interval
  if (typeof config.interval !== 'number')
    config.interval = -1;

  // if interval is higher than -1 but lower than 500ms
  // then force it to be 500ms
  if (config.interval > -1 && config.interval < 500)
    config.interval = 500;
  
  // default alignment
  if (config.alignment !== 'left' && config.alignment !== 'center' && config.alignment !== 'right')
    config.alignment = null;

  // default priority
  if (typeof config.priority !== 'number' || config.priority <= -1)
    config.priority = null;

  if (typeof config.main !== 'string')
    config.main = null;

  return config;
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

  if (!plugin)
    return;
  
  // stop monitoring the plugin directory

  // no need to stop the monitor timeout here
  // all disabled plugins are also unloaded first
  // and unload_plugins stops the timeout

  plugin.monitor.disconnect(plugin.monitorId);
  plugin.monitor.cancel();

  // if any process is running then kill it
  if (plugin.processId)
    killProcess(plugin.processId);

  // stop the process timeout
  if (plugin.processTimeout)
  {
    Mainloop.source_remove(plugin.processTimeout);

    plugin.processTimeout = null;
  }

  // destroy the plugin's button widget
  unrender_plugin(path);

  plugin.monitor =
  plugin.monitorId = null;

  plugins[path] = null;
}

/** loads the plugin config and executes the its code
* @param { string } path
*/
function load_plugin(path)
{
  if (!plugins[path])
    return;
    
  const configPath = [ path, 'plugin.json' ].join('/');

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
  if (!config || !config.execute)
    return;

  // if plugin is killed then ignore loading it
  // and if its button is render then destroy it
  if (config.killed)
  {
    unrender_plugin(path);

    return;
  }

  // validate the config object
  plugins[path].config = valid_config(config);

  // spawn the main file using the config.execute
  const pid = plugins[path].processId = spawnPlugin(path, config.execute, config.main, (output) =>
  {
    // to make sure nothing weird happened and
    // this function got called anyway
    if (
      !plugins[path] ||
      !plugins[path].processTimeout ||
      !plugins[path].config ||
      plugins[path].config.killed
    )
      return;
    
    // process is done, stop the process timeout

    Mainloop.source_remove(plugins[path].processTimeout);

    plugins[path].processTimeout = null;

    // render the plugin's widgets
    render_plugin(path, config, output);

    // run the plugin on a reload interval
    // if its config specify it
    if (config.interval > -1)
    {
      plugins[path].intervalTimeout = Mainloop.timeout_add(config.interval, () =>
      {
        // remove the timeout indicator
        plugins[path].intervalTimeout = null;

        // reload plugin

        unload_plugin(path);
        load_plugin(path);
      });
    }
  });

  // the process failed to spawn
  if (pid <= -1)
    return;
  
  // any process that takes longer than 5s to finish is killed
  plugins[path].processTimeout = Mainloop.timeout_add(5000, () =>
  {
    // remove the timeout indicators
    plugins[path].processId = plugins[path].processTimeout = null;

    // kill the plugin
    // killed plugins are disabled permanently until user manually enables them again
    kill_plugin(path, configPath, pid, config);
  });
}

/** unload the plugin config and destroys its button
* @param { string } path
*/
function unload_plugin(path)
{
  const plugin = plugins[path];

  if (!plugin)
    return;

  // the following timeout are canceled
  // because they purpose were to cause a reload
  // the fact that this function is called means
  // any current timeouts are unnecessary

  // if a monitor call is awaiting then cancel it
  if (plugin.monitorTimeout)
  {
    Mainloop.source_remove(plugin.monitorTimeout);

    plugin.monitorTimeout = null;
  }

  // stop any running reload intervals
  if (plugin.intervalTimeout)
  {
    Mainloop.source_remove(plugin.intervalTimeout);

    plugin.intervalTimeout = null;
  }

  // configs can change anytime through any plugin's lifetime
  // configs have properties that affect the rendering and functionality
  // of the plugin, meaning that they should be reloaded every cycle

  plugin.lastOutput = plugin.config = null;
}

/**
* @param { string } path
* @param { Config } config
* @param { string[] } output
*/
function render_plugin(path, config, output)
{
  if (!Array.isArray(output))
    output = [];

  const plugin = plugins[path];

  // handles no-output processes
  if (output.length <= 0 || !output[0])
  {
    unrender_plugin(path);

    return;
  }

  const id = path.split('/').pop();

  const currentOutput = output.join('');

  // create the plugin's button if it does not exists yet
  if (!plugin.button)
  {
    plugin.button = Button(`plug-in-${id}`, config.priority, config.alignment);
  }

  const button = plugin.button;
  
  // algin the button following the config specifications
  button.align(config.priority, config.alignment);

  // no changes occurred since last cycle
  // ignore re-render
  if (plugin.lastOutput && plugin.lastOutput === currentOutput)
    return;

  // update last output
  plugin.lastOutput = currentOutput;
  
  // render the panel label & icon

  const first = parseLine(output[0]);

  button.setLabel(first.text);

  button.setIcon(first.props.icon?.url || first.props.icon || null);

  button.setPress(first.props.press || null);

  // TODO expose clipboard
  // const clipboard = imports.gi.St.Clipboard.get_default();
  // button.setCallback(() => clipboard.set_text(1, 'this is a test to clipboard'));

  // render the panel menu

  // destroying the old menu
  plugin.button.clearMenu();

  // everything after the first output line
  output.slice(1).forEach((line) =>
  {
    line = parseLine(line);

    let widget;

    // Separator (no text and no props)
    if (!line.text && isEmpty(line.props))
    {
      widget = Separator();
    }
    // Label / Image
    else
    {
      widget = Label({
        ...line.props,
        text: line.text
      });
    }
  
    plugin.button.addMenuItem(widget);
  });
  
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

/**
* @param { string } path
*/
function unrender_plugin(path)
{
  // destroy the plugin's button widget
  plugins[path].button?.destroy();

  plugins[path].button = null;

  plugins[path].lastOutput = null;
}

/** disables a plugin permanently or until the user manually enables it again
* @param { string } path
* @param { number } pid
* @param { string } configPath
* @param { Config } config
*/
function kill_plugin(path, configPath, pid, config)
{
  // kill the process
  killProcess(pid);

  // unload plugin

  unrender_plugin(path);
  unload_plugin(path);
  
  // we won't disable the plugin because the user might want to enable it
  // and disabling it here will stop monitoring its directory, therefore
  // require the user to either reload the extension or the shell

  // this property causes the load_plugin function to ignore the plugin
  config.killed = true;

  // write the changes to disk
  GLib.file_set_contents(configPath, JSON.stringify(config, null, 2));
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

  // disable plugins

  Object.keys(plugins).forEach((path) =>
  {
    unload_plugin(path);
    disable_plugin(path);
  });

  plugins = null;
}

// exclude the unused required functions
// from the bundle tree-shaking process

global.exclude_from_treeshake = {
  init,
  enable,
  disable
};
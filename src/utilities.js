/* eslint-disable camelcase */

const { GLib, Gio } = imports.gi;

/** need a directory using GJS needlessly complicated api
* @param { string } dir
* @param { () => void } callback
*/
export function readDir(dir, callback)
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

export function isEmpty(obj)
{
  for (const prop in obj)
  {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(prop))
      return false;
  }

  return true;
}

/**
* @param { string } str
*/
export function parseLine(str)
{
  // match unescaped '|'
  const split = str.match(/(\\\||[^|])+/g);

  if (!split || split.length <= 0)
    return {
      text: '',
      props: {}
    };

  const text = split.shift()
    // replace escaped '\|'
    .replace('\\|', '|')
    .trim();

  if (split.length <= 0)
    return {
      text,
      props: {}
    };

  /**
  * @param { string[] } array
  */
  const parseProps = (array) =>
  {
    const props = {};

    try
    {
      array.forEach((prop) =>
      {
        prop = prop.trim();

        const first = prop.indexOf('(');
        const last = prop.lastIndexOf(')');

        if (prop.length <= 0)
          return;
    
        if (first > -1 && last > -1)
        {
          const key = prop.substring(0, first).trim();

          const value = prop.substring(first + 1, last).trim();
    
          // value string is not empty
          if (value.length >= 1)
          {
            const first = value.indexOf('{');
            const last = value.lastIndexOf('}');
  
            // if value has nested props
            if (first > -1 && last > -1)
            {
              // match unescaped ','
              const s = value.substring(first + 1, last).match(/(\\,|[^,])+/g);

              // eslint-disable-next-line security/detect-object-injection
              props[key] = parseProps(s);
            }
            else
            {
              // eslint-disable-next-line security/detect-object-injection
              props[key] = value
                // replace escaped '\|'and '\,'
                .replace('\\|', '|')
                .replace('\\,', ',')
                .trim();
            }
          }
          else
          {
            // eslint-disable-next-line security/detect-object-injection
            props[key] = true;
          }
        }
        else
        {
          // eslint-disable-next-line security/detect-object-injection
          props[prop] = true;
        }
      });
    }
    catch
    {
      return {};
    }

    return props;
  };

  const props = parseProps(split);

  return {
    text,
    props
  };
}

/**
* @param { string } path
* @param { import('.').Config } config
* @param { (output: string[]) => void } callback
*/
export function spawnPlugin(path, config, callback)
{
  const { execute, main } = config;

  const envp = GLib.get_environ();

  // pass the process some environment variables

  // push the config values to the process
  Object.keys(config).forEach((key) =>
  {
    // eslint-disable-next-line security/detect-object-injection
    envp.push(`PL_CONFIG_${key.toUpperCase()}=${config[key]}`);
  });

  try
  {
    // allows the execute command to have some arguments
    // if any are specified by the plugin
    let command = execute;

    // the main file is optional
    if (main)
    {
      // create an absolute path for the main file
      const absolute = [ path, main ].join('/');

      command = `${command} "${absolute}"`;
    }

    const pid = spawnWithCallback(null, [ 'bash', '-c', command ], envp, GLib.SpawnFlags.SEARCH_PATH, null, callback);

    return pid;
  }
  catch
  {
    return -1;
  }
}

/**
* @param { number } pid
*/
export function killProcess(pid)
{
  GLib.spawn_sync(null,  [ 'kill', pid.toString() ], null, GLib.SpawnFlags.SEARCH_PATH, null);
}

/**
* @param { string } command
*/
export function spawnAsync(command)
{
  GLib.spawn_async(null, [ 'bash', '-c', command ], null, GLib.SpawnFlags.SEARCH_PATH, null);
}

/** spawns a new process and awaits it death
* after the process is buried it emits the callback with the process' standard output
* origin: https://github.com/p-e-w/argos/blob/fcb475140bd9d0b4b95279ce56c4c28f36fb29d6/argos%40pew.worldwidemann.com/utilities.js#L247
*/
function spawnWithCallback(workingDirectory, argv, envp, flags, childSetup, callback)
{
  const [ success, pid, stdinFile, stdoutFile, stderrFile ] = GLib.spawn_async_with_pipes(
    workingDirectory, argv, envp, flags, childSetup);

  if (!success)
    return -1;

  GLib.close(stdinFile);
  GLib.close(stderrFile);

  const standardOutput = [];

  const stdoutStream = new Gio.DataInputStream({
    base_stream: new Gio.UnixInputStream({
      fd: stdoutFile
    })
  });

  processLine(stdoutStream, (output) =>
  {
    if (!output)
    {
      stdoutStream.close(null);
      
      callback(standardOutput);
    }
    else
    {
      standardOutput.push(output);
    }
  });

  return pid;
}

function processLine(stream, callback)
{
  stream.read_line_async(GLib.PRIORITY_LOW, null, (source, result) =>
  {
    try
    {
      const [ str ] = source.read_line_finish_utf8(result);

      // stop reading at the first empty line
      
      // My GNOME session crashes if it reads a line after an empty line
      // Bail out! GLib-GIO:ERROR:../glib/gio/gdatainputstream.c:978:g_data_input_stream_read_complete: assertion failed (bytes == read_length): (-1 == 2)

      // I don't know enough about GLib to fix that

      if (!str)
      {
        callback(null);
      }
      else
      {
        callback(str);
  
        processLine(source, callback);
      }
    }
    catch
    {
      callback(null);
    }
  });
}
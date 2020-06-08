/* eslint-disable camelcase */

const { GLib, Gio } = imports.gi;

const ByteArray = imports.byteArray;

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
  const split = str.match(/([^\\\][^|]|\\\|)+/g);

  if (split.length === 1)
    return {
      text: split[0],
      props: {}
    };

  const text = split.shift().trim();

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
        // replace escaped '\|' '\,' with normal '|' ','
        prop = prop
          .replace('\\|', '|')
          .replace('\\,', ',')
          .trim();

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
              const s = value.substring(first + 1, last).match(/([^\\\][^,]|\\,)+/g);

              // eslint-disable-next-line security/detect-object-injection
              props[key] = parseProps(s);
            }
            else
            {
              // eslint-disable-next-line security/detect-object-injection
              props[key] = value;
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
* @param { string } execute
* @param { string } main
* @param { (output: string[]) => void } callback
*/
export function spawnPlugin(path, execute, main, callback)
{
  const envp = GLib.get_environ();

  // pass the process some environment variables
  // envp.push("ARGOS_VERSION=2");
  // envp.push("ARGOS_MENU_OPEN=" + (this.menu.isOpen ? "true" : "false"));

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

  readStream(stdoutStream, (output) =>
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

function readStream(stream, callback)
{
  stream.read_line_async(GLib.PRIORITY_LOW, null, (source, result) =>
  {
    try
    {
      const [ line ] = source.read_line_finish(result);

      if (!line)
      {
        callback(null);
      }
      else
      {
        callback(ByteArray.toString(line));
  
        readStream(source, callback);
      }
    }
    catch
    {
      callback(null);
    }
  });
}
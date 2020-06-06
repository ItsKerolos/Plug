/* eslint-disable camelcase */

const { GLib, Gio } = imports.gi;

const ByteArray = imports.byteArray;

const propsRegex = /(\S+)(?::)(?!"|')(\S+)|(\S+)(?::'|")(.+)(?:'|")/g;

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

/**
* @param { string } line
*/
export function parseLine(line)
{
  const props = {};

  const text = line.replace(propsRegex, (match, $1, $2, $3, $4) =>
  {
    if ($1)
    {
      // eslint-disable-next-line security/detect-object-injection
      props[$1] = $2;

      return '';
    }
    else if ($3)
    {
      // eslint-disable-next-line security/detect-object-injection
      props[$3] = $4;

      return '';
    }
  // clean unnecessary white-space
  }).replace(/\s+/g, ' ').trim();

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
    const argv = [];

    // allows the execute command to have some arguments
    // if any are specified by the plugin
    execute.trim().split(' ').forEach((s) => argv.push(s));

    // the main file is optional
    if (main)
    {
      // create an absolute path for the main file
      argv.push([ path, main ].join('/'));
    }

    const pid = spawnWithCallback(null, argv, envp, GLib.SpawnFlags.SEARCH_PATH, null, callback);

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
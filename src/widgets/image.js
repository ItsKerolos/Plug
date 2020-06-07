/* eslint-disable camelcase */

const { St, Gio, GLib, GdkPixbuf } = imports.gi;

/**
* @param { { url: string, mode: 'icon' | 'image', width: number, height: number } } options
*/
export const Image = (options) =>
{
  // default settings

  const { width, height } = options;

  let { url, mode } = options;

  if (typeof options === 'string')
    url = options;

  mode = mode || 'icon';

  let is_file = url.startsWith('/');
  
  const box = new St.BoxLayout({
    style_class: 'image-box'
  });

  if (url.startsWith('https://') || url.startsWith('http://'))
  {
    const id = url.split('/').pop();

    // /home/[user]/.cache/[id] (probably)
    const path = [ GLib.get_home_dir(), '.cache', id ].join('/');

    const file = Gio.File.new_for_path(path);

    // if the url does not exist
    // then download it using curl
    if (!file.query_exists(null))
    {
      GLib.spawn_sync(null,  [ 'curl', '-o', path, url ], null, GLib.SpawnFlags.SEARCH_PATH, null);
    }

    // switch the url with the file path
    // and render it

    is_file = true;

    url = path;
  }

  // load image form file
  // with a custom size
  if (is_file && mode === 'image')
  {
    const icon_format = GdkPixbuf.Pixbuf.new_from_file(url);
    
    const size = Math.max(width || icon_format.width, height || icon_format.height);

    // using the Pixbuf here instead of the Gio.icon_new_for_string()
    // cause a wired issue with set_size
    // we have to settle for loading the same file twice
    const icon = St.TextureCache.get_default().load_gicon(null, Gio.icon_new_for_string(url), size, 1, 1);

    icon.set_size(width || icon_format.width, height || icon_format.height);

    box.add_child(icon);
  }
  // loads an icon (square-image)
  // from a file or a themed icon
  else
  {
    const icon =  new St.Icon({
      gicon: Gio.icon_new_for_string(url),
      icon_size: (mode === 'image') ? Math.max(width || 16, height || 16) : null,
      style_class: (mode === 'icon') ? 'popup-menu-icon' : null
    });

    box.add_child(icon);
  }

  return box;
};
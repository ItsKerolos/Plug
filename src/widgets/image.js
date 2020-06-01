/* eslint-disable camelcase */

const { St, Gio, GLib, GdkPixbuf } = imports.gi;

const { PopupMenuItem } = imports.ui.popupMenu;

/**
* @param { { url: string, mode: 'icon' | 'image', width: number, height: number, contain: boolean  } } param0
*/
export const Image = ({ url, mode, width, height, contain }) =>
{
  // default settings

  if (typeof contain !== 'boolean')
    contain = true;

  mode = mode || 'icon';

  let is_file = url.startsWith('/');
  
  const item = new PopupMenuItem('');

  let icon;

  if (url.startsWith('https://') || url.startsWith('http://'))
  {
    let id = url.split('/');

    id = id[id.length - 1];

    const path = GLib.build_filenamev([ GLib.get_home_dir(), '.cache', id ]);

    const file = Gio.File.new_for_path(path);

    // if the url does not exist
    // then download it using curl
    if (!file.query_exists(null))
      GLib.spawn_sync(null,  [ 'curl', '-o', path, url ], null, GLib.SpawnFlags.SEARCH_PATH, null);

    is_file = true;

    url = path;
  }

  // load image form file
  // with a custom size
  if (is_file && mode === 'image')
  {
    const icon_format = GdkPixbuf.Pixbuf.new_from_file(url);
    
    const size = Math.max(width || icon_format.width, height || icon_format.height);

    // using the Pixbuf here instead of the FileIcon returned by icon_new_for_string
    // cause a wired issue with set_size
    // we have to settle for loading the same file twice
    icon = St.TextureCache.get_default().load_gicon(null, Gio.icon_new_for_string(url), size, 1, 1);

    icon.set_size(width || icon_format.width, height || icon_format.height);
  }
  // loads an icon (square-image)
  // from a file or a themed icon
  else
  {
    icon =  new St.Icon({
      gicon: (is_file) ? Gio.icon_new_for_string(url) : new Gio.ThemedIcon({ name: url }),
      icon_size: (mode === 'image') ? Math.max(width || 16, height || 16) : null,
      style_class: (mode === 'icon') ? 'popup-menu-icon' : null
    });
  }

  if (contain)
  {
    item.add_child(icon);
  
    return item;
  }

  return icon;
};
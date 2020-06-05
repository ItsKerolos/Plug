/* eslint-disable camelcase */

const { main } = imports.ui;
const { St, Clutter } = imports.gi;

const PanelMenuButton = imports.ui.panelMenu.Button;

// now we can this the GNOME way
// by extending PanelMenu.Button registering a custom class
// and dealing with all the weird GObject stuff
// or we could just use the original widgets
// do everything inside a function then return the parent widget
// which is technically not any different
// but way easier to read and maintain and
// only uses acutal real EcmaScript

/**
* @typedef { Object } Button
* @property { (priority: number, alignment: string) => void } align
* @property { () => void } destroy
* @property { () => void } clearMenu
* @property { (item) => void } addMenuItem
* @property { (callback: Function) => void } setCallback
* @property { (icon: string) => void } setIcon
* @property { (text: string) => void } setLabel
*/

/**
* @param { string } id
* @param { number } priority
* @param { string } alignment
* @returns { Button }
*/
export const Button = (id, priority, alignment) =>
{
  // I have no idea what this (0.0) value is for
  // but GNOME will crash and burn without it
  const button = new PanelMenuButton(0.0);

  const box = new St.BoxLayout();

  const _icon =  new St.Icon({
    style_class: 'system-status-icon'
  });

  const _label = new St.Label({
    y_expand: true,
    y_align: Clutter.ActorAlign.CENTER
  });

  // button press callback signal id
  let pressSignalId;

  // keeping track of button menu items
  let items = [];

  // icon and label are hidden by default

  _icon.visible = false;
  _label.visible = false;

  // append the button widget to the panel

  let _priority = priority, _alignment = alignment;

  main.panel.addToStatusArea(id, button, priority, alignment);

  // this is called parenting

  box.add_child(_icon);
  box.add_child(_label);

  button.add_child(box);

  return {
    align: (priority, alignment) =>
    {
      // only cause a change if the button position changes
      if (alignment !== _alignment || priority !== _priority)
      {
        // the fact that we can do this
        // is probably an issue in GNOME
        // since normally addToStatusArea() refuses to override an id
        // but (statusArea[id] = null) makes GNOME forget the item ever existed
        // I'm going to use this while it works anyway
        // since I don't what to implement this with 200 lines instead
  
        // eslint-disable-next-line security/detect-object-injection
        main.panel.statusArea[id] = null;
        main.panel.addToStatusArea(id, button, priority, alignment);
  
        _alignment = alignment;
        _priority = priority;
      }
    },

    destroy: () => button.destroy(),

    clearMenu: () =>
    {
      // does the BoxLayout have a array that has those items already
      // because this is very ugly and annoying me
      items.forEach((item) =>
      {
        button.menu.box.remove_child(item);

        item.destroy();
      });

      items = [];
    },

    addMenuItem: (item) =>
    {
      items.push(item);

      button.menu.addMenuItem(item);
    },

    setCallback: (callback) =>
    {
      if (pressSignalId)
      {
        button.disconnect(pressSignalId);
    
        pressSignalId = null;
      }
    
      if (callback)
        pressSignalId = button.connect('button-press-event', callback);
    },

    setIcon: (icon) =>
    {
      _icon.visible = (icon) ? true : false;
      _icon.icon_name = icon;
    },

    setLabel: (text) =>
    {
      _label.visible = (text) ? true : false;
      _label.text = text;
    }
  };
};
// eslint-disable-next-line no-unused-vars
const { PopupSwitchMenuItem, PopupMenuItem } = imports.ui.popupMenu;

/**
* @param { { label: string, state: boolean } } param0
* @returns { PopupMenuItem }
*/
export const Toggle = ({ label, state }) =>
{
  const toggle = new PopupSwitchMenuItem(label, state);

  // toggle.connect('toggled', () => {
  //   connect(toggle);
  
  //   return true;
  // });
  
  return toggle;
};
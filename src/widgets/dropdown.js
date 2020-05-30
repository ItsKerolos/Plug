const { PopupSubMenuMenuItem } = imports.ui.popupMenu;

/**
* @param { { label: string, items: string[] } } param0
*/
export const Dropdown = ({ label, items }) =>
{
  const dropdown = new PopupSubMenuMenuItem(label);

  items?.forEach((s) => dropdown.menu.addAction(s));
  
  return dropdown;
};
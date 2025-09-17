export interface SidebarItem {
  label: string;
  icon?: string;
  route: string;
  titre: string;
  sousTitre?: string;
  children?: SidebarItem[];
}

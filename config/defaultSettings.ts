import type { ProLayoutProps } from "@ant-design/pro-components";

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: "light",
  colorPrimary: "#1890ff",
  layout: "mix",
  contentWidth: "Fluid",
  fixedHeader: false,
  fixSiderbar: true,
  pwa: true,
  logo: "https://www.svgrepo.com/show/462946/world.svg",
  token: {},
  splitMenus: true,
  title: "若木的小世界",
};

export default Settings;

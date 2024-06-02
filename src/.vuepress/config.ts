import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "molly notes",
  description: "一个vuepress-theme-hope的notes站",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});

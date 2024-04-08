import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "molly wiki",
  description: "一个vuepress-theme-hope的wiki站",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});

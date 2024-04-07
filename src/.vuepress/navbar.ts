import { navbar } from "vuepress-theme-hope";

export default navbar([
  '/',
  {
    text: "后端",
    icon: "ri:java-line",
    children: [
      {
        text: "Java",
        children: [
          { text: "JVM", icon: "/assets/icon/jvm.svg", link: "/BackEnd/Java/JVM/" },
          { text: "并发编程", icon: "/assets/icon/concurrent.svg", link: "/BackEnd/Java/Concurrent/" },
        ],
      },
      {
        text: "Lua",
        children: [
          { text: "Lua基础", icon: "/assets/icon/lua.svg", link: "/BackEnd/Lua/LuaBase/" },
        ],
      },
    ],
  },
  {
    text: "前端",
    icon: "devicon-plain:html5",
    children: [
      {
        text: "框架",
        children: [
          { text: "Vue2", icon: "/assets/icon/vue.svg", link: "/FrontEnd/Framework/Vue2/" },
        ],
      },
    ],
  },
  {
    text: "运维",
    icon: "grommet-icons:system",
    prefix: "/posts/",
    children: [
      {
        text: "操作系统",
        children: [
          { text: "Linux", icon: "/assets/icon/linux.svg", link: "1" },
          { text: "Windows", icon: "/assets/icon/windows.svg", link: "2" },
        ],
      },
      {
        text: "中间件",
        children: [
          { text: "MySQL", icon: "/assets/icon/mysql.svg", link: "1" },
        ],
      },
      {
        text: "云原生",
        children: [
          { text: "Docker", icon: "/assets/icon/docker.svg", link: "/DevOps/Cloud/Docker/" },
          { text: "Kubernetes", icon: "/assets/icon/k8s.svg", link: "/DevOps/Cloud/Kubernetes/" },
        ],
      },
    ],
  },
  {
    text: "基础",
    icon: "ic:baseline-balance",
    prefix: "/posts/",
    children: [

    ],
  },
  {
    text: "项目",
    icon: "octicon:project-16",
    prefix: "/posts/",
    children: [

    ],
  },
  {
    text: "随笔",
    icon: "icons8:idea",
    prefix: "/posts/",
    children: [

    ],
  },
  // {
  //   text: "博文",
  //   icon: "pen-to-square",
  //   prefix: "/posts/",
  //       children: [

  //     {
  //       text: "苹果",
  //       icon: "pen-to-square",
  //       prefix: "apple/",
  //       children: [
  //         { text: "苹果1", icon: "pen-to-square", link: "1" },
  //         { text: "苹果2", icon: "pen-to-square", link: "2" },
  //         "3",
  //         "4",
  //       ],
  //     },
  //     {
  //       text: "香蕉",
  //       icon: "pen-to-square",
  //       prefix: "banana/",
  //       children: [
  //         {
  //           text: "香蕉 1",
  //           icon: "pen-to-square",
  //           link: "1",
  //         },
  //         {
  //           text: "香蕉 2",
  //           icon: "pen-to-square",
  //           link: "2",
  //         },
  //         "3",
  //         "4",
  //       ],
  //     },
  //     { text: "樱桃", icon: "pen-to-square", link: "cherry" },
  //     { text: "火龙果", icon: "pen-to-square", link: "dragonfruit" },
  //     "tomato",
  //     "strawberry",
  //   ],
  // },
]);

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
      {
        text: "工程化",
        children: [
          { text: "包管理器", icon: "/assets/icon/vue.svg", link: "/FrontEnd/Engineering/PackageManager/" },
        ],
      },
    ],
  },
  {
    text: "运维",
    icon: "grommet-icons:system",
    children: [
      {
        text: "Linux",
        children: [
          { text: "Linux基础", icon: "/assets/icon/linux.svg", link: "/DevOps/Linux/Base/" },
          { text: "Bash编程", icon: "/assets/icon/bash.svg", link: "/DevOps/Linux/Bash/" },
          { text: "Ansible", icon: "/assets/icon/ansible.svg", link: "/DevOps/Linux/Ansible/" },
        ],
      },
      {
        text: "Windows",
        children: [
          { text: "批处理基础", icon: "/assets/icon/windows-bat.svg", link: "/DevOps/Windows/Bat/" },
        ],
      },
      {
        text: "中间件",
        children: [
          { text: "MySQL", icon: "/assets/icon/mysql.svg", link: "/DevOps/Middleware/MySQL/" },
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
    children: [
      {
        text: "底层",
        children: [
          { text: "计算机网络", icon: "/assets/icon/network.svg", link: "/Base/Network/" },
          { text: "操作系统", icon: "/assets/icon/os.svg", link: "1" },
        ],
      },
      {
        text: "数据结构与算法",
        children: [
          { text: "数据结构", icon: "/assets/icon/dataStructure.svg", link: "/Base/DataStructure/" },
          { text: "算法", icon: "/assets/icon/arithmetic.svg", link: "/Base/Algorithm/" },
        ],
      },
    ],
  },
  {
    text: "项目",
    icon: "octicon:project-16",
    children: [
      {
        text: "开发工具",
        children: [
          { text: "IntelliJ IDEA", icon: "/assets/icon/intellij-idea.svg", link: "/Development/DevTools/IntellijIdea/" },
          { text: "VSCode", icon: "/assets/icon/vscode.svg", link: "/Development/DevTools/VSCode/" },
        ],
      },
    ],
  },
  {
    text: "开发",
    icon: "fluent:window-dev-edit-16-regular",
    children: [
      
    ],
  },
  {
    text: "架构",
    icon: "fluent:box-search-16-regular",
    children: [
      {
        text: "云计算",
        children: [
          { text: "云原生", icon: "/assets/icon/cloud.svg", link: "/DevOps/Cloud/Docker/" },
        ],
      },
    ],
  },
  {
    text: "随笔",
    icon: "icons8:idea",
    children: [

    ],
  },
  {
    text: "ArchLinux",
    icon: "logos:archlinux",
    children: [

    ],
  },
]);

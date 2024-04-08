---
order: 2
date: 2024-04-08
---
# Java编程环境

## 安装插件

```shell
# java扩展包
Java Extension Pack
```

## 配置VSCode的jdk路径

```shell
# 输入Ctrl+shift+P，输入
Java: Configure Java Runtime

# 发现vscode插件更新要求安装jdk11以上版本
# 这是由于Language Support for JAVA插件在2020年7月22日更新到0.65.0预览版，不再支持jdk8。

# 解决方法：
# - 安装回0.64.1预览版及以前的版本
# - 禁用插件自动更新：在设置中搜索Extensions Auto Update，取消自动更新
# - 如果不想每次被提醒更新插件,可以搜索Extensions Auto Check Update取消自动更新检查，但在扩展设置中无法按安装另一个版本
```

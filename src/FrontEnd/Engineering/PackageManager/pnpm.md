---
order: 1
date: 2024-06-22
---
# pnpm

## 概述

[官方文档](https://pnpm.io/zh/motivation)

pnpm代表performance npm（高性能的npmn），同npm和yarn，都属于javascript包管理安装工具。它较npm和yarn在性能上得到很大提升，被称为快速地，节省磁盘空间的包管理工具。

优点：

- 快速：pnpm会将包缓存到本地，减少二次安装需要的时间。

- 节省磁盘空间：他会把包软链到项目本地，不需要反复安装。

- 节省网络带宽：同样的道理

- 更好的依赖处理逻辑

## pnpm-workspace 实践

在开发项目的过程中，需要在一个仓库中管理多个项目，每个项目有独立的依赖、脚手架，这种形式的项目结构我们称之为Monorepo，pnpm workspace就是管理这类项目的方案之一。

### 对比lerna+yarn

使用lerna+yarn组合，也可以实现Monorepo项目管理。但是相比来说，更推荐pnpm workspace来管理。当使用npm和yarn时如果你有100个项目使用了某个依赖，就会有100份该依赖的副本保存在硬盘上，而在使用pnpm时依赖会被存储在内容可寻址的存储中。

- 如果用到了某依赖项的不同版本，只会将不同版本间有差异的文件添加到仓库。 例如如果某个包有100个文件，而它的新版本只改变了其中1个文件。那么 pnpm update 时只会向存储中心额外添加1个新文件，而不会因为仅仅一个文件的改变复制整新版本包的内容。

- 所有文件都会存储在硬盘上的某一位置。 当软件包被安装时，包里的文件会硬链接到这一位置上对应的文件而不会占用额外的磁盘空间。 这允许你跨项目地共享同一版本的依赖。


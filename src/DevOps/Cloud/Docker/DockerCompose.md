---
order: 7
date: 2024-04-08
---
# Docker Compose

## 理解

部署和管理繁多的服务是困难的，而这正是 Docker Compose 要解决的问题。Docker Compose 并不是通过脚本和各种冗长的 docker 命令来将应用组件组织起来，而是通过一个声明式的配置文件描述整个应用，从而使用一条命令完成部署。应用部署成功后还可以通过一系列简单的命令实现对其完整声明周期的管理。甚至配置文件还可以置于版本控制系统中进行存储和管理

Docker Compose 的前身是 Fig，Fig 是一个基于 Docker 的 Python 工具，允许用户基于一个 YAML 文件定义多容器应用从而可以使用 fig 命令行工具进行应用的部署。Fig 还可以对应用的全生命周期进行管理。内部实现上，Fig 会解析 YAML 文件并通过 Docker API 进行应用的部署和管理。在 2014 年，Docker 公司收购了 Orchard 公司，并将 Fig 更名为 Docker Compose。命令行工具也从 fig 更名为 docker-compose，并自此成为绑定在 Docker 引擎之上的外部工具。虽然它从未完全集成到 Docker 引擎中但是仍然受到广泛关注并得到普遍使用。直至今日Docker Compose 仍然是一个需要在 Docker 主机上进行安装的外部 Python 工具。使用它时，首先编写定义多容器（多服务）应用的 YAML 文件，然后将其交由 docker-compose 命令处理，Docker Compose 就会基于 Docker 引擎 API 完成应用的部署。

## Linux安装Docker Compose

去github官网搜索 [docker-compose](https://github.com/docker/compose/releases/download/1.24.1/docker-compose-Linux-x86_64)

将下载的文件放入Linux的/usr/local下

```shell
# 1.将该文件的名字修改一下方便使用
mv docker-compose-Linux-x86_64 docker-compose
# 2.将它的权限设置为可执行文件
chmod 777 docker-compose
# 3.给/usr/local/bin设置一个环境变量（方便）
vim /etc/profile     # 添加：export PATH=/usr/local/bin:$PATH
# 4.把docker-compose放进/usr/local/bin
mv docker-compose bin/
source /etc/profile  # 再加载一下profile配置文件
# 5.测试是否安装成功
docker-compose --version

# 简单方式：直接下载并授权
curl -L "https://get.daocloud.io/docker/compose/releases/download/1.27.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

## yml配置文件

Doccker Compose 使用 YAML 文件来定义多服务的应用，YAML 是 JSON 的一个子集，因此也可以使用 JSON。Docker Compose 默认使用文件名 docker-compose.yml，当然也可以使用 -f 参数指定具体文件

compose 文件是一个定义服务、 网络和卷的 `YAML` 文件 。Compose 文件的默认路径是 `./docker-compose.yml `(可以是用` .yml` 或 `.yaml `作为文件扩展名)。服务定义包含应用于为该服务启动的每个容器的配置，就像传递命令行参数一样 `docker container create`。同样，网络和卷的定义类似于 `docker network create` 和 `docker volume create`。正如 `docker container create` 在 Dockerfile 指定选项，如 CMD、 EXPOSE、VOLUME、ENV，在默认情况下，你不需要再次指定它们docker-compose.yml。可以使用 Bash 类 ${VARIABLE} 语法在配置值中使用环境变量。

## 例-管理MySQL和Tomcat

编写 docker-compose.yml文件

```yml
version: '3.1'
services:
   mysql:            # 服务的名称
      restart: always   # 只要docker启动，那么这个容器就跟着一起启动
      image: daocloud.io/library/mysql:5.7.4 # 指定镜像的路径
      container_name: mysql #指定容器名称
      ports:
         - 3306:3306    #指定端口号的映射，可以指定多个
      environment: 
         MYSQL_ROOT_PASSWORD: 123456  #指定mysql的root用户登录密码
         TZ: Asia/Shanghai     #指定时区
      volumes:        #映射数据卷,注意，这些容器内的重要目录可以去DaoCloud上查看
         - /opt/docker_mysql_tomcat/mysqldata:/var/lib/mysql
   tomcat:
      restart: always
      image: daocloud.io/library/tomcat:8.5.15-jre8
      container_name: tomcat
      ports:
         - 8080:8080
      environment:
         TZ: Asia/Shanghai
      volumes:
         - /opt/docker_mysql_tomcat/tomcat_webapps:/usr/local/tomcat/webapps
         - /opt/docker_mysql_tomcat/tomcat_logs:/usr/local/tomcat/logs
```

运行 docker-compose.yml文件

```shell
cd /opt/
mkdir docker_mysql_tomcat
cd docker_mysql_tomcat/
vim docker-compose.yml
docker-compose up -d
```

## 使用docker-compose命令管理容器

在使用docker-compose命令时，默认会在当前目录下找docker-compose.yml文件

```shell
# 运行 docker-compose.yml文件
#   如果镜像不存在以下就会帮我们构建出镜像，如果镜像已经存在会直接运行这个自定义镜像
docker-compose up -d
#   已有镜像的情况下基于docker-compose.yml文件重新构建镜像
docker-compose build
#   运行前，重新构建镜像并运行
docker-compose up -d --build

# 关闭并删除容器
docker-compose down

# 开启或关闭或重启已经存在的由docker-compose维护的容器
docker-compose [stop|restart]

# 查看由docker-compose维护的容器
docker-compose ps

# 查看由docker-compose的容器的日志
docker-compose logs -f   # -f可以滚动

```

## Docker Compose配合Dockerfile使用

使用docker-compse.yml文件以及Dockerfile文件在生成自定义镜像的同时启动当前镜像，并且由docker-compose去管理容器

Dockerfile文件

```shell
FROM daocloud.io/library/tomcat:8.5.15-jre8
COPY MyBookStore.war /usr/local/tomcat/webapps
```

yml文件

```shell
version: '3.1'
services:
   mysql:
      restart: always
      image: daocloud.io/library/mysql:5.7.4
      container_name: mysql
      ports:
         - 3306:3306
      environment: 
         MYSQL_ROOT_PASSWORD: 123456
         TZ: Asia/Shanghai
      volumes:
         - /opt/docker_mysql_tomcat/mysql_data:/var/lib/mysql
         
   tomcat_bookstore:
      restart: always
      build:                             # 构建自定义镜像
         context: ../                    # 指定dockerfile文件的所在路径
         dockerfile: Dockerfile          # 指定dockerfile文件的名字
      image: tomcat_bookstore:1.0        # 使用构建出来的镜像并为其命名
      container_name: tomcat_bookstore   # 指定容器名称
      ports:
         - 8080:8080
      environment: 
         TZ: Asia/Shanghai
```
---
order: 6
date: 2024-04-08
---
# Golang编程环境

## Ubuntu20.04 安装Go

```shell
# 下载
wget https://dl.google.com/go/go1.15.3.linux-amd64.tar.gz

# 解压
sudo tar -C /usr/local -xzf go1.15.3.linux-amd64.tar.gz

# 建立软链接
sudo ln -s /usr/local/go/bin/* /usr/bin/

# 配置环境变量
# tip:
#   - 不同于其他语言，go中没有项目的说法，只有包, 其中有两个重要的路径，GOROOT 和 GOPATH
#   - GOROOT：GOROOT就是Go的安装目录，（类似于java的JDK）
#   - GOPATH：GOPATH是我们的工作空间,保存go项目代码和第三方依赖包
#   - GOPATH可以设置多个，其中第一个将会是默认的包目录
#   - 使用 go get 下载的包都会在第一个path中的src目录下
#   - 使用 go install时，在哪个GOPATH中找到了这个包，就会在哪个GOPATH下的bin目录生成可执行文件
# go环境
export GOPATH="/home/monap/Public/AppData/go;/home/monap/Public/VSCodeWorkSpace/GoProject"
export GOROOT="/usr/local/go"
export PATH="$PATH:$GOROOT/bin:/home/monap/Public/AppData/go/bin"
# 设置go代理
go env -w GO111MODULE=on
go env -w GOPROXY=https://goproxy.io,direct
```

## 插件安装

```shell
# Go插件
Go
```

## 配置Go辅助工具

```shell
# 打开输入框
Ctrl+Shift+P

# 输入(选择全都要，但是注意会安装失败！这一步目前没什么用看看就行。)
Go:Install/Update Tools
# 这是因为go的支持挂在国外，好在现在有go的代理

# 配置go代理的环境变量（进入goproxy.io网站有教程）
# 启用 go module，编译时忽略 GOPATH 和 vendor 文件夹，只根据 go.mod 下载文件
go env -w GO111MODULE=on
# 设置GOPROXY代理：
go env -w GOPROXY=https://goproxy.cn,direct

# 设置GOPRIVATE来跳过私有库，比如常用的Gitlab或Gitee，中间使用逗号分隔：
go env -w GOPRIVATE=*.gitlab.com,*.gitee.com

# 如果在运行go mod vendor时，提示Get https://sum.golang.org/lookup/xxxxxx: dial tcp 216.58.200.49:443: i/o timeout，则是因为Go 1.13设置了默认的GOSUMDB=sum.golang.org，这个网站是被墙了的，用于验证包的有效性，可以通过如下命令关闭：
go env -w GOSUMDB=off
```

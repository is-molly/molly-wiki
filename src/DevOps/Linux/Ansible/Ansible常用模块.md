---
order: 4
date: 2025-02-14
---

# Ansible 常用模块

> cammond、shell、raw、script模块不具备幂等性，建议尽量使用更安全有幂等性的专有模块，如copy等

## 常用模块介绍

ansible常用模块有：

- ping
- yum
- template
- copy
- user
- group
- service
- raw
- command
- shell
- script

ansible常用模块`raw`、`command`、`shell`的区别：

- shell模块调用的/bin/sh指令执行
- command模块不是调用的shell的指令，所以没有bash的环境变量
- raw很多地方和shell类似，更多的地方建议使用shell和command模块。但是如果是使用老版本python，需要用到raw，又或者是客户端是路由器，因为没有安装python模块，那就需要使用raw模块了

## ping 模块

ping模块用于检查指定节点机器是否连通，用法很简单，不涉及参数，主机如果在线，则回复pong。

```shell
[root@ansible ~]# ansible all -m ping
172.16.103.129 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

## command 模块

command模块用于在远程主机上执行命令，ansible默认就是使用command模块，使用时可忽略-m选项

command模块有一些缺陷

- 它不会通过shell处理命令，因此不支持像`$HOME`这样的变量和，以及`<`, `>`, `|`, `;`和`&`等都是无效的。也就是在`command`模块中无法使用管道符和重定向。

- 不具有幂等性

常用选项

|       名称       | 必选 | 备注                                                         |
| :--------------: | :--: | :----------------------------------------------------------- |
|      chdir       |  no  | 运行`command`命令前先`cd`到这个目录                          |
|     creates      |  no  | 如果这个参数对应的文件存在，就不运行command                  |
|    free_form     | yes  | 需要执行的脚本（没有真正的参数为`free_form`）                |
|    executable    |  no  | 改变用来执行命令的shell，应该是可执行文件的绝对路径。        |
|     removes      |  no  | 如果这个参数对应的文件不存在，就不运行command，与`creates`参数的作用相反 |
| stdin(2.4后新增) |  no  | 将命令的`stdin`设置为指定的值                                |

示例

```shell
## 查看受控主机的os-release
[root@localhost ~]# ansible 127.0.0.1 -m command -a 'chdir=/etc cat os-release'
[WARNING]: No inventory was parsed, only implicit localhost is available
127.0.0.1 | CHANGED | rc=0 >>
NAME="Rocky Linux"
VERSION="9.5 (Blue Onyx)"
ID="rocky"
...

## creates选项使用
[root@localhost ~]# ansible 127.0.0.1 -m command -a 'chdir=/etc creates=os-release cat os-release'
[WARNING]: No inventory was parsed, only implicit localhost is available
127.0.0.1 | SUCCESS | rc=0 >>
skipped, since os-release existsDid not run command since 'os-release' exists


## command模块不支持管道符，不支持重定向
[root@ansible ~]# ansible 172.16.103.129 -a "echo 'hello world' > /tmp/test"
172.16.103.129 | SUCCESS | rc=0 >>
hello world > /tmp/test

[root@ansible ~]# ansible 172.16.103.129 -a 'cat /tmp/test'
172.16.103.129 | SUCCESS | rc=0 >>

[root@ansible ~]# ansible 172.16.103.129 -a 'ps -ef|grep vsftpd'
172.16.103.129 | FAILED | rc=1 >>
error: unsupported SysV option

Usage:
 ps [options]

 Try 'ps --help <simple|list|output|threads|misc|all>'
  or 'ps --help <s|l|o|t|m|a>'
 for additional help text.

For more details see ps(1).non-zero return code
```

注意

- 若要通过shell运行一个命令，比如`<`, `>`, `|`等，你实际上需要`shell`模块。
- `command`模块更安全，因为它不受用户环境的影响
- 从版本2.4开始，`executable`参数被删除。如果您需要此参数，请改用shell模块。
- 对于Windows节点，请改用`win_command`模块。

## shell 模块

shell模块用于在受控机上执行受控机上的脚本，亦可直接在受控机上执行命令。

shell模块亦支持管道与重定向。让远程主机在shell进程下执行命令，从而支持shell的特性，如管道等。与`command`模块几乎相同，但在执行命令的时候使用的是`/bin/sh`。

command模块有一些缺陷

- 不具有幂等性

常用选项

|       名称       | 必选 | 备注                                                         |
| :--------------: | :--: | :----------------------------------------------------------- |
|      chdir       |  no  | 运行command命令前先cd到这个目录                              |
|     creates      |  no  | 如果这个参数对应的文件存在，就不运行command                  |
|    executable    |  no  | 改变用来执行命令的shell，应该是可执行文件的绝对路径。        |
|    free_form     | yes  | 需要执行的脚本（没有真正的参数为free_form）                  |
|     removes      |  no  | 如果这个参数对应的文件不存在，就不运行command，与creates参数的作用相反 |
| stdin(2.4后新增) |  no  | 将命令的stdin设置为指定的值                                  |

示例

```shell
## 查看受控机上的脚本
[root@localhost ~]# ll /scripts/
总用量 4
-rwxr-xr-x 1 root root 52 9月   7 22:49 test.sh


//使用shell模块在受控机上执行受控机上的脚本
[root@ansible ~]# ansible 172.16.103.129 -m shell -a '/bin/bash /scripts/test.sh &> /tmp/test'
172.16.103.129 | SUCCESS | rc=0 >>


[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'cat /tmp/test'
172.16.103.129 | SUCCESS | rc=0 >>
1
2
3
4
5
6
7
8
9
10
```

注意

- 如果你想安全可靠的执行命令，请使用`command`模块，这也是编写playbook的最佳实践。

## raw 模块

raw模块用于在远程主机上执行命令，其支持管道符与重定向。

`raw`模块主要用于执行一些低级的，脏的SSH命令，而不是通过`command`模块。 `raw`模块只适用于下列两种场景，第一种情况是在较老的（Python 2.4和之前的版本）主机上，另一种情况是对任何没有安装Python的设备（如路由器）。 在任何其他情况下，使用`shell`或`command`模块更为合适。

就像`script`模块一样，`raw`模块不需要远程系统上的python

command模块有一些缺陷

- 不具有幂等性

常用选项

| 名称       | 必选 | 备注                                                  |
| :--------- | :--- | :---------------------------------------------------- |
| executable | no   | 改变用来执行命令的shell，应该是可执行文件的绝对路径。 |
| free_form  | yes  | 需要执行的脚本（没有真正的参数为free_form）           |

示例

```shell
## 支持重定向
[root@ansible ~]# ansible 172.16.103.129 -m raw -a 'echo "hello world" > /tmp/test'
172.16.103.129 | SUCCESS | rc=0 >>
Shared connection to 172.16.103.129 closed.


[root@ansible ~]# ansible 172.16.103.129 -a 'cat /tmp/test'
172.16.103.129 | SUCCESS | rc=0 >>
hello world


## 支持管道符
[root@ansible ~]# ansible 172.16.103.129 -m raw -a 'cat /tmp/test|grep -Eo hello'
172.16.103.129 | SUCCESS | rc=0 >>
hello
Shared connection to 172.16.103.129 closed.
```

注意

- 如果要安全可靠地执行命令，最好使用`shell`或`command`模块来代替。
- 如果从playbook中使用raw，则可能需要使用`gather_facts: no`禁用事实收集

## script 模块

script模块用于在受控机上执行主控机上的脚本。

```shell
[root@ansible ~]# ll /etc/ansible/scripts/
总用量 4
-rw-r--r--. 1 root root 61 9月   8 18:59 a.sh
[root@ansible ~]# ansible 172.16.103.129 -m script -a '/etc/ansible/scripts/a.sh &>/tmp/a'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "rc": 0,
    "stderr": "Shared connection to 172.16.103.129 closed.\r\n",
    "stderr_lines": [
        "Shared connection to 172.16.103.129 closed."
    ],
    "stdout": "",
    "stdout_lines": []
}


## 查看受控机上的/tmp/a文件内容
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'cat /tmp/a'
172.16.103.129 | SUCCESS | rc=0 >>
root:x:0:0:root:/root:/bin/bash
....此处省略N行
jerry:x:1000:1000::/home/jerry:/bin/bash

## 由此可见确是在受控机上执行了主控机上的脚本，且输出记录到了受控机上。因为此处的jerry用户是在受控机上才有的用户
```

## copy 模块

功能：复制ansible服务器主控端或远程的本机的文件到远程主机

注意：src=file如果是没指明路径，则为当前目录或当前目录下的files目录下的file文件

常见选项

```shell
src        # 源文件路径，可以是主制端，也可以是被控端
dest       # 被控端的文件路径
owner      # 属主
group      # 属组
mode       # 权限
backup     # 是否备份
validate   # 验证成功才会执行copy
remote_src # no是默认值，表示src文件在ansible主机，yes表示src文件在远程主机
```

示例

```shell
# 如目标存在，默认覆盖，此处指定先备
ansible webservers -m copy -a"src=/root/testl.sh dest=/tmp/test2.sh owner=molly mode=600 backup=yes"

# 指定内容，直接生成目标文件
ansib1e webservers-m copy-a"content='hello 123456\nworld 654321\n' dest=/etc/rsync.pas owner=root group=root mode=0600"

# 复制/etc目录自身，注意/etc/后面没有/
ansible webservers -m copy -a"src=/etc dest=/backup"

# 复制/etc/下的文件，不包括/etc/目录自身，注意/etc/后面有/
ansible webservers -m copy -a "src=/etc/ dest=/backup"

# 复制/etc/suders，并校验语法，下面的%s表示src指定的文件名
ansible webservers -m copy -a"src=/etc/suders dest=/etc/sudoers.edit remote_src=yes validate=/usr/sbin/visudo -csf%s"
```

## get-url 模块

功能：用于将文件从http、https或ftp下载到被管理机节点上

常用参数如下：

```shell
ur1      # 下载文件的URL，支持HTTP，HTTPS或FTP协议
dest     # 下载到目标路径（绝对路径），如果目标是一个目录，就用原文件名，如果目标设置了名称就用目标设置的名称
owner    # 指定属主
group    # 指定属组
mode     # 指定权限
force    # 如果yes，dest不是目录，将每次下载文件，如果内容改变替换文件。如果no，则只有在目标不存在时才会下载
checksum # 对目标文件在下载后计算摘要，以确保其完整性
         # 示例：checksum="sha256:D98291AC[...]B6Dc7B97"，
         #      checksum="sha256:http://examp1e.com/path/sha256sum.txt"
ur1_username   # 用于HTTP基本认证的用户名。对于允许空密码的站点，此参数可以不使用ur1_password’
url_password   # 用于HTTp基本认证的密码。如果未指定url_username'参数，则不会使用url_password'参数
validate_certs # 如果“no"，SSL证书将不会被验证。适用于自签名证书在私有网站上使用
timeout        # URL请求的超时时间，秒为单位
```

范例：下载并MD5验证

```shell
[root@ansible ~]# ansible webservers -m get_url -a 'url=http://nginx.org/download/nginx-1.18.0.tar.gz dest=/usr/1oca1/src/nginx.tar.gz checksum="md5:b2d33d24d89b8b1f87ff5d251aa27eb8"
```

## Fetch模块
功能：从远程被控端主机提取文件至ansible的主控端，copy相反，目前不支持目录

常见选项

```shell
src  # 被控制端的源文件路径，只支持文件
dest # ansible控制端的目录路径
```

范例：

```shell
[root@ansible ~]# ansible al1 -m fetch -a 'src=/etc/redhat-release dest=/data/os'
```

## File模块
功能：设置文件属性，创建文件，目录和软链接等

常见选项

```shell
path        # 在被控端创建的路径，和dest、name是等价的
owner       # 属主
group       # 属组
mode        # 权限
state       # 状态
   # =touch      创建文件
   # =directory  创建目录
   # =absent     删除文件或目录
   # =1ink       软链接
   # =hard       硬链接
recurse     # yes表示递归授权，默认为no
```

范例：

```shell
# 创建空文件
ansible all -m file -a 'path=/data/test.txt state=touch'
ansible all -m file -a 'path=/data/test.txt state=absent'
ansible all -m file -a "path=/root/test.sh owner=molly mode=755"

# 创建目录
ansible all -m file -a "path=/data/mysql state=directory owner=mysql group=mysq1"

# 创建软链接
ansible all -m file -a 'src=/data/testfilepath|dest|name=/data/testfile-1ink state=link'

# 创建目录
ansible all -m file -a 'path=/data/testdir state=directory'

# 递归修改目录属性，但不递归至子目录
ansible al1 -m file -a "path=/data/mysqlstate=directory owner=mysql group=mysq1"

# 递归修改目录及子目录的属性
ansible al1 -m file -a "path=/data/mysq1 state=directory owner=mysql group=mysql recurse=yes"
```

## stat模块
功能：检查文件或文件系统的状态

> 注意：对于Windows目标，请改用win_stat模块

常见选项

```shell
path  # 文件/对象的完整路径（必须）
```

 常用的返回值判断

```shell
exists # 判断是否存在
isuid  # 调用用户的ID与所有者ID是否匹配
```

范例：

```shell
[root@localhost ~]#  ansible 127.0.0.1 -m stat -a 'path=/etc/passwd'
127.0.0.1 | SUCCESS => {
    "changed": false,
    "stat": {
        "atime": 1745153332.19,
        "attr_flags": "",
        "attributes": [],
        "block_size": 4096,
        "blocks": 8,
        "charset": "us-ascii",
        "checksum": "d7f6bf2deb1a5dac3f8dddf7b1c15aaaeea6f352",
        "ctime": 1739895468.0020506,
        "dev": 64768,
        "device_type": 0,
        "executable": false,
        "exists": true,
        "gid": 0,
        "gr_name": "root",
        "inode": 67977037,
        "isblk": false,
        "ischr": false,
        "isdir": false,
        "isfifo": false,
        "isgid": false,
        "islnk": false,
        "isreg": true,
        "issock": false,
        "isuid": false,
        "mimetype": "text/plain",
        "mode": "0644",
        "mtime": 1739895468.0020506,
        "nlink": 1,
        "path": "/etc/passwd",
        "pw_name": "root",
        "readable": true,
        "rgrp": true,
        "roth": true,
        "rusr": true,
        "size": 943,
        "uid": 0,
        "version": "1080861025",
        "wgrp": false,
        "woth": false,
        "writeable": true,
        "wusr": true,
        "xgrp": false,
        "xoth": false,
        "xusr": false
    }
}
```

范例-playbook中应用

```yaml
- name: install | Check if file is already configured.
  stat: 
    path: "{{ nginx_file_path }}"
  connection: local
  register: nginx_file_result
- name: insta11 | Download nginx file
  get_url: 
    url: "{{ nginx_file_url }}" 
    dest: "{{ software_files_path }}" 
    validate_certs: no
  connection: local
  when: not nginx_file_result.stat.exists
```

## unarchive模块

功能：解包解压缩

实现有两种用法：

- 将ansible主机上的压缩包传到远程主机后解压缩至特定目录，设置remote_src=no，此为默认值，可省略
- 将远程本主机上或非ansible的其它主机的某个压缩包解压缩到远程主机本机的指定路径下，需要设置remote_src=yes

常见参数

```shell
remote_src   # 和copy功能一样且选项互斥，yes表示源文件在远程被控主机或其它非ansible的其它主机上，
             # no表示文件在ansible主机上，默认值为no，此选项代替copy选项
             
copy         # 默认为yes，当copy=yes，拷贝的文件是从ansible主机复制到远程主机上，
             # 如果设置为copy=no，会在远程主机上寻找src源文件，此选项已废弃
             
src          # 源路径，可以是ansible主机上的路径，也可以是远程主机（被管理端或者第三方主机）上的路径，
             # 如果是远程主机上的路径，则需要设置remote_src=yes
             
dest         # 远程主机上的目标路径

owner        # 默认递归

group        # 默认递归

mode         # 设置解压缩后的文件权限，默认递归

creates=/path/file # 当绝对路径/path/file不存在时才会执行
```

  范例：

```shell
ansible all -m unarchive -a 'src=/data/foo.tgz dest=/var/lib/foo owner=molly group=bin'

ansible all -m unarchive -a 'src=/tmp/foo.zip dest=/data copy=no mode=0777'

ansible all -m unarchive -a 'src=https://example.com/example.zip dest=/data remote_src=yes'

ansib1e a11 -m unarchive -a 'src=https://nginx.org/download/nginx-1.20.2.tar.gz dest=/data remote_src=yes owner=molly group=molly'

ansible webservers -m unarchive -a 'src=https://releases.ansib1e.com/ansib1e/ansib1e-2.1.6.0-0.1.rc1.tar.gz dest=/data/owner=root remote_src=yes'
```

## archive 模块
功能：打包压缩保存在被管理节点

常见选项

```shell
path    # 压缩的文件或目录
dest    # 压缩后的文件
format  # 压缩格式，支持gz，bz2，xz，tar，zip
```

范例

```shell
ansible webservers -m archive -a 'path=/var/1og/dest=/data/1og.tar.bz2 format=bz2 owner=molly mode=0600'
```

## hostname 模块

功能：管理主机名

常见选项

```shell
name  # 修改后的主机名称
```

范例：

```shell
ansib1e 10.0.0.18 -m hostname -a 'name=node18.molly.org'
```

范例：Ubuntu20.04的ansible不支持rocky，修改源码实现支持

```shell
[root@ubuntu2004~]# vim /usr/1ib/python3/dist-packages/ansible/modules/system/hostname.py
725 class RaspbianHostname(Hostname):
726 platform ='Linux'
727 distribution ='Rocky
728 strategy_class = RedHatstrategy
```

## cron 模块

功能：计划任务

支持时间：minute，hour，day，month，weekday

常见选项

```shell
name      # 描述脚本的作用
minute    # 分钟
hour      # 小时
weekday   # 周
user      # 任务由哪个用户运行；默认root
job       # 任务
```

范例：

```shell
# 备份数据库脚本
[root@centos8~]#cat/root/mysq]_backup.sh
#！/bin/bash
mysq1dump -A -F --single-transaction --master-data=2 -q -uroot | gzip > /data/mysql_`date +%F_%T`.sql.gz

# 创建任务
ansib1e 10.0.0.8 -m cron -a 'hour=2 minute=30 weekday=1-5 name="backup mysq1" job=/root/mysq1_backup.sh'

ansible webservers -m cron -a "minute=*/5 job='/usr/sbin/ntpdate ntp.aliyun.com &>/dev/nul1' name=Synctime"

# 禁用计划任务
ansible webservers -m cron -a "minute=*/5 job='/usr/sbin/ntpdate 172.20.0.1 &>/dev/nu11' name=Synctime disabled=yes"

# 启用计划任务
ansible webservers -m cron -a "minute=*/5 job='/usr/sbin/ntpdate 172.20.0.1 &>/dev/nu11' name=Synctime disabled=no"

# 删除任务
ansible webservers -m cron -a "name='backup mysql' state=absent"
ansible webservers -m cron -a 'state=absent name=Synctime'
```

## yum & apt 模块

功能：管理软件包

- yum模块管理软件包，只支持RHEL，CentOS，Fedora
- apt模块管理软件包，支持Debian，Ubuntu

yum和apt常见选项

```shell
  name          # 软件包名称
  state         # 状态
     # =present      安装，此为默认值
     # =absent       删除
     # =latest       最新版
  list          # 列出指定包
  enablerepo    # 启用哪个仓库安装
  disablerepo   # 不使用哪些仓库的包
  exclude       # 排除指定的包
  validate      # 是否检验，默认为yes
```

范例

```shell
ansible webserver -m yum -a "name=httpd state=present"
```

## yum_repository 模块

功能：此模块实现yum的仓库配置管理

常见选项

```shell
name           # 仓库id
description    # 仓库描述名称，对应配置文件中的name=
baseur]        # 仓库的地址
gpgcheck       # 验证开启
gpgkey         # 仓库公钥路径
state
```

范例：安装ZabbixAgent

```shell
[root@ansible ~]# ansible 10.0.0.8 -m yum_repository -a 'name=zabbix description="zabbix repo" baseur1="https://mirrors.aliyun.com/zabbix/zabbix/6.0/rhe1/Sreleasever/Sbasearch/"gpgcheck=no'

[root@ansib1e~]# ansib1e 10.0.0.8 -m yum -a 'name=zabbix-agent2'
```

范例：

```shell
ansible webservers -m yum_repository -a 'name=ansible_nginx description="nginx repo" baseurl="http://nginx.org/packages/centos/$releasever/Sbasearch/"gpgcheck=yes gpgkey="https://nginx.org/keys/nginx_signing.key""

[root@rocky8~]#cat /etc/yum.repos.d/ansible_nginx.repo
[ansible_nginx]
baseurl = http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck = 1
gpgkey = https://nginx.org/keys/nginx_signing.key
name = nginx repo
```

## apt_repository模块

功能：此模块实现apt的仓库配置管理

常见选项

```shell
repo         # 仓库信息
state        # 添加或删除
update_cache # 是否aptupdate，默认yes
filename     # 仓库文件，默认放在/etc/apt/sources.list.d/file.1ist
```

范例：

```shell
ansible ubuntu-servers -m apt_repository -a 'repo="deb http://archive.canonical.com/ubuntu focal partner" filename=google-chrome'

[root@ubuntu2004~]# cat/etc/apt/sources.list.d/google-chrome.list
deb http://archive.canonical.com/ubuntu focal partner
```

## apt_key模块

功能：添加和删除apt key

常见选项

```shell
ur1    # key路径
state  # 添加或删除
```

范例：生成ceph仓库配置

```shell
# 先导入key，注意先后顺序
ansible ubuntu-servers -m apt_key -a 'url=https://download.ceph.com/keys/release.asc state=present'

# 再生成apt配置，如果不导入key此步会出错
ansible ubuntu-servers -m apt_repository -a 'repo="deb http://mirror.tuna.tsinghua.edu.cn/ceph/debian-pacific focal main" filename=ansible_ceph'

# 验证结果
[root@ubuntu2004~]# cat/etc/apt/sources.1ist.d/ansible_ceph.1ist
deb http://mirror.tuna.tsinghua.edu.cn/ceph/debian-pacific focal main
```

## service 模块

此模块和sytemd功能相似，选项很多相同

功能：管理服务

常见选项

```shell
name        # 服务名称
state       # 服务状态
   # =started     启动
   # =stopped     停止
   # =restarted   重启
   # =reloaded    重载
enabled       # 开启自启动
daemon_reload # 加载新的配置文件，适用于systemd模块
```

范例

```shell
ansible all -m service -a 'name=httpd state=started enabled=yes'
ansible all -m service -a 'name=httpd state=stopped’
ansible all -m service -a 'name=httpd state=reloaded’
ansible all -m she1l -a "sed -i's/^Listen 80/Listen 8080/' /etc/httpd/conf/httpd.conf"
ansible all -m service -a'name=httpd state=restarted'

## 重启动指定网卡服务
ansible all -m service -a 'name=network state=absent args=eth0

## 查看受控机上的vsftpd服务是否启动
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'systemctl is-active vsftpd'
172.16.103.129 | FAILED | rc=3 >>
unknownnon-zero return code

## 启动受控机上的vsftpd服务
[root@ansible ~]# ansible 172.16.103.129 -m service -a 'name=vsftpd state=started'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "name": "vsftpd",
    "state": "started",
    "status": {
        "ActiveEnterTimestampMonotonic": "0",
        ....此处省略N行
}

## 查看受控机上的vsftpd服务是否启动
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'systemctl is-active vsftpd'
172.16.103.129 | SUCCESS | rc=0 >>
active


## 查看受控机上的vsftpd服务是否开机自动启动
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'systemctl is-enabled vsftpd'
172.16.103.129 | FAILED | rc=1 >>
disablednon-zero return code

## 设置受控机上的vsftpd服务开机自动启动
[root@ansible ~]# ansible 172.16.103.129 -m service -a 'name=vsftpd enabled=yes'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "enabled": true,
    "name": "vsftpd",
    "status": {
        "ActiveEnterTimestamp": "六 2018-09-08 00:02:39 EDT",
        ....此处省略N行
}

## 查看受控机上的vsftpd服务是否开机自动启动
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'systemctl is-enabled vsftpd'
172.16.103.129 | SUCCESS | rc=0 >>
enabled


## 停止受控机上的vsftpd服务
[root@ansible ~]# ansible 172.16.103.129 -m service -a 'name=vsftpd state=stopped'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "name": "vsftpd",
    "state": "stopped",
    "status": {
        "ActiveEnterTimestamp": "六 2018-09-08 00:02:39 EDT",
        ....此处省略N行
}
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'systemctl is-active vsftpd'
172.16.103.129 | FAILED | rc=3 >>
inactivenon-zero return code

[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'ss -antl'
172.16.103.129 | SUCCESS | rc=0 >>
State      Recv-Q Send-Q Local Address:Port               Peer Address:Port
LISTEN     0      128          *:22                       *:*
LISTEN     0      100    127.0.0.1:25                       *:*
LISTEN     0      128         :::22                      :::*
LISTEN     0      100        ::1:25                      :::*
```

## group 模块

功能：管理组

常见选项

```shell
name      # 指定组名称
gid       # 指定gid
state
    # =present 创建，默认
    # =absent  删除
system    # 是否是系统组
```

范例

```shell
# 创建组
ansible webservers -m group -a 'name=nginx gid=88 system=yes'
# 删除组
ansible webservers -m group -a 'name=nginx state=absent'
```

## user 模块

功能：管理用户

常见选项

```shell
name        # 创建的名称
uid         # 指定uid
group       # 指定基本组
she11       # 登录she11类型默认/bin/bash
create_home # 是否创建家目录，默认会创建家目录，no不创建
password    # 设定对应的密码，必须是加密后的字符串才行，否则不生效
system      # yes表示系统用户
groups      # 附加组
append      # 追加附加组使用，yes表示增加新的附加组
state       # absent删除
remove      # yes表示删除用户时将家目录一起删除
generate_ssh_key   # 创建私钥
ssh_keyu_bits      # 私钥位数
ssh_key_file       # 私钥文件路径
```

范例：

```shell
# 创建用户
ansible all -m user -a 'name=user1 comment="test user" uid=2048 home=/app/user1 group=root'
ansib1e a11 -m user -a 'name=nginx comment=nginx uid=88 group=nginx groups="root,daemon" she1l=/sbin/nologin system=yes create_home=no home=/data/nginx non_unique=yes'

# remove=yes 表示删除用户及家目录等数据，默认remove=no
ansible all -m user -a 'name=nginx state=absent remove=yes'

# 生成123456加密的密码
ansib1e localhost -m debug -a "msg={{ '123456' | password_hash('sha512', 'salt')}}"
localhost| SUCCESS => {
  "msg":"$6$sa1t$MktMKPZJ6t59GfxcJU20DwcwQzfMvo1HFVZioVD71w."
}

# 用上面创建的密码创建用户
ansible webservers -m user -a 'name=www group=www system=yes shell=/sbin/nlogin password="$6$saltSMktMKPZJ6t59GfxcJU20DwcwQzfMvo1HFVzioVD71w."'

# 创建用户test，并生成4096bit的私钥
ansible webservers -m user -a 'name=test generate_ssh_key=yes ssh_key_bits=4096 ssh_key_file=.ssh/id_rsa'
```

## lineinfile 模块

> 注意：如果想进行多行匹配进行替换的话需要使用replace模块

ansible在使用sed进行替换时，经常会遇到需要转义的问题，而且ansible在遇到特殊符号进行替换时，会存在问题，无法正常进行替换

ansible自身提供了两个模块：lineinfile模块和replace模块，可以方便的进行替换

一般在ansible当中去修改某个文件的单行进行替换的时候需要使用lineinfile模块

功能：相当于sed，主要用于修改一行的文件内容

常见选项

```shell
path         # 被控端文件的路径
regexp       # 正则匹配语法格式，表示被替换的内容
line         # 替换为的内容
state        # absent表示删除
insertafter  # 插入到替换内容前面，如和regexp同时存在，只在没找到与regexp匹配时才使用insertafter
insertbefore # 插入到替换内容后面，如和regexp同时存在，只在没找到与regexp匹配时才使用insertafter
backrefs     # 支持后面引用，yes和no
backup       # 修改前先备份
create       # 如果文件不存在，则创建，默认不存在会出错
mode         # 指定权限
owner        # 指定用户
group        # 指定组

# 注意  
# regexp参数：使用正则表达式匹配对应的行，当替换文本时，如果有多行文本都能被匹配，则只有最后面被匹配到的那行文本才会被替换，当删除文本时，如果有多行文本都能被匹配，这么这些行都会被删除。
```

范例

```shell
# 修改监听端口
ansible webservers -m lineinfile -a "path=/etc/httpd/conf/httpd.conf regexp='ΛListen' line='Listen 8080*'"

# 修改SELinux
ansible all -m lineinfile -a "path=/etc/selinux/config regexp='^SELINUX=' line='SELINUX=disabled"

# 添加网关
ansible webservers -m lineinfile -a 'path=/etc/sysconfig/network-scripts/ifcfg-etho line="GATEWAY=10.0.0.254""

# 给主机增加一个网关，但需要增加到NAME=下面
ansible webservers-m lineinfile-a'path=/etc/sysconfig/network-scripts/ifcfg-etho insertafter="^NAME="
1ine="GATEWAY=10.0.0.254"'
# 效果如下
cat/etc/sysconfig/network-scripts/ifcfg-etho
DEVICE=etho
NAME=etho
GATEWAY=10.0.0.254


# 给主机增加一个网关，但需要增加到NAME=上面
ansible webservers -m lineinfile -a 'path=/etc/sysconfig/network-scripts/ifcfg-etho insertbefore="^NAME=" 1ine="GATEWAY=10.0.0.254"'
# 效果如下
cat/etc/sysconfig/network-scripts/ifcfg-etho
DEVICE=etho
GATEWAY=10.0.0.254I
NAME=etho

# 删除网关
ansible webservers -m lineinfile -a 'path=/etc/sysconfig/network-scripts/ifcfg-etho regexp="^GATEWAY" state=absent'

# 删除#开头的行
ansible all -m lineinfile -a 'dest=/etc/fstab state=absent regexp="∧#"'
```

## replace模块

该模块有点类似于sed命令，主要也是基于正则进行匹配和替换，建议使用

功能：多行修改替换

常见选项

```shell
path      # 被控端文件的路径
regexp    # 正则匹配语法格式，表示被替换的内容
replace   # 替换为的内容
after     # 插入到替换内容前面
before    # 插入到替换内容后面
backup    # 修改前先备份
mode      # 指定权限
owner     # 指定用户
group     # 指定组
```

范例：

```shell
ansible all -m replace -a "path=/etc/fstab regexp='^(UUID.*)' replace='#\1'"
ansible all -m replace -a "path=/etc/fstab regexp='^#(UUID.*)' replace='\1*'"
```

## selinux模块

功能：该模块管理SELInux策略

常见选项

```shell
policy    # 指定SELINUXTYPE=targeted
state     # 指定SELINUX=disab1ed
```

范例：

```shell
[root@ansible~]# ansible 10.0.0.8 -m selinux -a 'state=disabled'
[WARNING]:SELinux state temporarily changed from 'enforcing' to 'permissive'. State change will take effect next reboot.
10.0.0.8 | CHANGED => {
  "ansible_facts":{
      "discovered_interpreter_python":"/usr/libexec/platform-python"
  },
  "changed": true,
  "configfile": "/etc/selinux/config",
  "msg": "config SELinux state changed from‘enforcing'to'disabled'",
  "policy":"targeted",
  "reboot_required": true,
  "state":"disabled"
}

[root@centos8~]# grep -v '#' /etc/selinux/config
SELINUX=disabled
SELINUXTYPE=targeted

[root@centos8~]# getenforce
Permissive
```

## mount模块

功能：挂载和卸载文件系统

常见选项

```shell
src         # 源设备路径，或网络地址
path        # 挂载至本地哪个路径下
fstype      # 设备类型；nfs
opts        # 挂载的选项
state       # 挂载还是卸载
    # =present    永久挂载，但没有立即生效
    # =absent     卸载临时挂载，并删除永久挂载
    # =mounted    永久和临时挂载
    # =unmounted  临时卸载
```

范例：

```shell
# 修改fstab文件永久挂载，但不立即生效
mount webservers -m mount -a 'src="UUID=b3e48f45-f933-4c8e-a700-22a159ec9077" path=/home fstype=xfs opts=noatime state=present'

# 临时取消挂载
mount webservers -m mount -a 'path=/home fstype=xfs opts=noatime state=unmounted'

# 永久挂载，并立即生效
ansible webservers -m mount -a 'src=10.0.0.8:/data/wordpress path=/var/www/htm1/wp-content/up1oads opts="_netdev" state=mounted'

# 永久卸载，并立即生效
ansible webservers -m mount -a 'src=10.0.0.8:/data/wordpress path=/var/www/htm1/wp-content/up1oads fstype=nfs state=absent'
```

## reboot 模块

功能：重启

常见选项

```shell
msg                # 重启提示
pre_reboot_delay   # 重启前延迟时间的秒数
post_reboot_delay  # 重启后延迟时间的秒数后，再验证系统正常启动
reboot_timeout     # 重启后延迟时间再执行测试成功与否的命令
test_command       # 执行测试成功与否的命令
```

范例：

```shell
[root@ansible ~]# ansible webservers -m reboot -a 'msg="host will be reboot'"
```

## setup模块

功能：setup模块来收集主机的系统信息，这些facts信息可以直接以变量的形式使用，但是如果主机较多，会影响执行速度。可以使用 `gather_facts：no` 来禁止Ansible收集facts信息

常见选项

```shell
filter    # 指定过滤条件
```

范例：

```shell
ansible all -m setup
ansible all -m setup -a "filter=ansible_nodename
ansible all -m setup -a "filter=ansible_hostname"
ansible all -m setup -a "filter=ansible_domain"
ansible all -m setup -a "filter=ansible_memtotal_mb"
ansible all -m setup -a "filter=ansible_memory_mb"
ansible all -m setup -a "filter=ansible_memfree_mb"
ansible all -m setup -a "filter=ansible_os_family"
ansible all -m setup -a "filter=ansible_distribution"
ansible all -m setup -a "filter=ansible_distribution_major_version"
ansible all -m setup -a "filter=ansible_distribution_version"
ansible all -m setup -a "filter=ansible_processor_vcpus""
ansible all -m setup -a "filter=ansible_al1_ipv4_addresses'
ansible all -m setup -a "filter=ansible_architecture"
ansible all -m setup -a "filter=ansible_uptime_seconds"
ansible al1 -m setup -a "filter=ansible_processor"
ansible al1 -m setup -a "filter=ansible_env"
```

范例：

```shell
[root@ansible~]# ansible all -m setup -a 'filter=ansible_python_version'
10.0.0.7 | SUCCESS => {
  "ansible_facts":{
     "ansible_python_version": "2.7.5",
     "discovered_interpreter_python": "/usr/bin/python"
  },
  "changed":false
}
```

## debug 模块

功能：此模块可以用于输出信息，并且通过msg定制输出的信息内容，功能类似于echo命令

注意：msg后面的变量有时需要加""引起来

常见选项

```shell
msg         # 指定命令输出的信息
var         # 指定变量名，和msg互斥
verbosity   # 详细度
```

范例：debug模块默认输出Helloworld

```shell
[root@ansible ~]# ansible 10.0.0.18 -m debug
10.0.0.18 | SUCCESS => {
  "msg": "Hello world!""
}

[root@ansible ansible]# cat debug.yml
---
- hosts: webservers
  tasks:
    name: output Hell1o world
    debug:
    
# 默认没有指定msg，默认输出 "He1loworld！"
[root@ansible ansible]# ansible-playbook debug.ym1
```

范例：利用debug输出shel命令的执行结果

```shell
[root@ansible ansible]# cat debug.yml
---
- hosts: webservers
  remote_user: root
  tasks:
  - name: echo hello
    she11:
      cmd: echo he1lo
    register:
      result
  - name: Display all variables/factsknown for a host
    debug:
      msg: "{{ result.stdout }}"
```

## sysctl模块

功能：修改内核参数

常见选项

```shell
name       # 内核参数
value      # 指定值
state      # 是否保存在sysctl.conf文件中，默认present
sysctl_set # 使用sysctl-w验证值生效
```

范例：

```shell
ansible webservers -m sysctl -a 'name=net.ipv4.ip_forward value=1 state=present'
```

范例：内核参数优化

```shell
- name: Change Port Range
  sysct1:
    name: net.ipv4.ip_1oca1_port_range
    value:'1024 65000'
    sysctl_set: yes
```

## pam_limits模块

功能：管理资源限制

范例：

```shell
- name: ChangeLimit/etc/security/limit.conf
  pam_limits:
    domain: "*"
    1imit_type: "{{ item.limit_type }}"
    limit_item: "{{ item.limit_item }}"
    value: "{{ item.value }}"
  1oop:
    - { limit_type: 'soft', limit_item: 'nofile', value: '100000' }
    - { limit_type: 'hard', limit_item: 'nofile', value: '10000' }
```

## Assert 模块

功能：[assert模块](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html#) 是用来断言playbook中给定的表达式。当表达式成功或失败时输出一些信息，帮助进行调试。

常见选项

| 参数        | 类型    | 默认值 | 说明                                           |
| ----------- | ------- | ------ | ---------------------------------------------- |
| fail_msg    | string  |        | 用于失败断言的自定义消息                       |
| success_msg | string  |        | 用于成功断言的自定义消息                       |
| that        | list    |        | 可以传递给when语句的相同形式的字符串表达式列表 |
| quiet       | boolean | false  | 将此设置为true以避免冗长的输出                 |

范例

```yaml
- name: 验证变量
  assert:
    that:
      - env.java.home is defined
      - env.java.home | length > 0
    fail_msg: "env.java.home 变量未定义或为空"
    success_msg: "变量存在: {{ env.java.home }}
```

## 其他模块

ansible还提供了针对各种应用的模块，比如

```shell
nginx_status_info
nginx_status_facts
mysq1_db           # 需要安装MySQL-python包
mysq1_user         # 需要安装MysQL-python包
redis
mongodb
postgresql
haproxy
git
```


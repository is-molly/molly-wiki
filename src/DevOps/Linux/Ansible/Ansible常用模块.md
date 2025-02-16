---
order: 4
date: 2025-02-14
---

# Ansible 常用模块

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

command模块用于在远程主机上执行命令，ansible默认就是使用command模块。

command模块有一个缺陷就是不能使用管道符和重定向功能。

```shell
## 查看受控主机的/tmp目录内容
[root@ansible ~]# ansible 172.16.103.129 -a 'ls /tmp'
172.16.103.129 | SUCCESS | rc=0 >>
ansible_Xs1oym
systemd-private-fa034beb13644acfb2aadc35bfe64d46-chronyd.service-cVTNsE
systemd-private-fa034beb13644acfb2aadc35bfe64d46-vgauthd.service-XAgkCm
systemd-private-fa034beb13644acfb2aadc35bfe64d46-vmtoolsd.service-rwqet5

## 在受控主机的/tmp目录下新建一个文件test
[root@ansible ~]# ansible 172.16.103.129 -a 'touch /tmp/test'
 [WARNING]: Consider using the file module with state=touch rather than running touch.  If you need to use command because
file is insufficient you can add warn=False to this command task or set command_warnings=False in ansible.cfg to get rid
of this message.

172.16.103.129 | SUCCESS | rc=0 >>


[root@ansible ~]# ansible 172.16.103.129 -a 'ls /tmp'
172.16.103.129 | SUCCESS | rc=0 >>
ansible_7YD229
systemd-private-fa034beb13644acfb2aadc35bfe64d46-chronyd.service-cVTNsE
systemd-private-fa034beb13644acfb2aadc35bfe64d46-vgauthd.service-XAgkCm
systemd-private-fa034beb13644acfb2aadc35bfe64d46-vmtoolsd.service-rwqet5
test


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

## raw 模块

raw模块用于在远程主机上执行命令，其支持管道符与重定向。

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

## shell 模块

shell模块用于在受控机上执行受控机上的脚本，亦可直接在受控机上执行命令。
shell模块亦支持管道与重定向。

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

## template 模块

template模块用于生成一个模板，并可将其传输至远程主机上。

```shell
## 下载一个163的yum源文件并开启此源
[root@ansible ~]# cd /etc/yum.repos.d/
[root@ansible yum.repos.d]# curl -o CentOS7-Base-163.repo http://mirrors.163.com/.help/CentOS7-Base-163.repo
[root@localhost ~]# sed -i 's/\$releasever/7/g' /etc/yum.repos.d/CentOS7-Base-163.repo
[root@localhost ~]# sed -i 's/^enabled=.*/enabled=1/g' /etc/yum.repos.d/CentOS7-Base-163.repo

## 将设置好的163源传到受控主机
[root@ansible ~]# ansible 172.16.103.129 -m template -a 'src=/etc/yum.repos.d/CentOS7-Base-163.repo dest=/etc/yum.repos.d/163.repo'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "checksum": "60b8868e0599489038710c45025fc11cbccf35f2",
    "dest": "/etc/yum.repos.d/163.repo",
    "gid": 0,
    "group": "root",
    "md5sum": "5a3e688854d9ceccf327b953dab55b21",
    "mode": "0644",
    "owner": "root",
    "size": 1462,
    "src": "/root/.ansible/tmp/ansible-tmp-1536311319.27-78101453778196/source",
    "state": "file",
    "uid": 0
}

## 查看受控机上是否有163源
[root@localhost ~]# ls /etc/yum.repos.d/
163.repo
```

## yum 模块

yum模块用于在指定节点机器上通过yum管理软件，其支持的参数主要有两个

- name：要管理的包名
- state：要进行的操作

state常用的值：

- latest：安装软件
- installed：安装软件
- present：安装软件
- removed：卸载软件
- absent：卸载软件

若想使用yum来管理软件，请确保受控机上的yum源无异常。

```shell
## 在受控机上查询看vsftpd软件是否安装
[root@localhost ~]# rpm -qa|grep vsftpd
[root@localhost ~]#


## 在ansible主机上使用yum模块在受控机上安装vsftpd
[root@ansible ~]# ansible 172.16.103.129 -m yum -a 'name=vsftpd state=present'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "msg": "warning: /var/cache/yum/x86_64/7Server/base/packages/vsftpd-3.0.2-22.el7.x86_64.rpm: Header V3 RSA/SHA256 Signature, key ID f4a80eb5: NOKEY\nImporting GPG key 0xF4A80EB5:\n Userid     : \"CentOS-7 Key (CentOS 7 Official Signing Key) <security@centos.org>\"\n Fingerprint: 6341 ab27 53d7 8a78 a7c2 7bb1 24c6 a8a7 f4a8 0eb5\n From       : http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7\n",
    "rc": 0,
    "results": [
        "Loaded plugins: product-id, search-disabled-repos, subscription-manager\nThis system is not registered with an entitlement server. You can use subscription-manager to register.\nResolving Dependencies\n--> Running transaction check\n---> Package vsftpd.x86_64 0:3.0.2-22.el7 will be installed\n--> Finished Dependency Resolution\n\nDependencies Resolved\n\n================================================================================\n Package          Arch             Version                 Repository      Size\n================================================================================\nInstalling:\n vsftpd           x86_64           3.0.2-22.el7            base           169 k\n\nTransaction Summary\n================================================================================\nInstall  1 Package\n\nTotal download size: 169 k\nInstalled size: 348 k\nDownloading packages:\nPublic key for vsftpd-3.0.2-22.el7.x86_64.rpm is not installed\nRetrieving key from http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7\nRunning transaction check\nRunning transaction test\nTransaction test succeeded\nRunning transaction\n  Installing : vsftpd-3.0.2-22.el7.x86_64                                   1/1 \n  Verifying  : vsftpd-3.0.2-22.el7.x86_64                                   1/1 \n\nInstalled:\n  vsftpd.x86_64 0:3.0.2-22.el7                                                  \n\nComplete!\n"
    ]
}


## 查看受控机上是否安装了vsftpd
[root@localhost ~]# rpm -qa|grep vsftpd
vsftpd-3.0.2-22.el7.x86_64
```

## copy 模块

copy模块用于复制文件至远程受控机。

```shell
[root@ansible ~]# ls /etc/ansible/scripts/
a.sh
[root@ansible ~]# ansible 172.16.103.129 -m copy -a 'src=/etc/ansible/scripts/a.sh dest=/scripts/'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "checksum": "83f66f804c195247885b013912cf9dc649f36391",
    "dest": "/scripts/a.sh",
    "gid": 0,
    "group": "root",
    "md5sum": "a63e880a932bba1160f329836cbfd730",
    "mode": "0644",
    "owner": "root",
    "size": 61,
    "src": "/root/.ansible/tmp/ansible-tmp-1536406467.26-35192956264311/source",
    "state": "file",
    "uid": 0
}


[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'ls /scripts/'
172.16.103.129 | SUCCESS | rc=0 >>
a.sh
test.sh
```

## group 模块

group模块用于在受控机上添加或删除组。

```shell
## 在受控机上添加一个系统组，其gid为306，组名为mysql
[root@ansible ~]# ansible 172.16.103.129 -m group -a 'name=mysql gid=306 state=present'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "gid": 306,
    "name": "mysql",
    "state": "present",
    "system": false
}
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'grep mysql /etc/group'
172.16.103.129 | SUCCESS | rc=0 >>
mysql:x:306:


## 删除受控机上的mysql组
[root@ansible ~]# ansible 172.16.103.129 -m group -a 'name=mysql state=absent'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "name": "mysql",
    "state": "absent"
}
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'grep mysql /etc/group'
172.16.103.129 | FAILED | rc=1 >>
non-zero return code
```

## user 模块

user模块用于管理受控机的用户帐号。

```shell
## 在受控机上添加一个系统用户，用户名为mysql，uid为306，设置其shell为/sbin/nologin，无家目录
[root@ansible ~]# ansible 172.16.103.129 -m user -a 'name=mysql uid=306 system=yes create_home=no shell=/sbin/nologin state=present'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "comment": "",
    "create_home": false,
    "group": 306,
    "home": "/home/mysql",
    "name": "mysql",
    "shell": "/sbin/nologin",
    "state": "present",
    "system": true,
    "uid": 306
}
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'grep mysql /etc/passwd'
172.16.103.129 | SUCCESS | rc=0 >>
mysql:x:306:306::/home/mysql:/sbin/nologin

[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'ls /home'
172.16.103.129 | SUCCESS | rc=0 >>
jerry


## 修改mysql用户的uid为366
[root@ansible ~]# ansible 172.16.103.129 -m user -a 'name=mysql uid=366'
172.16.103.129 | SUCCESS => {
    "append": false,
    "changed": true,
    "comment": "",
    "group": 306,
    "home": "/home/mysql",
    "move_home": false,
    "name": "mysql",
    "shell": "/sbin/nologin",
    "state": "present",
    "uid": 366
}
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'grep mysql /etc/passwd'
172.16.103.129 | SUCCESS | rc=0 >>
mysql:x:366:306::/home/mysql:/sbin/nologin


## 删除受控机上的mysql用户
[root@ansible ~]# ansible 172.16.103.129 -m user -a 'name=mysql state=absent'
172.16.103.129 | SUCCESS => {
    "changed": true,
    "force": false,
    "name": "mysql",
    "remove": false,
    "state": "absent"
}
[root@ansible ~]# ansible 172.16.103.129 -m shell -a 'grep mysql /etc/passwd'
172.16.103.129 | FAILED | rc=1 >>
non-zero return code
```

## service 模块

service模块用于管理受控机上的服务。

```shell
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


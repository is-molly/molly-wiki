---
order: 2
date: 2024-06-02
---

# Shell编程-奇难杂症

## selinux

### Centos7 Arm版本永久关闭selinux Bugs

Centos7 Arm版本永久关闭selinux会出现机器启动变慢、systemd无法使用问题的问题

安全增强型Linux（SELinux）是一个Linux内核的功能，它提供支持访问控制的安全政策保护机制。一般情况下，开启SELinux会提高系统的安全性，但是会破坏操作系统的文件，造成系统无法启动的问题

```shell
# 查看是否关闭 SELINUX的值为 disabled、enforcing、permissive
getenforce
```

永久关闭：

```shell
vi /etc/selinux/config
# 找到SELINUX=enforcing，按i进入编辑模式，将参数修改为SELINUX=disabled
```

本人使用以上关闭selinux后重启机器会很慢并且systemd无法使用，这是原生的bug，如果你也遇到以上关闭后重启很慢并且启动不了，可以通过以下的方式绕过：

如果已经关闭进行重启了，在重启界面，按下e 进入控制台，找到 fi条件最后 加上selinux=0然后按Ctrl+x就可以进去了
进去后将上面修改的selinux/config的selinux状态改为enforcing，然后编辑内核启动文件`vim /etc/grub2-efi.cfg`的
`linux /vmlinuz-5.11.12-300.el7.aarch64 root=/dev/mapper/cl_fedora-root ro crashkernel=auto rd.lvm.lv=cl_fedora/root rd.lvm.lv=cl_fedora/swap rhgb quiet LANG=en_US.UTF-8 selinux=0`

文件内容比较多，通过 /UTF-8 快速定位，以上在 /etc/grub2-efi.cfg 文件在添加了 ...en_US.UTF-8 后添加了 selinux=0这样每次重启也是关闭状态的，也解决了第一种方法关闭卡顿的问题

## 状态码

### 脚本或函数结尾处的&&与||

方式一：

```bash
#!/bin/bash

a=1
if [ $a -ne 1 ];then
  echo '[error]'
fi
```

方式二：

```bash
#!/bin/bash

a=1
[ $a -ne 1 ] && echo '[error]'
```

从代码想要达到的效果上，两种方式一致。但是执行脚本后，使用`echo $?`检查代码执行状态码会发现，方式一输出的是0，方式二输出的是1！

结论：

- 在 aa && bb 这种组合命令中，$? 保存的是最后一个实际执行命令的状态码
- 脚本或函数结尾处慎用&&与||，由于$?可能会导致结束状态码与预期不一致！
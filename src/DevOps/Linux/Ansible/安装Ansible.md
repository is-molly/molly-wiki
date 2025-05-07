---
order: 2
date: 2025-02-13
---

# 安装 Ansible

## 控制节点

Ansible 易于安装。 Ansible 软件只需要安装到要运行它的一个（或多个）控制节点上，由 Ansible管理的主机不需要安装 Ansible。

对控制节点的要求：

- 控制节点应是Linux或UNIX系统。不支持将Windows用作控制节点，但Windows系统可以是受管主机

- 控制节点需要安装Python3（版本3.5或以上）或Python2（版本2.7或以上）

如果操作系统是红帽8.0，Ansible 2.9可以自动使用 platform-python 软件包，该软件包支持使用Python的系统实用程序。你不需要从 AppStream安装python37或python27软件包。

```shell
[root@localhost ~]# yum list installed platform-python
Updating Subscription Management repositories.
Unable to read consumer identity
This system is not registered to Red Hat Subscription Management. You can use subscription-manager to register.
Installed Packages
platform-python.x86_64                   3.6.8-1.el8.0.1                    @anaconda
```

## 受控主机

Ansible的一大优点是受管主机不需要安装特殊代理。Ansible控制节点使用标准的网络协议连接受管主机，从而确保系统处于指定的状态。

受管主机可能要满足一些要求，具体取决于控制节点连接它们的方式以及它们要运行的模块。Linux和UNIX受管主机需要安装有Python2（版本2.6或以上）或Python3（版本3.5或以上），这样才能运行大部分的模块。对于红帽8，可以启用并安装python36应用流（或python27应用流）

```shell
yum module install python36
```

如果受管主机上启用了SELinux，还需要确保安装python3-libselinux软件包，然后才能使用与任何复制、文件或模板功能相关的模块。所以在工作的时候，应当把SELinux功能关闭。

## 基于Windows的受控主机

Ansible有许多专门为Windows系统设计的模块。这些模块列在 [list_of_windows_modules](https://docs.ansible.com/ansible/latest/modules/list_of_windows_modules.html)  部分中。

大部分专门为Windows受管主机设计的模块需要在受管主机上安装PowerShell 3.0或更高版本，而不是安装Python。此外，受管主机也需要配置PowerShell远程连接。Ansible还要求至少将.NET Framework 4.0或更高版本安装在Windows受管主机上。

## 受控网络设备

Ansible还可以配置受管网络设备，例如路由器和交换机。Ansible包含大量专门为此目的而设计的模块。其中包括对Cisco IOS、IOS XR和NX-OS的支持；Juniper Junos；Arsta EOS；以及基于VyOS的网络设备等。

我们可以使用为服务器编写playbook时使用的相同基本技术为网络设备编写Ansible Playbook。由于大多数网络设备无法运行Python，因此Ansible在控制节点上运行网络模块，而不是在受管主机上运行。特殊连接方法也用于与网络设备通信，通常使用SSH上的CLI、SSH上的XML或HTTP(S)上的API。

[参考文档](https://docs.ansible.com/ansible/latest/modules/list_of_network_modules.html)

## 安装Ansible

### 包管理器方式

```shell
# 提供YUM源
mv /etc/yum.repos.d/* /opt/
curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-vault-8.5.2111.repo
sed -i -e '/mirrors.cloud.aliyuncs.com/d' -e '/mirrors.aliyuncs.com/d' /etc/yum.repos.d/CentOS-Base.repo
yum clean all
yum makecache
yum -y install centos-release-ansible-29

# 安装ansible
yum -y install ansible
ansible --version

# 通过使用setup模块验证localhost上的ansible_python_version
ansible -m setup localhost|grep ansible_python_version

# 查看可用的ansbile插件
ansible-doc -l
```

### pip方式

```shell
yum -y install python39 rust
pip3 install ansible
ansible --version
```

> ansible的模块虽然很多，但常用的也就30+，针对特定业务只需要熟悉特定10+模块就行了
>
> [模块文档](https://docs.ansible.com/ansible/latest/module_plugin_guide/index.html)

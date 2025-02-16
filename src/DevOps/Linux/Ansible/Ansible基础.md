---
order: 3
date: 2025-02-13
---

# Ansible 基础

## 构建Ansible清单

清单定义Ansible将要管理的一批主机。这些主机也可以分配到组中以进行集中管理。组可以包含子组，主机也可以是多个组的成员。清单还可以设置应用到它所定义的主机和组的变量。

可以通过两种方式定义主机清单。静态主机清单可以通过文本文件定义。动态主机清单可以根据需要使用外部信息提供程序通过脚本或其他程序来生成。

### 使用静态清单指定受管主机

静态清单文件是指定Ansible目标受管主机的文本文件。可以使用多种不同的格式编写此文件，包括INI样式或YAML。

在最简单的形式中。INI样式的静态清单文件是受管主机的主机名或IP地址的列表，每行一个：

```ini
alpha.example.org
beta.example.org
192.168.1.100
```

但通常而言可以将受管主机组织为主机组。通过主机组可以更加有效的对一系列系统运行Ansible。这时每一部分的开头为以中括号括起来的主机组名称。其后为该组中每一受管主机的主机名或IP地址，每行一个。

```ini
[webservers]
alpha.example.org
beta.example.org
192.168.1.100

www[001:006].example.com

[dbservers]
db01.intranet.mydomain.net
db02.intranet.mydomain.net
10.25.1.56

db-[99:101]-node.example.com
```

### 验证清单

若有疑问，可使用 ansible 命令验证计算机是否存在于清单中：

```shell
[root@localhost ~]# ansible db-99-node.example.com --list-hosts
  hosts (1):
    db-99-node.example.com
[root@localhost ~]# ansible db-999-node.example.com --list-hosts
[WARNING]: Could not match supplied host pattern, ignoring: db-999-node.example.com
[WARNING]: No hosts matched, nothing to do
  hosts (0):
```

运行以下命令来列出指定组中的所有主机：

```shell
[root@localhost ~]# ansible webservers --list-hosts
  hosts (2):
    alpha.example.org
    beta.example.org
    192.168.1.100
```

如果清单中含有名称相同的主机和主机组，ansible 命令将显示警告并以主机作为其目标，主机组则被忽略。应对这种情况的方法有多种，其中最简单的是确保主机组不使用与清单中主机相同的名称。

### 覆盖清单的位置

**/etc/ansible/hosts**文件被视为系统的默认静态清单文件。不过通常的做法是不使用该文件，而是在Ansible配置文件中为清单文件定义一个不同的位置。

### 构建Ansible清单

修改默认清单文件**/etc/ansible/hosts**添加以下内容：

```shell
172.16.103.129

[webservers]
172.16.103.130

172.16.103.131
```

使用以下命令列出默认清单文件中的所有受管主机：

```shell
ansible all --list-hosts
```

使用以下命令列出不属于任何组的受管主机：

```shell
ansible ungrouped --list-hosts
```

使用以下命令列出属于某组的受管主机：

```shell
ansible webservers --list-hosts
```

### 自定义清单文件

在/etc/ansible/目录中，创建一个名为inventory的自定义静态清单文件。

**服务器清单规格**

| 主机IP         | 用途         | 位置 | 运行环境 |
| -------------- | ------------ | ---- | -------- |
| 172.16.103.129 | web服务器    | 北京 | 测试     |
| 172.16.103.130 | web服务器    | 上海 | 生产     |
| 172.16.103.131 | 数据库服务器 | 上海 | 生产     |

编辑/etc/ansible/inventory文件，将上表中所列出的主机加入受管主机序列。

```shell
[root@localhost ~]# vim /etc/ansible/inventory
[webservers]
172.16.103.129 ansible_user=root ansible_password=your_pass
172.16.103.130 ansible_user=root ansible_password=your_pass

[db-servers]
172.16.103.131 ansible_user=root ansible_password=your_pass
```

执行以下命令列出所有受管主机：

```shell
ansible all -i /etc/ansible/inventory --list-hosts
```

执行以下命令列出webservers组中的所有受管主机：

```shell
ansible webservers -i /etc/ansible/inventory --list-hosts
```

## 管理Ansible配置文件

### 配置Ansible

可以通过修改 Ansible 配置文件中的设置来自定义 Ansible安装的行为。Ansible从控制节点上多个可能的位置之一选择其配置文件。

- **使用/etc/ansible/ansible.cfg**：ansible软件包提供一个基本的配置文件，它位于/etc/ansible/ansible.cfg。如果找不到其他配置文件，则使用此文件

- **使用~/.ansible.cfg**：Ansible在用户的家目录中查找.ansible.cfg文件。如果存在此配置文件并且当前工作目录中也没有ansible.cfg文件，则使用此配置取代/etc/ansible/ansible.cfg

- **使用./ansible.cfg**：如果执行ansible命令的目录中存在ansible.cfg文件，则使用它，而不使用全局文件或用户的个人文件。这样，管理员可以创建一种目录结构，将不同的环境或项目存储在单独的目录中，并且每个目录包含为独特的一组设置而定制的配置文件。推荐的做法是在需要运行Ansible命令的目录中创建ansible.cfg文件。此目录中也将包含任何供Ansible项目使用的文件，如清单和playbook。这是用于Ansible配置文件的最常用位置。实践中不常使用~/.ansible.cfg或/etc/ansible/ansible.cfg文件

- **使用ANSIBLE_CONFIG环境变量**：我们可以通过将不同的配置文件放在不同的目录中，然后从适当的目录执行Ansible命令，以此利用配置文件。但是，随着配置文件数量的增加，这种方法存在局限性并且难以管理。有一个更加灵活的选项，即通过ANSIBLE_CONFIG环境变量定义配置文件的位置。定义了此变量时，Ansible将使用变量所指定的配置文件，而不用上面提到的任何配置文件

### 配置文件优先级

ANSIBLE_CONFIG环境变量指定的任何文件将覆盖所有其他配置文件。如果没有设置该变量，则接下来检查运行ansible命令的目录中是否有ansible.cfg文件。如果不存在该文件，则检查用户的家目录是否有.ansible.cfg文件。只有在找不到其他配置文件时，才使用全局/etc/ansible/ansible.cfg文件。如果/etc/ansible/ansible.cfg配置文件不存在，Ansible包含它使用的默认值。

由于Ansible配置文件可以放入的位置有多种，因此Ansible当前使用哪一个配置文件可能会令人困惑。我们可以运行以下命令来清楚地确认所安装的Ansible版本以及正在使用的配置文件。

```shell
ansible --version
```

Ansible仅使用具有最高优先级的配置文件中的设置。即使存在优先级较低的其他配置文件，其设置也会被忽略，不会与选定配置文件中的设置结合。因此，如果你选择自行创建配置文件来取代全局/etc/ansible/ansible.cfg配置文件，就需要将该文件中所有需要的设置复制到自己的用户级配置文件中。用户组配置文件中未定义的设置将保持设为内置默认值，即使已在全局配置文件中设为某个其他值也是如此。

### 管理配置文件中的设置

Ansible配置文件由几个部分组成，每一部分含有以键值对形式定义的设置。部分的标题以中括号括起来。对于基本操作，请使用以下两部分：

- [defaults]部分设置Ansible操作的默认值
- [privilege_escalation]配置Ansible如何在受管主机上执行特权升级

例如，下面是典型的ansible.cfg文件：

```shell
[defaults]
inventory = ./inventory
remote_user = user
ask_pass = false

[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

下表说明了此文件中的指令：

| 指令            | 描述                                                         |
| --------------- | ------------------------------------------------------------ |
| inventory       | 指定清单文件的路径。                                         |
| remote_user     | 要在受管主机上登录的用户名。如果未指定则使用当前用户名       |
| ask_pass        | 是否提示输入SSH密码。如果使用SSH公钥身份验证则可以是false    |
| become          | 连接后是否自动在受管主机上切换用户（通常切换为root） 这也可以通过play来指定。 |
| become_method   | 如何切换用户（通常为sudo，这也是默认设置，但可选择su）       |
| become_user     | 要在受管主机上切换到的用户（通常是root，这也是默认值）       |
| become_ask_pass | 是否需要为become_method提示输入密码。默认为false。           |

### 配置连接

Ansible需要知道如何与其受管主机通信。更改配置文件的一个最常见原因是为了控制Ansible使用什么方法和用户来管理受管主机。需要的一些信息包括：

- 列出受管主机和主机组的清单的位置
- 要使用哪一种连接协议来与受管主机通信（默认为SSH），以及是否需要非标准网络端口来连接服务器
- 要在受管主机上使用哪一远程用户；这可以是root用户或者某一非特权用户
- 如果远程用户为非特权用户，Ansible需要知道它是否应尝试将特权升级为root以及如何进行升级（例如，通过sudo）
- 是否提示输入SSH密码或sudo密码以进行登录或获取特权

#### 清单位置

在[defaults]部分中，inventory指令可以直接指向某一静态清单文件，或者指向含有多个静态清单文件和动态清单脚本的某一目录。

```shell
[defaults]
inventory = ./inventory
```

#### 连接设置

默认情况下Ansible使用SSH协议连接受管主机。控制Ansible如何连接受管主机的最重要参数在[defaults]部分中设置。

默认情况下Ansible尝试连接受管主机时使用的用户名与运行ansible命令的本地用户相同。若要指定不同的远程用户，请将remote_user参数设置为该用户名。

如果为运行Ansible的本地用户配置了SSH私钥，使得它们能够在受管主机上进行远程用户的身份验证，则Ansible将自动登录。如果不是这种情况，可以通过设置指令ask_pass = true，将Ansible配置为提示本地用户输入由远程用户使用的密码。

```shell
【defaults]
inventory = ./inventory

remote_user = root
ask_pass = true
```

假设在使用一个Linux控制节点，并对受管主机使用OpenSSH，如果可以使用密码以远程用户身份登录，那么我们可以设置基于SSH密钥的身份验证，从而能够设置ask_pass = false。

第一步是确保在~/.ssh中为控制节点上的用户配置了SSH密钥对。并且使用ssh-copy-id命令将本地的公钥复制到受管主机中。此过程请参考文章[openssh](http://www.itwangqing.net.cn/ssl-not-enabled/?return=/15309540565109.html)。

#### 升级特权

鉴于安全性和审计原因，Ansible可能需要先以非特权用户身份连接远程主机，然后再通过特权升级获得root用户身份的管理权限。这可以在Ansible配置文件的[privilege_escalation]部分中设置。

要默认启用特权升级，可以在配置文件中设置指令become = true。即使默认为该设置，也可以在运行临时命令或Ansible Playbook时通过各种方式覆盖它。（例如，有时候可能要运行一些不需要特权升级的任务或play。）

become_method指令指定如何升级特权。有多个选项可用，但默认为使用sudo。类似地，become_user指令指定要升级到的用户，但默认为root。

如果所选的become_method机制要求用户输入密码才能升级特权，可以在配置文件中设置become_ask_pass = true指令。

以下示例ansible.cfg文件假设你可以通过基于SSH密钥的身份验证以someuser用户身份连接受管主机，并且someuser可以使用sudo以root用户身份运行命令而不必输入密码：

```shell
[defaults]
inventory = ./inventory
remote_user = someuser
ask_pass = false

[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

#### 非SSH连接

默认情况下，Ansible用于连接受管主机的协议设置为smart，它会确定使用SHH的最高效方式。可以通过多种方式将其设置为其他的值。

例如，默认使用SSH的规则有一个例外。如果目录中没有localhost，Ansible将设置一个隐式localhost条目以便允许运行以localhost为目标的临时命令和playbook。这一特殊清单条目不包括在all或ungrouped主机组中。此外，Ansible不使用smart SSH连接类型，而是利用默认的特殊local连接类型来进行连接。

```shell
ansible localhost --list-hosts
```

local连接类型忽略remote_user设置，并且直接在本地系统上运行命令。如果使用特权升级，它会在运行sudo时使用运行Ansible命令的用户，而不是remote_user。如果这两个用户具有不同的sudo特权，这可能会导致混淆。

如果你要确保像其他受管主机一样使用SSH连接localhost，一种方法是在清单中列出它。但是，这会将它包含在all和ungrouped组中，而你可能不希望如此。

另一种方法是更改用于连接localhost的协议。执行此操作的最好方法是为localhost设置ansible_connection主机变量。为此，你需要在运行Ansible命令的目录中创建host_vars子目录。在该子目录中，创建名为localhost的文件，其应含有ansible_connection: smart这一行。这将确保对localhost使用smart（SSH)连接协议，而非local。

你也可以通过另一种变通办法来使用它。如果清单中列有127.0.0.1，则默认情况下，将会使用smart来连接它。也可以创建一个含有ansible_connection: local这一行的host_vars/127.0.0.1文件，它会改为使用local。

### 配置文件注释

Ansible配置文件允许使用两种注释字符：井号或分号。

位于行开头的#号会注释掉整行。它不能和指令位于同一行中。

分号字符可以注释掉所在行中其右侧的所有内容。它可以和指令位于同一行中，只要该指令在其左侧。

## 运行临时命令

使用临时命令可以快速执行单个Ansible任务，不需要将它保存下来供以后再次运行。它们是简单的在线操作，无需编写playbook即可运行。

临时命令对快速测试和更改很有用。例如，可以使用临时命令确保一组服务器上的**/etc/hosts**文件中存在某一特定的行。可以使用另一个临时命令在许多不同的计算机上高效的重启服务，或者确保特定的软件包为最新版本。

临时命令对于通过Ansible快速执行简单的任务非常有用。它们确实也存在局限，而且总体而言，要使用Ansible Playbook来充分发挥Ansible的作用。但在许多情形中，临时命令正是快速执行简单任务所需要的工具。

### 临时命令语法

Ansible运行临时命令的语法如下：

```shell
ansible host-pattern -m module [-a 'module arguments'] [-i inventory]
```

host-pattern参数用于指定在其上运行临时命令的受管主机。它可以是清单中的特定受管主机或主机组。也可以用后面的-i选项指定特定的清单而不使用默认清单。

-m选项将Ansible应在目标主机上运行的module名称作为参数。模块是为了实施任务而执行的小程序。一些模块不需要额外的信息，但其他模块需要使用额外的参数来指定其操作详情。-a选项以带引号字符串形式取这些参数的列表。

一种最简单的临时命令使用ping模块。此模块不执行ICMP ping，而是检查能否在受管主机上运行基于Python的模块。例如，以下临时命令确定清单中的所有受管主机能否运行标准的模块：

```shell
[root@localhost ~]# ansible all -m ping
172.16.103.131 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python"
    },
    "changed": false,
    "ping": "pong"
}
......
```

### 使用临时命令通过模块来执行任务

模块是临时命令用于完成任务的工具。Ansible提供了数百个能够完成不同任务的模块。通常我们可以查找一个经过测试的专用模块，作为标准安装的一部分来完成所需的任务。

ansible-doc -l命令可以列出系统上安装的所有模块。可以使用ansible-doc来按照名称查看特定模块的帮助文档，再查找关于模块将取什么参数作为选项的信息。例如以下命令显示ping模块的帮助文档，在帮助文档里面输入**q**命令表示退出：

```shell
ansible-doc ping
```

更多的模块信息请访问[在线Ansible文档](https://docs.ansible.com/ansible/latest/modules/modules_by_category.html)

常用模块：

| 模块类别      | 模块                                                         |
| ------------- | ------------------------------------------------------------ |
| 文件模块      | copy：将本地文件复制到受管主机 file：设置文件的权限和其他属性 lineinfile：确保特定行是否在文件中 synchronize：使用rsync同步内容 |
| 软件包模块    | package：使用操作系统本机的自动检测软件包管理器管理软件包 yum：使用yum管理软件包 apt：使用APT管理软件包 dnf：使用dnf管理软件包 gem：管理Ruby gem pip：从PyPI管理Python软件包 |
| 系统模块      | firewalld：使用firewalld管理防火墙 reboot：重启计算机 service：管理服务 user：添加、删除和管理用户帐户 |
| Net Tools模块 | get_url：通过HTTP、HTTPS或FTP下载文件 nmcli：管理网络 uri：与Web服务交互 |

大部分模块会取用参数。可在模块的文档中找到可用于该模块的参数列表。临时命令可以通过-a选项向模块传递参数。无需参数时，可从临时命令中省略-a选项。如果需要指定多个参数，请以引号括起的空格分隔列表形式提供。

例如，以下临时命令使用user模块来确保runtime用户存在于172.16.103.129上并且其UID为4000：

```shell
ansible 172.16.103.129 -m user -a 'name=runtime uid=4000 state=present'
```

大多数模块为idempotent，这表示它们可以安全地多次运行；如果系统已处于正确的状态，它们不会进行任何操作。

### 在受管主机上运行任意命令

command模块允许管理员在受管主机的命令行中运行任意命令。要运行的命令通过-a选项指定为该模块的参数。例如，以下命令将对webservers组的受管主机运行hostname命令：

```shell
[root@localhost ~]# ansible webservers -m command -a 'hostname'
172.16.103.130 | CHANGED | rc=0 >>
node03-linux.example.com
172.16.103.129 | CHANGED | rc=0 >>
node02-linux.example.com
```

这条命令为每个受管主机返回两行输出。第一行是状态报告，显示对其运行临时操作的受管主机名称及操作的结果。第二行是使用Ansible command模块远程执行的命令的输出。

若要改善临时命令输出的可读性和解析，管理员可能会发现使对受管主机执行的每一项操作具有单行输出十分有用。使用-o选项以单行格式显示Ansible临时命令的输出。

```shell
[root@localhost ~]# ansible webservers -m command -a 'hostname' -o
172.16.103.130 | CHANGED | rc=0 | (stdout) node03-linux.example.com
172.16.103.129 | CHANGED | rc=0 | (stdout) node02-linux.example.com
```

command模块允许管理员对受管主机快速执行远程命令。这些命令不是由受管主机上的shell加以处理。因此，它们无法访问shell环境变量，也不能执行重定向和管道等shell操作。

在命令需要shell处理的情形中，管理员可以使用shell模块。与command模块类似，可以在临时命令中将要执行的命令作为参数传递给该模块。Ansible随后对受管主机远程执行该命令。与command模块不同的是，这些命令将通过受管主机上的shell进行处理。因此，可以访问shell环境变量，也可以使用重定向和管道等操作。

以下示例演示了command与shell的区别。如果尝试使用这两个模块执行内建的Bash命令set，只有使用shell模块才会成功：

```shell
[root@localhost ~]# ansible 172.16.103.129 -m command -a 'set'
172.16.103.129 | FAILED | rc=2 >>
[Errno 2] No such file or directory

[root@localhost ~]# ansible 172.16.103.129 -m shell -a 'set'
172.16.103.129 | CHANGED | rc=0 >>
BASH=/bin/sh
BASHOPTS=cmdhist:extquote:force_fignore:hostcomplete:interactive_comments:progcomp:promptvars:sourcepath
BASH_ALIASES=()
BASH_ARGC=()
BASH_ARGV=()
......
```

command和shell模块都要求受管主机上安装正常工作的Python。第三个模块是raw，它可以绕过模块子系统，直接使用远程shell运行命令。在管理无法安装Python的系统（如网络路由器）时，可以利用这个模块。它也可以用于将Python安装到主机上。

在大多数情况下，建议避免使用command、shell和raw这三个“运行命令”模块。

其他模块大部分都是幂等的，可以自动进行更改跟踪。它们可以测试系统的状态，在这些系统已处于正确状态时不执行任何操作。相反，以幂等方式使用“运行命令”模块要复杂得多。依靠它们，你更难以确信再次运行临时命令或playbook不会造成意外的失败。当shell或command模块运行时，通常会基于它是否认为影响了计算机状态而报告CHANGED状态。

有时候，“运行命令”模块是有用的工具，也是解决问题的好办法。如果确实需要使用它们，可能最好先尝试用command模块，只有在需要shell或raw模块的特殊功能时才利用它们。

###  配置临时命令的连接

受管主机连接和特权升级的指令可以在Ansible配置文件中配置，也可以使用临时命令中的选项来定义。使用临时命令中的选项定义时，它们将优先于Ansible配置文件中配置的指令。下表显示了与各项配置文件指令类同的命令行选项。

**Ansible命令行选项**

| 配置文件指令    | 命令行选项           |
| --------------- | -------------------- |
| inventory       | -i                   |
| remote_user     | -u                   |
| become          | —become、-b          |
| become_method   | –become-method       |
| become_user     | –become-user         |
| become_ask_pass | –ask-become-pass、-K |

在使用命令行选项配置这些指令前，可以通过查询ansible --help的输出来确定其当前定义的值。

```shell
ansible --help
```


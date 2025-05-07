---
order: 10
date: 2025-02-14
---

# 利用角色简化playbook

## 描述角色结构

### 利用角色构造ansible playbook

随着开发更多的playbook，我们可能会发现有很多机会重复利用以前缩写的playbook中的代码。或许，一个用于为某一应用配置MySQL数据库的play可以改变用途，通过利用不同的主机名、密码和用户来为另一个应用配置MySQL数据库。

但在现实中，这个play可能比较冗长且复杂，有许多包含或导入的文件，以及用于管理各种情况的任务和处理程序。将所有这些代码复制到另一playbook中可能比较困难。

Ansible角色提供了一种方法，让用户能以通用的方式更加轻松地重复利用Ansible代码。我们可以在标准化目录结构中打包所有任务、变量、文件、模板，以及调配基础架构或部署应用所需的其他资源。只需通过复制相关的目录，将角色从一个项目复制到另一个项目。然后，只需从一个play调用该角色就能执行它。

借助编写良好的角色，可以从playbook中向角色传递调整其行为的变量，设置所有站点相关的主机名、IP地址、用户名，或其他在本地需要的具体详细信息。例如，部署数据库服务器的角色可能已编写为支持多个变量，这些变量用于设置主机名、数据库管理员用户和密码，以及需要为安装进行自定义的其他参数。角色的作者也可以确保在选择不在play中设置变量值时，为这些变量设定合理的默认值。

Ansible角色具有下列优点：

- 角色可以分组内容，从而与他人轻松共享代码
- 可以编写角色来定义系统类型的基本要素：Web服务器、数据库服务器、Git存储库，或满足其他用途
- 角色使得较大型项目更容易管理
- 角色可以由不同的管理员并行开发

除了自行编写、使用、重用和共享角色外，还可以从其他来源获取角色。一些角色已包含在`rhel-system-roles`软件包中，用户也可以从Ansible Galaxy网站获取由社区提供支持的许多角色。

### 检查ansible角色结构

Ansible角色由子目录和文件的标准化结构定义。顶级目录定义角色本身的名称。文件整理到子目录中，子目录按照各个文件在角色中的用途进行命名，如tasks和handlers。files和templates子目录中包含由其他YAML文件中的任务引用的文件。

```shell
site.yml
webservers.yml
fooservers.yml
roles/
    common/
        tasks/
        handlers/
        files/
        templates/
        vars/
        defaults/
        meta/
    webservers/
        tasks/
        defaults/
        meta/
```

以下tree命令显示了user.example角色的目录结构：

```shell
[root@localhost roles]# tree user.example/
user.example/
├── defaults
│   └── main.yml
├── files
├── handlers
│   └── main.yml
├── meta
│   └── main.yml
├── README.md
├── tasks
│   └── main.yml
├── templates
├── tests
│   ├── inventory
│   └── test.yml
└── vars
    └── main.yml
```

Ansible角色子目录

| 子目录	|功能|
| ---- | ---- |
| defaults	|此目录中的main.yml文件包含角色变量的默认值，使用角色时可以覆盖这些默认值。<br>这些变量的优先级较低，应该在play中更改和自定义。|
| files	|此目录包含由角色任务引用的静态文件。|
| handlers	|此目录中的main.yml文件包含角色的处理程序定义。|
| meta	|此目录中的main.yml文件包含与角色相关的信息，如作者、许可证、平台和可选的角色依赖项。|
| tasks	|此目录中的main.yml文件包含角色的任务定义。|
| templates	|此目录包含由角色任务引用的Jinja2模板。|
| tests	|此目录可以包含清单和名为test.yml的playbook，可用于测试角色。|
| vars	|此目录中的main.yml文件定义角色的变量值。这些变量通常用于角色内部用途。<br>这些变量的优先级较高，在playbook中使用时不应更改。<br>并非每个角色都拥有所有这些目录。|

### 定义变量和默认值

角色变量通过在角色目录层次结构中创建含有键值对的`vars/main.yml`文件来定义。与其他变量一样，这些角色变量在角色YAML文件中引用：`{{ VAR_NAME }}`。这些变量具有较高的优先级，无法被清单变量覆盖。这些变量旨在供角色的内部功能使用。

默认变量允许为可在play中使用的变量设置默认值，以配置角色或自定义其行为。它们通过在角色目录层次结构中创建含有键值对的`defaults/main.yml`文件来定义。默认变量具有任何可用变量中最低的优先级。它们很容易被包括清单变量在内的任何其他变量覆盖。这些变量旨在让用户在编写使用该角色的play时可以准确地自定义或控制它将要执行的操作。它们可用于向角色提供所需的信息，以正确地配置或部署某些对象。

在`vars/main.yml`或`defaults/main.yml`中定义具体的变量，但不要在两者中都定义。有意要覆盖变量的值时，应使用默认变量。

> 注意：
>   角色不应该包含特定于站点的数据。它们绝对不应包含任何机密，如密码或私钥。
>   这是因为角色应该是通用的，可以重复利用并自由共享。特定于站点的详细信息不应硬编码到角色中。
>   机密应当通过其他途径提供给角色。这是用户可能要在调用角色时设置角色变量的一个原因。play中设置的角色变量可以提供机密，或指向含有该机密的Ansible Vault加密文件。

### 在playbook中使用ansible角色

在playbook中使用角色非常简单。下例演示了调用Ansible角色的一种方式：

```yml
---
- hosts: remote.example.com
  roles:
    - role1
    - role2
```

对于每个指定的角色，角色任务、角色处理程序、角色变量和角色依赖项将按照顺序导入到playbook中。角色中的任何`copy`、`script`、`template`或`include_tasks/import_tasks`任务都可引用角色中相关的文件、模板或任务文件，且无需相对或绝对路径名称。Ansible将分别在角色的`files`、`templates`或`tasks`子目录中寻找它们。

如果使用roles部分将角色导入到play中，这些角色会在用户为该play定义的任何任务之前运行。

以下示例设置role2的两个角色变量var1和var2的值。使用role2时，任何defaults和vars变量都会被覆盖。

```yml
---
- hosts: remote.example.com
  roles:
    - role: role1
    - role: role2
      var1: val1
      var2: val2
```

以下是在此情形中用户可能看到的另一种等效的YAML语法：

```yml
---
- hosts: remote.example.com
  roles:
    - role: role1
    - { role: role2, var1: val1, var2: val2 }
```

尽管这种写法更精简，但在某些情况下它更加难以阅读。

> 重要
> 正如前面的示例中所示，内嵌设置的角色变量（角色参数）具有非常高的优先级。它们将覆盖大多数其他变量。
> 务必要谨慎，不要重复使用内嵌设置在play中任何其他位置的任何角色变量的名称，因为角色变量的值将覆盖清单变量和任何play中的vars。

### 控制执行顺序

对于playbook中的每个play，任务按照任务列表中的顺序来执行。执行完所有任务后，将执行任务通知的处理程序。

在角色添加到play中后，角色任务将添加到任务列表的开头。如果play中包含第二个角色，其任务列表添加到第一个角色之后。

角色处理程序添加到play中的方式与角色任务添加到play中相同。每个play定义一个处理程序列表。角色处理程序先添加到处理程序列表，后跟play的handlers部分中定义的任何处理程序。

在某些情形中，可能需要在角色之前执行一些play任务。若要支持这样的情形，可以为play配置pre_tasks部分。列在此部分中的所有任务将在执行任何角色之前执行。如果这些任务中有任何一个通知了处理程序，则这些处理程序任务也在角色或普通任务之前执行。

此外，play也支持post_tasks关键字。这些任务在play的普通任务和它们通知的任何处理程序运行之后执行。

以下play演示了一个带有pre_tasks、roles、tasks、post_tasks和handlers的示例。一个play中通常不会同时包含所有这些部分。

```yml
- name: Play to illustrate order of execution
  hosts: remote.example.com
  pre_tasks:
    - debug:
      msg: 'pre-task'
      notify: my handler
  roles:
    - role1
  tasks:
    - debug:
      msg: 'first task'
      notify: my handler
  post_tasks:
    - debug:
      msg: 'post-task'
      notify: my handler
  handlers:
    - name: my handler
      debug:
        msg: Running my handler
```

在上例中，每个部分中都执行debug任务来通知my handler处理程序。my handler任务执行了三次：

- 在执行了所有pre_tasks任务后
- 在执行了所有角色任务和tasks部分中的任务后
- 在执行了所有post_tasks后

除了将角色包含在play的roles部分中外，也可以使用普通任务将角色添加到play中。使用include_role模块可以动态包含角色，使用import_role模块则可静态导入角色。

以下playbook演示了如何通过include_role模块来利用任务包含角色。

```yml
- name: Execute a role as a task
  hosts: remote.example.com
  tasks:
    - name: A normal task
      debug:
        msg: 'first task'
    - name: A task to include role2 here
      include_role: role2
```

> 注意: include_role模块是在Ansible 2.3中新增的，而import_role模块则是在Ansible 2.4中新增的。

## 利用系统角色重用内容

### 红帽企业Linux系统角色

自RHEL7.4开始，操作系统随附了多个Ansible角色，作为rhel-system-roles软件包的一部分。在RHEL8中，该软件包可以从AppStream中获取。以下是每个角色的简要描述：

RHEL系统角色

| 名称	| 状态	| 角色描述|
| --- | --- | ---|
| rhel-system-roles.kdump	|全面支持	|配置kdump崩溃恢复服务|
| rhel-system-roles.network	|全面支持	|配置网络接口|
| rhel-system-roles.selinux	|全面支持	|配置和管理SELinux自定义，<br>包括SELinux模式、文件和端口上下文、<br>布尔值设置以及SELinux用户|
| rhel-system-roles.timesync	|全面支持	|使用网络时间协议或精确时间协议配置时间同步|
| rhel-system-roles.postfix	|技术预览	|使用Postfix服务将每个主机配置为邮件传输代理|
| rhel-system-roles.firewall	|开发中	|配置主机的防火墙|
| rhel-system-roles.tuned	|开发中	|配置tuned服务，以调优系统性能|

系统角色的目的是在多个版本之间标准化红帽企业Linux子系统的配置。使用系统角色来配置版本6.10及以上的任何红帽企业Linux主机。

### 简化配置管理

举例而言，RHEL7的建议时间同步服务为chronyd服务。但在RHEL6中，建议的服务为ntpd服务。在混合了RHEL6和7主机的环境中，管理员必须管理这两个服务的配置文件。

借助RHEL系统角色，管理员不再需要维护这两个服务的配置文件。管理员可以使用rhel-system-roles.timesync角色来配置RHEL6和7主机的时间同步。一个包含角色变量的简化YAML文件可以为这两种类型的主机定义时间同步配置。

### 安装RHEL系统角色

RHEL系统角色由rhel-system-roles软件包提供，该软件包可从AppStream流获取。在Ansible控制节点上安装该软件包。

安装RHEL系统角色

```shell
yum -y install rhel-system-roles
```

安装后，RHEL系统角色位于`/usr/share/ansible/roles`目录中：

```shell
ls -l /usr/share/ansible/roles/
```

红帽企业Linux中的默认roles_path在路径中包含/usr/share/ansible/roles，因此在playbook引用这些角色时Ansible可以很轻松的找到它们。

> 注意: 如果在当前Ansible配置文件中覆盖了roles_path，设置了环境变量ANSIBLE_ROLES_PATH，或者roles_path中更早列出的目录下存在另一个同名的角色，则Ansible可能无法找到系统角色。

### 访问RHEL系统角色的文档

安装后，RHEL系统角色的文档位于`/usr/share/doc/rhel-system-roles-/`目录中。文档按照子系统整理到子目录中：

```shell
[root@localhost ~]# ll /usr/share/doc/rhel-system-roles/
total 4
drwxr-xr-x 2 root root   57 Aug 22 15:26 kdump
drwxr-xr-x 2 root root 4096 Aug 22 15:26 network
drwxr-xr-x 2 root root   57 Aug 22 15:26 postfix
drwxr-xr-x 2 root root   93 Aug 22 15:26 selinux
drwxr-xr-x 2 root root   57 Aug 22 15:26 storage
drwxr-xr-x 2 root root  136 Aug 22 15:26 timesync
```

每个角色的文档目录均包含一个README.md文件。README.md文件含有角色的说明，以及角色用法信息。

README.md文件也会说明影响角色行为的角色变量。通常，README.md文件中含有一个playbook代码片段，用于演示常见配置场景的变量设置。

部分角色文档目录中含有示例playbook。首次使用某一角色时，请查看文档目录中的任何额外示例playbook。

RHEL系统角色的角色文档与Linux系统角色的文档相匹配。使用Web浏览器来访问位于[Ansible Galaxy网站](https://galaxy.ansible.com/docs/)上的角色文档。

### 时间同步角色示例

假设需要在服务器上配置NTP时间同步。我们可以自行编写自动化来执行每一个必要的任务。但是，RHEL系统角色中有一个可以执行此操作角色，那就是`rhel-system-roles.timesync`。

该角色的详细记录位于`/usr/share/doc/rhel-system-roles/timesync`目录下的README.md中。此文件说明了影响角色行为的所有变量，还包含演示了不同时间同步配置的三个playbook代码片段。

为了手动配置NTP服务器，该角色具有一个名为`timesync_ntp_servers`的变量。此变量取一个要使用的NTP服务器的列表作为值。列表中的每一项均由一个或多个属性构成。两个关键属性如下：

timesync_ntp_servers属性

|属性	|用途|
| ---- | ---- |
|hostname	|要与其同步的NTP服务器的主机名。|
|iburst	|一个布尔值，用于启用或禁用快速初始同步。在角色中默认为no，但通常应该将属性设为yes.|

根据这一信息，以下示例play使用`rhel-system-roles.timesync`角色将受管主机配置为利用快速初始同步从三个NTP服务器获取时间。此外，还添加了一个任务，以使用timezone模块将主机的时区设为UTC。

```yml
- name: Time Synchronization Play
  hosts: servers
  vars:
    timesync_ntp_servers:
      - hostname: 0.rhel.pool.ntp.org
        iburst: yes
      - hostname: 1.rhel.pool.ntp.org
        iburst: yes
      - hostname: 2.rhel.pool.ntp.org
        iburst: yes
    timezone: UTC
    
  roles:
    - rhel-system-roles.timesync

  tasks:
    - name: Set timezone
      timezone:
        name: "{{ timezone }}"
```

> 注意: 如果要设置不同的时区，可以使用tzselect命令查询其他有效的值。也可以使用timedatectl命令来检查当前的时钟设置。

此示例在play的vars部分中设置角色变量，但更好的做法可能是将它们配置为主机或主机组的清单变量。

例如一个playbook项目具有以下结构：

```shell
[root@localhost playbook-project]# tree
.
├── ansible.cfg
├── group_vars
│   └── servers
│       └── timesync.yml
├── inventory
└── timesync_playbook.yml
```

`timesync.yml`定义时间同步变量，覆盖清单中servers组内主机的角色默认值。此文件看起来类似于：

```yml
timesync_ntp_servers:
  - hostname: 0.rhel.pool.ntp.org
    iburst: yes
  - hostname: 1.rhel.pool.ntp.org
    iburst: yes
  - hostname: 2.rhel.pool.ntp.org
    iburst: yes
timezone: UTC
```

`timesync_playbook.yml`的内容简化为：

```yml
- name: Time Synchronization Play
  hosts: servers
  roles:
    - rhel-system-roles.timesync
  tasks:
    - name: Set timezone
      timezone:
        name: "{{ timezone }}"
```

该结构可清楚地分隔角色、playbook代码和配置设置。Playbook代码简单易读，应该不需要复杂的重构。角色内容由红帽进行维护并提供支持。所有设置都以清单变量的形式进行处理。

该结构还支持动态的异构环境。具有新的时间同步要求的主机可能会放置到新的主机组中。相应的变量在YAML文件中定义，并放置到相应的group_vars（或host_vars）子目录中。

### SELINUX角色示例
`rhel-system-roles.selinux`角色可以简化SELinux配置设置的管理。它通过利用SELinux相关的Ansible模块来实施。与自行编写任务相比，使用此角色的优势是它能让用户摆脱编写这些任务的职责。取而代之，用户将为角色提供变量以对其进行配置，且角色中维护的代码将确保应用用户需要的SELinux配置。

此角色可以执行的任务包括：

- 设置enforcing或permissive模式
- 对文件系统层次结构的各部分运行restorecon
- 设置SELinux布尔值
- 永久设置SELinux文件上下文
- 设置SELinux用户映射

### 调用SELinux角色

有时候，SELinux角色必须确保重新引导受管主机，以便能够完整应用其更改。但是，它本身从不会重新引导主机。如此一来，用户便可以控制重新引导的处理方式。

其工作方式为，该角色将一个布尔值变量`selinux_reboot_required`设为True，如果需要重新引导，则失败。你可以使用`block/rescure`结构来从失败中恢复，具体操作为：如果该变量未设为true，则让play失败，如果值是true，则重新引导受管主机并重新运行该角色。Play中的块看起来应该类似于：

```yml
- name: Apply SELinux role
  block:
    - include_role:
      name: rhel-system-roles.selinux
  rescue:
    - name: Check for failure for other reasons than required reboot
      fail:
      when: not selinux_reboot_required
      
    - name: Restart managed host
      reboot:
      
    - name: Reapply SELinux role to complete changes
      include_role:
        name: rhel-system-roles.selinux
```

### 配置SELinux角色

用于配置`rhel-system-roles.selinux`角色的变量的详细记录位于其README.md文件中。以下示例演示了使用此角色的一些方法。

selinux_state变量设置SELinux的运行模式。它可以设为enforcing、permissive或disabled。如果未设置，则不更改模式。

```shell
selinux_state: enforcing
```

selinux_booleans变量取一个要调整的SELinux布尔值的列表作为值。列表中的每一项是变量的散列/字典：布尔值的name、state（它应是on还是off），以及该设置是否应在重新引导后persistent。

本例将httpd_enable_homedirs永久设为on：

```yml
selinux_booleans:
  - name: 'httpd_enable_homedirs'
    state: 'on'
    persistent: 'yes'
```

selinux_fcontext变量取一个要永久设置（或删除）的文件上下文的列表作为值。它的工作方式与selinux fcontent命令非常相似。

以下示例确保策略中包含一条规则，用于将/srv/www下所有文件的默认SELinux类型设为`httpd_sys_content_t`。

```yml
selinux_fcontexts:
  - target: '/srv/www(/.*)?'
    setype: 'httpd_sys_content_t'
    state: 'present'
```

`selinux_restore_dirs`变量指定要对其运行restorecon的目录的列表：

```yml
selinux_restore_dirs:
  - /srv/www
```

selinux_ports变量取应当具有特定SELinux类型的端口的列表作为值。

```yml
selinux_ports:
  - ports: '82'
    setype: 'http_port_t'
    proto: 'tcp'
    state: 'present'
```

## 创建角色

角色创建流程

在Ansible中创建角色不需要特别的开发工具。创建和使用角色包含三个步骤：

- 创建角色目录结构
- 定义角色内容
- 在playbook中使用角色

### 创建角色目录结构

默认情况下，Ansible在Ansible Playbook所在目录的roles子目录中查找角色。这样，用户可以利用playbook和其他支持文件存储角色。

如果Ansible无法在该位置找到角色，它会按照顺序在Ansible配置设置roles_path所指定的目录中查找。此变量包含要搜索的目录的冒号分隔列表。此变量的默认值为：

```shell
~/.ansible/roles:/usr/share/ansible/roles:/etc/ansible/roles
```

这允许用户将角色安装到由多个项目共享的系统上。例如，用户可能将自己的角色安装在自己的主目录下的`~/.ansible/roles`子目录中，而系统可能将所有用户的角色安装在`/usr/share/ansible/roles`目录中。

每个角色具有自己的目录，采用标准化的目录结构。例如，以下目录结构包含了定义motd角色的文件。

```shell
[root@localhost ~]# tree roles/
roles/
└── motd
    ├── defaults
    │   └── main.yml
    ├── files
    ├── handlers
    ├── meta
    │   └── main.yml
    ├── tasks
    │   └── main.yml
    └── templates
        └── motd.j2
```

README.md提供人类可读的基本角色描述、有关如何使用该角色的文档和示例，以及其发挥作用所需要满足的任何非Ansible要求。
meta子目录包含一个main.yml文件，该文件指定有关模块的作者、许可证、兼容性和依赖项的信息。
files子目录包含固定内容的文件，而templates子目录则包含使用时可由角色部署的模板。
其他子目录中可以包含main.yml文件，它们定义默认的变量值、处理程序、任务、角色元数据或变量，具体取决于所处的子目录。

如果某一子目录存在但为空，如本例中的handlers，它将被忽略。如果某一角色不使用功能，则其子目录可以完全省略。例如，本例中的vars子目录已被省略。

### 创建角色框架

可以使用标准Linux命令创建新角色所需的所有子目录和文件。此外，也可以通过命令行实用程序来自动执行新角色创建过程。

`ansible-galaxy`命令行工具可用于管理Ansible角色，包括新角色的创建。用户可以运行`ansible-galaxy init`来创建新角色的目录结构。指定角色的名称作为命令的参数，该命令在当前工作目录中为新角色创建子目录。

```shell
[root@localhost playbook-project]# cd roles/
[root@localhost roles]# ansible-galaxy init my_new_role
- Role my_new_role was created successfully
[root@localhost roles]# ls my_new_role/
defaults  files  handlers  meta  README.md  tasks  templates  tests  vars
```

### 定义角色内容

创建目录结构后，用户必须编写角色的内容。`ROLENAME/tasks/main.yml`任务文件是一个不错的起点，它是由角色运行的主要任务列表。

下列`tasks/main.yml`文件管理受管主机上的`/etc/motd`文件。它使用template模块将名为motd.j2的模板部署到受管主机上。因为template模块是在角色任务而非playbook任务内配置的，所以从角色的templates子目录检索motd.j2模板。

```shell
[root@localhost ~]# cat roles/motd/tasks/main.yml
---
# tasks file for motd

- name: deliver motd file
  template:
    src: motd.j2
    dest: /etc/motd
    owner: root
    group: root
    mode: 0444
```

下列命令显示motd角色的motd.j2模板的内容。它引用了Ansible事实和system_owner变量。

```shell
[root@localhost ~]# cat roles/motd/templates/motd.j2
This is the system {{ ansible_facts['hostname'] }}.

Today's date is: {{ ansible_facts['date_time']['date'] }}.

Only use this system with permission.
You can ask {{ system_owner }} for access.
```

该角色为system_owner变量定义一个默认值。角色目录结构中的`defaults/main.yml`文件就是设置这个值的位置。

下列defaults/main.yml文件将system_owner变量设置为user@host.example.com。此电子邮件地址将写入到该角色所应用的受管主机上的/etc/motd文件中。

```shell
[root@localhost ~]# cat roles/motd/defaults/main.yml
---
system_owner: user@host.example.com
```

### 角色内容开发的推荐做法

角色允许以模块化方式编写playbook。为了最大限度地提高新开发角色的效率，请考虑在角色开发中采用以下推荐做法：

- 在角色自己的版本控制存储库中维护每个角色。Ansible很适合使用基于git的存储库。
- 角色存储库中不应存储敏感信息，如密码或SSH密钥。敏感值应以变量的形式进行参数化，其默认值应不敏感。使用角色的playbook负责通过`Ansible Vault`变量文件、环境变量或其他ansible-playbook选项定义敏感变量。
- 使用ansible-galaxy init启动角色，然后删除不需要的任何目录和文件。
- 创建并维护README.md和`meta/main.yml`文件，以记录用户的角色的用途、作者和用法。
- 让角色侧重于特定的用途或功能。可以编写多个角色，而不是让一个角色承担许多任务。
- 经常重用和重构角色。避免为边缘配置创建新的角色。如果现有角色能够完成大部分的所需配置，请重构现有角色以集成新的配置方案。使用集成和回归测试技术来确保角色提供所需的新功能，并且不对现有的playbook造成问题。

###  定义角色依赖项

角色依赖项使得角色可以将其他角色作为依赖项包含在内。例如，一个定义文档服务器的角色可能依赖于另一个安装和配置web服务器的角色。依赖关系在角色目录层次结构中的`meta/main.yml`文件内定义。

以下是一个示例`meta/main.yml`文件。

```yml
dependencies:
  - role: apache
    port: 8080
  - role: postgres
    dbname: serverlist
    admin_user: felix
```

默认情况下，角色仅作为依赖项添加到playbook中一次。若有其他角色也将它作为依赖项列出，它不会再次运行。此行为可以被覆盖，将`meta/main.yml`文件中的`allow_duplicates`变量设置为yes即可。

> 重要: 限制角色对其他角色的依赖。依赖项使得维护角色变得更加困难，尤其是当它具有许多复杂的依赖项时。

### 在playbook中使用角色

要访问角色，可在play的roles:部分引用它。下列playbook引用了motd角色。由于没有指定变量，因此将使用默认变量值应用该角色。

```shell
[root@localhost ~]# cat use-motd-role.yml
---
- name: use motd role playbook
  hosts: remote.example.com
  remote_user: devops
  become: true
  roles:
    - motd
```

执行该playbook时，因为角色而执行的任务可以通过角色名称前缀来加以识别。

```shell
[root@localhost ~]# ansible-playbook -i inventory use-motd-role.yml
```

上述情形假定motd角色位于roles目录中。

### 通过变量更改角色的行为

编写良好的角色利用默认变量来改变角色行为，使之与相关的配置场景相符。这有助于让角色变得更为通用，可在各种不同的上下文中重复利用。

如果通过以下方式定义了相同的变量，则角色的defaults目录中定义的变量的值将被覆盖：

- 在清单文件中定义，作为主机变量或组变量
- 在playbook项目的group_vars或host_vars目录下的YAML文件中定义
- 作为变量嵌套在play的vars关键字中定义
- 在play的roles关键字中包含该角色时作为变量定义

下例演示了如何将motd角色与system_owner角色变量的不同值搭配使用。角色应用到受管主机时，指定的值`someone@host.example.com`将取代变量引用。

```shell
[root@localhost ~]# cat use-motd-role.yml
---
- name: use motd role playbook
  hosts: remote.example.com
  remote_user: devops
  become: true
  vars:
    system_owner: someone@host.example.com
  roles:
    - role: motd
```

以这种方式定义时，system_owner变量将替换同一名称的默认变量的值。嵌套在vars关键字内的任何变量定义不会替换在角色的vars目录中定义的同一变量的值。

下例也演示了如何将motd角色与system_owner角色变量的不同值搭配使用。指定的值`someone@host.example.com`将替换变量引用，不论是在角色的vars还是defaults目录中定义。

```shell
[root@localhost ~]# cat use-motd-role.yml
---
- name: use motd role playbook
  hosts: remote.example.com
  remote_user: devops
  become: true
  roles:
    - role: motd
      system_owner: someone@host.example.com
```

在play中使用角色变量时，变量的优先顺序可能会让人困惑。

- 几乎任何其他变量都会覆盖角色的默认变量，如清单变量、playvars变量，以及内嵌的角色参数等。
- 较少的变量可以覆盖角色的vars目录中定义的变量。事实、通过include_vars加载的变量、注册的变量和角色参数是其中一些具备这种能力的变量。清单变量和playvars无此能力。这非常重要，因为它有助于避免用户的play意外改变角色的内部功能。
- 不过，正如上述示例中最后一个所示，作为角色参数内嵌声明的变量具有非常高的优先级。它们可以覆盖角色的vars目录中定义的变量。如果某一角色参数的名称与playvars或角色vars中设置的变量或者清单变量或playbook变量的名称相同，该角色参数将覆盖另一个变量。

## 使用ansible galaxy部署角色

### 介绍ansible galaxy

[Ansible Galaxy](https://galaxy.ansible.com)是一个Ansible内容公共资源库，这些内容由许许多多Ansible管理员和用户编写。它包含数千个Ansible角色，具有可搜索的数据库，可帮助Ansible用户确定或许有助于他们完成管理任务的角色。Ansible Galaxy含有面向新的Ansible用户和角色开发人员的文档和视频链接。

此外，用于从Ansible Galaxy获取和管理角色的ansible-galaxy命令也可用于为您的项目获取和管理自有的git存储库中的角色。

#### 获取Ansible Galaxy帮助

通过Ansible Galaxy网站主页上的Documenttaion标签，可以进入描述如何使用Ansible Galaxy的页面。其中包含了介绍如何从Ansible Galaxy下载和使用角色的内容。该页面也提供关于如何开发角色并上传到Ansible Galaxy的说明。

#### 浏览Ansible Galaxy中的角色

通过Ansible Galaxy网站主页上左侧的Search标签，用户可以访问关于Ansible Galaxy上发布的角色的信息。用户可以使用标记通过角色的名称或通过其他角色属性来搜索Ansible角色。结果按照Best Match分数降序排列，此分数依据角色质量、角色受欢迎程度和搜索条件计算而得。

### Ansible Galaxy命令行工具

#### 从命令行搜索角色

`ansible-galaxy search`子命令在Ansible Galaxy中搜索角色。如果以参数形式指定了字符串，则可用于按照关键字在Ansible Galaxy中搜索角色。用户可以使用`--author`、`--platforms`和`--galaxy-tags`选项来缩小搜索结果的范围。也可以将这些选项用作主要的搜索键。例如，命令`ansible-galaxy search --author geerlingguy`将显示由用户geerlingguy提交的所有角色。

结果按照字母顺序显示，而不是Best Match分数降序排列。下例显示了包含redis并且适用于企业Linux(EL)平台的角色的名称。

```shell
ansible-galaxy search 'redis' --platforms EL
```

`ansible-galaxy info`子命令显示与角色相关的更多详细信息。Ansible Galaxy从多个位置获取这一信息，包括角色的`meta/main.yml`文件及其GigHub存储库。以下命令显示了Ansible Galaxy提供的`geerlingguy.redis`角色的相关信息。

```shell
ansible-galaxy info geerlingguy.redis
```

#### 从Ansible Galaxy安装角色

`ansible-galaxy install`子命令从Ansible Galaxy下载角色，并将它安装到控制节点本地。

默认情况下，角色安装到用户的roles_path下的第一个可写目录中。根据为Ansible设置的默认roles_path，角色通常将安装到用户的`~/.ansible/roles`目录。默认的roles_path可能会被用户当前Ansible配置文件或环境变量`ANSIBLE_ROLES_PATH`覆盖，这将影响ansible-galaxy的行为。

用户可以通过使用-p DIRECTORY选项，指定具体的目录来安装角色。

在下例中，ansible-galaxy将`geerlingguy.redis`角色安装到playbook项目的roles目录中。命令的当前工作目录是`/opt/project`。

```shell
ansible-galaxy install geerlingguy.redis -p roles/
```

#### 使用要求文件安装角色

可以使用ansible-galaxy，根据某一文本文件中的定义来安装一个角色列表。例如，如果用户的一个playbook需要安装特定的角色，可以在项目目录中创建一个`roles/requirements.yml`文件来指定所需的角色。此文件充当playbook项目的依赖项清单，使得playbook的开发和调试能与任何支持角色分开进行。

例如，一个用于安装`geerlingguy.redis`的简单requirements.yml可能类似于如下：

```yml
- src: geerlingguy.redis
  version: "1.5.0"
```

src属性指定角色的来源，本例中为来自Ansible Galaxy的`geerlingguy.redis`角色。version属性是可选的，指定要安装的角色版本，本例中为1.5.0。

> 重要: 
>   应当在requirements.yml文件中指定角色版本，特别是生产环境中的playbook。
>   如果不指定版本，将会获取角色的最新版本。如果作者对角色做出了更改，并与用户的playbook不兼容，这可能会造成自动化失败或其他问题。

若要使用角色文件来安装角色，可使用-r REQUIREMENTS-FILE选项：

```shell
ansible-galaxy install -r roles/requirements.yml -p roles
```

用户可以使用ansible-galaxy来安装不在Ansible Galaxy中的角色。可以在私有的Git存储库或Web服务器上托管自有的专用或内部角色。下例演示了如何利用各种远程来源配置要求文件。

```shell
[root@localhost project]# cat roles/requirements.yml
# from Ansible Galaxy, using the latest version
- src: geerlingguy.redis

# from Ansible Galaxy, overriding the name and using a specific version
- src: geerlingguy.redis
  version: "1.5.0"
  name: redis_prod
  
# from any Git-based repository, using HTTPS
- src: https://gitlab.com/guardianproject-ops/ansible-nginx-acme.git
  scm: git
  version: 56e00a54
  name: nginx-acme
  
# from any Git-based repository, using SSH
- src: git@gitlab.com:guardianproject-ops/ansible-nginx-acme.git
  scm: git
  version: master
  name: nginx-acme-ssh
  
# from a role tar ball, given a URL
# supports 'http', 'https', or 'file' protocols
- src: file:///opt/local/roles/myrole.tar
  name: myrole
```

src关键字指定Ansible Galaxy角色名称。如果角色没有托管在Ansible Galaxy中，则src关键字将指明角色的URL。

如果角色托管在来源控制存储库中，则需要使用scm属性。ansible-galaxy命令能够从基于git或mercurial的软件存储库下载和安装角色。基于Git的存储库要求scm值为git，而托管在Mercurial存储库中的角色则要求值为hg。如果角色托管在Ansible Galaxy中，或者以tar存档形式托管在Web服务器上，则省略scm关键字。

name关键字用于覆盖角色的本地名称。version关键字用于指定角色的版本。version关键字可以是与严自角色的软件存储库的分支、标记或提交哈希对应的任何值。

若要安装与playbook项目关联的角色，可执行`ansible-galaxy install`命令：

```shell
[root@localhost project]# ansible-galaxy install -r roles/requirements.yml -p roles
```

#### 管理下载的角色

ansible-galaxy命令也可管理本地的角色，如位于playbook项目的roles目录中的角色。ansible-galaxy list子命令列出本地找到的角色。

```shell
ansible-galaxy list
```

可以使用`ansible-galaxy remove`子命令本地删除角色。

```shell
ansible-galaxy remove nginx-acme-ssh
ansible-galaxy list
```

在playbook中使用下载并安装的角色的方式与任何其他角色都一样。在roles部分中利用其下载的角色名称来加以引用。如果角色不在项目的roles目录中，则将检查roles_path来查看角色是否安装在了其中一个目录中，将使用第一个匹配项。以下`use-role.ymlplaybook`引用了`redis_prod`和`geerlingguy.redis`角色：

```shell
[root@localhost project]# cat use-role.yml
---
- name: use redis_prod for prod machines
  hosts: redis_prod_servers
  remote_user: devops
  become: True
  roles:
    - redis_prod

- name: use geerlingguy.redis for Dev machines
  hosts: redis_dev_servers
  remote_user: devops
  become: True
  roles:
    - geerlingguy.redis
```

此playbook使不同版本的`geerlingguy.redis`角色应用到生产和开发服务器。借助这种方式可以对角色更改进行系统化测试和集成，然后再部署到生产服务器上。如果角色的近期更改造成了问题，则借助版本控制来开发角色，就能回滚到过去某一个稳定的角色版本。


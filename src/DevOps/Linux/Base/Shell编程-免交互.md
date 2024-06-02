---
order: 1
date: 2024-05-29
---

# Shell编程-免交互

## here document

### 概述

here doc 是一个有特殊目的的代码段，它使用I/O重定向将一段代码（能传递参数和命令替换）传递到别的交互程序或命令中，通常用于交互式。

语法格式：

```bash
命令 <<标记（EOF）
# 自定义内容   
标记（EOF）
```

注意点：

- 标记可以使用任意大写字母组成的字符，通常为EOF。且需要保持前后一致
- 结尾的标记一定要顶格写，前面不能有任何字符
- 结尾的标记后面也不能有任何字符（包括空格）
- 开头标记前后的空格会被省略掉

### 基本使用

#### 通过read命令接收输入并打印

命令行中使用：

```bash
# 直接赋值，只能赋值一行
[root@localhost ~]# read i <<EOF
> hello world
> my name is gg
> EOF
[root@localhost ~]# echo $i
hello world
```

脚本中使用：

```bash
#!/bin/bash

read i <<EOF
hello world
my name is gg
EOF

echo $i  # hello world
```

#### 通过passwd给用户设置密码

```bash
# 两行分别为输入的密码和确认的密码
[root@localhost ~]# passwd root <<EOF
> 123454321
> 123454321
> EOF
```

### Here Document变量设定

#### 变量替换

在写入文件时会先将变量替换成实际值，再结合 cat 命令完成写入

```bash
#!/bin/bash

filename="test.txt"
name="123"
cat > $filename <<EOF
the number is $name
EOF
```
#### 变量设定

整体赋值给变量，然后通过 echo 命令将变量打印出来

```bash
#!/bin/bash

man1="jack"
mans=$(cat <<EOF
tom
$man1
EOF
)
echo $mans  # tom jack
```

### here document格式控制

#### 原始输出

关闭变量替换功能，按照字符原本的样子输出，不做任何修改或替换

```bash
#!/bin/bash

man1="jack"
# 对标记加单引号，即可关闭变量替换
mans=$(cat <<'EOF'
tom
$man1
EOF
)
echo $mans  # tom $man1
```
#### 去掉每行之前的TAB字符

```bash
#!/bin/bash

# <<- 表示抑制行首的TAB作用，注意空格不受影响
myvar=$(cat <<- EOF
      this is line 1.
    this is line 2.
EOF
)

echo "$myvar"
```

### Here Document多行注释

Bash的默认注释是“#”，该注释方法只支持单行注释，Here Document 的引入解决了多行注释的问题。

“:”代表什么都不做的空命令，中间标记区域的内容不会被执行，会被bash 忽略掉，因此可达到批量注释的效果。通过Here Document方式使Bash支持多行注释。

```bash
#!/bin/bash

: <<EOF      # 这是被注释的内容，不能显示
echo "hello"
echo "world"
EOF
```

## expect命令

### 概述

#### 命令描述

expect 是由Don Libes基于Tcl（Tool Command Language ）语言开发的，是一种脚本语言，主要应用于自动化交互式操作的场景，借助Expect处理交互的命令，可以将交互过程如：ssh登录，ftp登录等写在一个脚本上，使之自动化完成。尤其适用于需要对多台服务器执行相同操作的环境中，可以大大提高系统管理人员的工作效率。

#### 使用场景

- 根据预定标准回答其问题，回答“是”、“否”或将控制权交还给您

- 远程连接设备并执行自动化操作

- 需要人机交互的地方，如果提前知道应该输入什么指令都可以使用expect工具

#### 原理

- spawn命令：spawn启动指定进程 => expect获取指定关键字 => send向指定程序发送指定字符 => 执行完成退出。

- send命令：send命令接收一个字符串参数，并将该参数发送到进程，这个过程类似模拟人类输入密码。

- interact命令：结合spawn、expect、send自动化的完成很多任务，interact命令可以在适当的时候进行任务的干预，比如下载完ftp文件时，仍然可以停留在ftp命令行状态，以便手动的执行后续命令。

### 启用选项

```bash
-c  # 从命令行执行expect脚本，默认expect是交互地执行的
-d  # debug模式，可以在运行时输出一些诊断信息，与在脚本开始处使用exp_internal 1相似
-D  # 启用交换调式器,后面应该跟一个整数值。如果该值为非零值，或者如果按下ctrl+C(或者命中断点，或者脚本中出现其他适当的调试器命令)，则调试器将在下一个TCL过程之前获得控制权。
-f  # 从文件读取命令，仅用于使用#!时。如果文件名为"-"，则从stdin读取(使用"./-"从文件名为-的文件读取)
-i  # 交互式输入命令，使用"exit"或"EOF"退出输入状态
--  # 标示选项结束(如果你需要传递与expect选项相似的参数给脚本时)，可放到#!行:#!/usr/bin/expect --
-v  # 显示expect版本信息
```

### 常用expect命令
```bash
spawn                  # 交互程序开始，执行后面的命令或程序。需要进入到expect环境才可以执行，不能直接在shell环境下直接执行
set timeout n          # 设置超时时间表示该脚本代码需在n秒钟内完成，默认超时时间为10s，如果超过则退出。用来防止ssh远程主机网络不可达时卡住及在远程主机执行命令宕住。如果设置为-1表示不会超时
set                    # 定义变量
puts                   # 输出变量
expect                 # 从交互程序进程中指定接收信息, 如果匹配成功, 就执行send的指令交互；否则等待timeout秒后自动退出expect语句
log_user               # 用于控制是否将交互信息输出到终端，默认启用。[ 0-禁用 | 1-启用 ]。当为0时会使spawn和expect交互信息不输出
send                   # 如果匹配到expect接受到的信息，就将send中的指令交互传递，执行交互动作。结尾处加上\r表示如果出现异常等待的状态可以进行核查
send_user              # 表示回显命令，相当于echo，相对于send，send_user是输出到终端进程的，而不是spawn开启的进程
exp_continue           # 附加于某个 expect 判断项之后，可以使该项被匹配后，还能继续匹配该expect判断语句内的其他项。类似于控制语句中的continue语句，表示允许expect继续向下执行指令
exit [num]             # 退出expect脚本，后可跟状态码
expect eof             # spawn进程结束后会向expect发送eof，接收到eof代表该进程结束。比如切换到root用户, expect脚本默认的是等待10s,当执行完命令后，默认停留10s后自动切回了原用户
interact               # 执行完代码后保持交互状态，将控制权交给用户，interact后的命令不起作用。没有该命令执行完后自动退出而不是留在远程终端上。
$argv                  # expect脚本可以接受bash的外部传参，可以使用[ lindex $argv n ]，n为0表示第一个传参，为1表示第二个传参，以此类推
set exit_status [wait] # wait命令用于获取最近一个被spawn的进程的状态信息，wait返回一个包含状态信息的列表，包括进程ID、进程退出的原因（如正常退出或信号终止）、退出状态码等。
set exit_code [lindex $exit_status 3]  # lindex命令用于从列表中获取特定索引的元素，在wait返回的列表中，索引3处的元素通常是进程的退出状态码。
```
> 注意：
> - expect eof与interact只能二选一。
> - expect eof用于等待被spawn的进程结束，而不是立即终止expect脚本本身。因此在expect eof之后，expect脚本仍然可以执行后续的命令。这样做的好处是，你可以在等待进程结束之后执行一些清理工作或获取进程的退出状态码。
> - 使用exp_continue时，如果跟踪像 passwd 这样的输入密码后就结束进程的命令，expect{} 外不要再加上 expect eof ，因为 spawn 进程结束后会默认向 expect 发送 eof ，会导致后面的 expect eof 执行报错。
> 在tcl语法中，[wait] 表示执行 wait 命令并将其返回值（状态信息列表）插入到当前位置

### expect执行方式

#### 方式一：脚本文件方式

将 expect 脚本写入一个单独的文件，并通过命令行调用。

创建一个名为 script.exp 的文件：
``` bash
#!/usr/bin/expect

set timeout 10
expect "hello"
send "hello world\n"
```

运行 expect 脚本：

```bash
expect script.exp
```

#### 方式二：heredoc 方式

将 expect 脚本内容嵌入到一个 heredoc 块中，并在 bash 脚本中运行。

```bash
#!/bin/bash

expect << EOF
  spawn echo hello
  expect "hello"
  send_user "hello world\n"
EOF
```

#### 方式三：-c参数方式

通过 -c 选项在命令行直接传递 expect 脚本内容。

```bash
#!/bin/bash

expect -c "
 set timeout 10
 expect \"hello\"
 send \"hello world\n\"
"
```

#### heredoc和-c主要区别

在这两种方法中，上面例子中expect 的行为应该是相同的，因为它们都在等待输入 "hello" 并发送 "hello world"。但是环境的不同会导致行为不同。

输入来源：

- 使用 -c 时，没有spawn启动新进程时，expect 直接从终端进程读取输入。
- 使用 heredoc 时，输入通过管道传递，这影响了 expect 等待用户输入的能力。

交互进程的区别：

- 当使用 expect -c "xxx" 时，expect 会将所有命令作为一个整体执行，并在内部管理 spawn 进程的上下文。因此即使没有明确的spawn命令，它也可以和终端进程进行交互。
- 而使用 heredoc 时需要明确指定一个 spawn 进程来与之交互，否则会出现 send: spawn id exp0 not open 错误。

### send命令

send命令接收一个字符串参数，并将该参数发送到进程（这个指令的前提是先使用spawn开启的进程）。

如下实例就是spawn打开了一次ssh连接以后会要求我们输入登陆密码，使用send将密码发送到spawn的进程中。

```bash
#!/bin/bash

expect << EOF
  spawn ssh root@127.0.0.1
  expect "*password:"
  send "1234321\r"
  expect eof
EOF
```

如果没有开启一个进程会怎么样？

```bash
#!/bin/bash

result=$(
  expect << EOF
    send "date\r"
EOF
)
echo $result
```

执行结果为

```bash
date
```

即直接把文字原样输出了！即没有spawn开启的进程时，send命令是向外边直接发送字符串的！

### expect命令

expect命令和send命令正好相反，expect通常是用来等待一个进程的反馈。

expect可以接收一个字符串参数，也可以接收正则表达式参数。

如果我们没有通过spawn开启一个进程，而是直接expect一个字符串的时候，会怎么样？

```bash
#!/bin/bash

expect -c "
    expect \"hello\" { send \"hello world\n\" }
"
```

在这个例子中我们改变了send的写法，放在了expect后面使用花挎号括起来了。这时候当你执行脚本的时候会发现，除非你再键盘上输出hello然后确认，才会输出“hello world”!

这里做个对比，上述写法和下面的对比一下：

```bash
#!/bin/bash

expect -c \"
    expect \"hello\"  
    send \"hello world\n\"
"
```

我们会发现第二种写法，不管我们在不在键盘上输入hello，或者输入什么，都会一段时间后，输出【hello world】。

原因其实就是expect是方法是tcl语言的模式-动作。正常的用法是类似第一种匹配到指定的字符时执行指定的动作。

匹配有2中匹配方式：`单一分支匹配`和`多分支匹配`。

### expect-单分支匹配

类似于上面例子中的，单一匹配就是只有一种匹配情况。有点类似于普通编程语言的if语句，只有一个条件的情况。

```bash
#!/bin/bash

expect -c "
  expect \"hello\" { send \"hello world\n\"}
"
```

### expect-多分支匹配

类似于普通变成语言的多个if条件的情况。这种情况有2种写法!

第一种写法：

```bash
#! /bin/bash 

expect -c "
  expect \"hello\" {send \"hello world\n\"} \"hi\" {send \"hi world\"} \"bye\" {send \"bye world\"}
"
```
第二种写法：

```bash
#!/bin/bash
expect -c "
  set timeout 5
  expect {
	\"hello\" {send \"hello world\n\"} 
	\"hi\" {send \"hi world\"} 
	\"bye\" {send \"bye world\"}
  }
"
```
第二种写法形式上会更简洁易读。不难发现expect语言的都是用{}来做代码分割和代码块分割的。

### expect-多分支匹配的匹配类型

#### 字符串匹配

匹配指定的字符串，并根据匹配结果执行相应操作。

```tcl
expect {
    "pattern1" { action1 }
    "pattern2" { action2 }
}
```

示例：

```tcl
expect {
    "password:" { send "mypassword\r" }
    "login:" { send "myusername\r" }
}
```

#### 正则表达式匹配

使用正则表达式匹配复杂的模式。

```tcl
expect -re {
    "regex1" { action1 }
    "regex2" { action2 }
}
```

示例：

```tcl
expect -re {
    "([0-9]+) files" { puts "Number of files: $expect_out(1,string)" }
    "No such file or directory" { puts "File not found" }
}
```

#### 忽略大小写匹配

匹配时忽略大小写。

```tcl
expect -nocase {
    "pattern1" { action1 }
    "pattern2" { action2 }
}
```

示例：

```tcl
expect -nocase {
    "Password:" { send "mypassword\r" }
    "Login:" { send "myusername\r" }
}
```

#### 超时匹配

处理等待超时的情况。

```tcl
expect {
    timeout { action }
}
```

示例：

```tcl
expect {
    timeout { puts "Operation timed out"; exit 1 }
}
```

#### EOF匹配

处理进程结束的情况。

```tcl
expect {
    eof { action }
}
```

示例：

```tcl
expect {
    eof { puts "Connection closed"; exit 1 }
}
```

#### 通用错误匹配

处理未知错误或异常情况。

```tcl
expect {
    default { action }
}
```

示例：

```tcl
expect {
    default { puts "Unexpected output"; exit 1 }
}
```

#### 综合示例

以下是一个综合使用多分支匹配的示例脚本：

```tcl
#!/usr/bin/expect -f
set timeout 20

spawn ssh user@hostname
expect {
    "Are you sure you want to continue connecting" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "mypassword\r"
    }
    timeout {
        puts "Connection timed out"
        exit 1
    }
    eof {
        puts "Connection closed unexpectedly"
        exit 1
    }
    -re "Permission denied" {
        puts "Access denied"
        exit 1
    }
}

expect "$ "
send "ls -l\r"

expect {
    -re {([0-9]+) files} {
        puts "Matched number of files: $expect_out(1,string)"
    }
    "No such file or directory" {
        puts "Directory not found"
    }
    "$ " {
        send "exit\r"
    }
    timeout {
        puts "Command execution timed out"
        exit 1
    }
    eof {
        puts "Connection closed during command execution"
        exit 1
    }
}

expect eof
puts "Script completed"
```

### spawn命令

spawn开启一个进程后会进入到一个新的shell环境下，这时候向进程发送一个命令字符串，shell就能够识别出这是一个有意义的指令并返回指令的结果。

```bash
#!/bin/bash

expect <<EOF
  spawn ssh root@127.0.0.1
  expect "*password:"
  send "1234321\r"
  expect eof
EOF
```

### interact命令

上述举的例子都是自动完成一些动作。有时候可能会发生停留在界面等待人工操作的情况。这时候我们可以用interact指令来等待人工干预。

如下面例子执行完hostname以后，会停留在expect打开的ssh界面，等待人工操作。

```bash
#!/bin/bash

expect -c "
  spawn ssh root@127.0.0.1
  expect \"*password:\"
  send \"1234321\r\"
  expect \"#\"
  send \"hostname \r\"
  expect \"#\"
  interact
"
```

上面提到了一个词即”人工干预“，如果我们使用EOF方式执行expect，可以人工干预吗？

```bash
#!/bin/bash

expect << EOF
  spawn ssh root@127.0.0.1
  expect "*password:"
  send "1234321\r"
  expect "#"
  send "hostname \r"
  expect "#"
  interact
EOF
```

执行上面命令后，我们会发现人工干预并没有生效，执行完`send hostname \r` 这条命令后就自动退出了！

### set命令

该指令用于设置变量值。

> 思考：为什么下面的脚本必须加 `interact` 才能看到hostname的结果?

```bash
#!/bin/bash

expect -c "
  set uname root
  set psd 1234321
  spawn ssh \$uname@127.0.0.1
  expect \"*password:\"
  send \"\$psd\r\"
  expect \"#\"
  send \"hostname \r\"
  expect "#"
  interact
"
```

### 传参

很多场景下写一个脚本都是要传递参数的，expect也不例外。expect有2个内置变量：argc和argv。

> 注意：argc和argc只能应用与expect脚本，bash内嵌式expect语句好像无法使用！

- `argc`表示参数的数量，类似于普通shell脚本的#
- `$argv`则可以给自身传递一个整数，取出指定位置的参数

例如：

```bash
#!/usr/bin/expect

set uname [lindex $argv 0]
set psd [lindex $argv 1]
puts "$argc"
spawn ssh $uname@127.0.0.1
expect "*password:"
send "$psd\r"
expect "#"
send "hostname \r"
expect "#"
interact
```
执行脚本：

```bash
expect test.exp root 1234321
```
### expect生产环境案例

```bash
#!/bin/bash
#########################
# @desc   ssh util
# @author monap
# @since  2024/04/09
#########################

# shellcheck disable=SC2016
function __sshDeclare() {
  SYS_SSH_LOG_ERROR='lsb log error $0 ${BASH_LINENO} ${FUNCNAME}'
  SYS_SSH_LOG_SUCCESS='lsb log success $0 ${BASH_LINENO} ${FUNCNAME}'
  SYS_SSH_A_NOTBLACK="lsb annotation A_NotBlank"
  SYS_SSH_SSH_TIME_OUT="5"
  # check expect
  ! expect -v &>/dev/null && eval "$SYS_SSH_LOG_ERROR \"please install expect first!\""
}

# 检查机器登陆状态
# @param ip   登陆ip地址
# @param port 登陆端口号
# @param user 登陆账号
# @param pass 登陆密码
function __sshCheckLogin() {
  __sshDeclare
  eval "$SYS_SSH_A_NOTBLACK \"$1\" 'ip can not be null'"
  eval "$SYS_SSH_A_NOTBLACK \"$2\" 'port can not be null'"
  eval "$SYS_SSH_A_NOTBLACK \"$3\" 'user can not be null'"
  eval "$SYS_SSH_A_NOTBLACK \"$4\" 'pass can not be null'"
  local ip=$1
  local port=$2
  local user=$3
  local pass=$4
  local msg
  msg=$(expect << EOF
    set timeout $SYS_SSH_SSH_TIME_OUT
    spawn ssh -p ${port} ${user}@${ip} 'pwd'
    expect {
      "*yes/no*"   { send "yes\r"; exp_continue }
      "*assword*" { send "${pass}\r";exp_continue }
      "*${user}*" { exit 0 }
      timeout { exit 1 }
      eof { exit 1 }
    }
EOF
)
  local status=$?
  msg=$(echo "$msg" | tail -n2 | tr '\r' ';' | tr -d '\n')
  if [ $status -ne 0 ]; then
    eval "$SYS_SSH_LOG_ERROR \"login fail: $msg\""
  fi
}

# @param ip   登陆ip地址
# @param port 登陆端口号
# @param port 登陆账号
# @param pass 登陆密码
# 登陆远程机器 []<-(ip:String,port:Int,pass:String)
# 注意：bash-framework的proxy打包模式无法使用该函数！该函数需要终端保持，代理模式的代理脚本执行完成后会结束！
function sshLogin() {
  __sshDeclare
  local ip=$1
  local port=$2
  local user=$3
  local pass=$4
  __sshCheckLogin "${ip}" "${port}" "${user}" "${pass}" || return
  expect -c "
    set timeout $SYS_SSH_SSH_TIME_OUT
    spawn ssh -p ${port} ${user}@${ip}
    expect {
      \"*yes/no*\"   { send \"yes\r\"; exp_continue }
      \"*password*\" { send \"${pass}\r\" }
      \"*Connection closed by remote host*\" { exit 1 }
      timeout {exit 2}
    }
    interact
  "
}

# @param ip   登陆ip地址
# @param port 登陆端口号
# @param port 登陆账号
# @param pass 登陆密码
# @param time_out 超时时间
# 执行远程命令 [String]<-(ip:String,port:Int,pass:String,time_out:int,cmd:String)
function sshExec() {
  __sshDeclare
  eval "$SYS_SSH_A_NOTBLACK \"$5\" 'timeout can not be null'"
  eval "$SYS_SSH_A_NOTBLACK \"$6\" 'cmd can not be null'"
  local ip=$1
  local port=$2
  local user=$3
  local pass=$4
  local time_out=$5
  local cmd=$6
  __sshCheckLogin "${ip}" "${port}" "${user}" "${pass}" || return
  expect << EOF
    log_user 0
    set timeout $time_out
    spawn ssh -p ${port} ${user}@${ip} ${cmd}
    expect {
      "*yes/no*"   { send "yes\r"; exp_continue }
      "*assword*" { send "${pass}\r"; exp_continue }
      "*Connection closed by remote host*" { exit 1 }
      timeout { exit 2 }
      eof {
        log_user 1
        puts \$expect_out(buffer)
        exit 0
      }
    };
    expect eof
    exit [lindex [wait] 3]
EOF
}

# @param ip   登陆ip地址
# @param port 登陆端口号
# @param pass 登陆密码
# @param time_out 超时时间
# @param dir  上传到远程服务器的目录
# @param files 待上传的文件,可写多个
# 执行远程命令 [String]<-(ip:String,port:Int,pass:String,time_out:int,dir:String,...files:String)
function sshUpload() {
  __sshDeclare
  eval "$SYS_SSH_A_NOTBLACK \"$5\" 'timeout can not be null'"
  eval "$SYS_SSH_A_NOTBLACK \"$6\" 'target dir can not be null'"
  eval "$SYS_SSH_A_NOTBLACK \"$7\" 'files can not be null'"
  local ip=$1
  local port=$2
  local user=$3
  local pass=$4
  local time_out=$5
  local dir=$6
  shift 6
  local files=$*
  __sshCheckLogin "${ip}" "${port}" "${user}" "${pass}" || return
  expect << EOF
    set timeout $SYS_SSH_SSH_TIME_OUT
    # 先判断目录存不存在,不存在则新建之
    spawn ssh -p ${port} ${user}@${ip}
    expect {
      "*yes/no*"   { send "yes\r"; exp_continue }
      "*assword*" { send "${pass}\r" }
      "*Connection closed by remote host*" {exit 1}
      timeout {exit 2}
    };
    expect *${user}@* { send "\[ -d ${dir} \] && echo exist || mkdir -p ${dir} ; exit \r"};
    # scp上传文件
    set timeout $time_out
    spawn scp -r -P ${port} ${files} ${user}@${ip}:${dir};
    expect {
      "*yes/no*"   { send "yes\r"; exp_continue }
      "*assword*" { send "${pass}\r"; exp_continue }
      timeout {exit 2}
      eof { exit 0 }
    };
    expect eof
    exit [lindex [wait] 3]
EOF
}
```
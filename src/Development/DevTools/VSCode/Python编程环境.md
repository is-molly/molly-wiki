---
order: 5
date: 2024-04-08
---
# Python 编程环境

## Ubuntu20.04 安装python3

```shell
# 安装python3
sudo agt-get install python3
# 修改软链接，将python指向python3
sudo rm /usr/bin/python
sudo ln -s /usr/bin/python3 /usr/bin/python
# 找不到pip问题（安装pip）
sudo apt-get install python3-pip
```

## 安装python插件

```shell
# 1. python插件
#   打开vscode插件面板，搜索python,找到微软出品的python插件，点击安装即可。
#   选择 Python 解释器
#   通过Ctrl+Shift+P打开命令面板，然后输入并执行Python：Select Interpreter命令。

# 2. python代码格式化插件
#    Python插件支持3种Python代码格式化工具：autopep8（默认使用）、black及yapf。
#    右键格式化代码，如果未安装相关的格式化工具，vscode 将提示安装。
#    同样，可以通过修改工作区.vscode setting.json中python.formatting.provider设置项配置使用哪一个代码格式化工具。
```

## 代码调试

```shell
# 1. 对于一个简单的Python项目，Python插件支持一键调试，无须任何额外配置。
#    首先，打开你需要调试的Python文件，在相应的代码行处按下F9快捷键添加断点，
#    或者单击编辑区域左侧的边槽添加断点。添加断点后，左侧的边槽会出现一个红色圆点。
#    打开左侧debug面板，点击运行和调试。选择Python File，即可进入当前文件的调试界面。

# 2. 对于一些更复杂的项目，需要创建调试配置，以便后续进行定制化调试。
#   Visual Studio Code的调试配置存储在.vscode文件夹的launch.json文件中。切换到调试视图，单击“创建launch.json文件”链接。
#   同样，需要根据你的项目，在Python File、Django、Flask等中选择一个。
#   选择Python File。Python插件会在.vscode文件夹中创建并打开一个launch.json文件，它定义了调试所需要的配置。
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: 当前文件",
            "type": "python",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal"
        }
    ]
}
# 简单解释一下launch.json各配置项：
# - name 用来命名配置名称的，因为在configurations列表中可以定义多个配置，不同的配置命名要相互区分。
# - type和request是必须项，在不同的配置中都要存在的，而它们的值也是固定的。”type”: “python” , “request”: “launch”。
# - program，用来指定项目运行时的入口文件的，其中${file}表示当前文件，${workspaceFolder}表示项目根目录，对于django项目来说，入口文件应该是项目根目录下的manage.py文件，所以可以配置为”program”: “${workspaceFolder}\\manage.py”。
# - consloe，用来指定程序的输出在哪里。integratedTerminal 表示vscode的集成终端；internalConsole 表示 vscode 调试控制台；externalTerminal 表示操作系统终端。

# 3. Django应用调试配置如下：
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Diango ",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}\\manage.py",
            "args": [
                "runserver",
                "--noreload"
            ]
            "django":true
        }
    ]
}
# - args设置项用来指定传给Python程序的参数。每一个以空格分割的参数都需要以数组的形式来定义。
# - 一般我们运行django项目的命令是： python manage.py runserver 0.0.0.0:8080
# - 这个命令分为两部分，第一部分是python解释器，已经在settings.json里设置了，剩下的参数manage.py runserver 0.0.0.0:8080我们需要在launch.json中设置。
# - 其中manage.py 交给了program 配置项，runserver 0.0.0.0:8080 等交给args。
```

---
order: 14
date: 2024-04-07
---
# LuaTask框架

## 理解

LuaTask框架利用协程在Lua中实现了多任务功能。开发者可以用最简单的方式新建多个任务，而不是像传统的开发方式一样只能用定时器进行延时。

当使用LuaTask框架时，需要在代码中引用`sys`库（`_G.sys=require("sys")`），并且在代码的最后一行调用`sys.run()`以启动LuaTask框架，框架内的任务代码会在`sys.run()`中运行。

## 多任务

```lua
sys = require("sys")
--第一个任务
sys.taskInit(function()
    while true do
        log.info("task1","wow")
        sys.wait(1000) --延时1秒，这段时间里可以运行其他代码
    end
end)

--第二个任务
sys.taskInit(function()
    while true do
        log.info("task2","wow")
        sys.wait(500) --延时0.5秒，这段时间里可以运行其他代码
    end
end)

sys.run()
```

## 多任务之间互相等待

```lua
sys = require("sys")
-- 第一个任务
sys.taskInit(function()
    while true do
        log.info("task1","wow")
        -- 延时1秒，这段时间里可以运行其他代码
        sys.wait(1000)
        -- 发布这个消息，此时所有在等的都会收到这条消息
        sys.publish("TASK1_DONE")
    end
end)

-- 第二个任务
sys.taskInit(function()
    while true do
        -- 等待这个消息，这个任务阻塞在这里了
        sys.waitUntil("TASK1_DONE")
        log.info("task2","wow")
    end
end)

-- 第三个任务
sys.taskInit(function()
    while true do
        -- 等待超时时间500ms，超过就返回false而且不等了
        local result = sys.waitUntil("TASK1_DONE",500)
        log.info("task3","wait result",result)
    end
end)

-- 单独订阅，可以当回调来用
sys.subscribe("TASK1_DONE",function()
    log.info("subscribe","wow")
end)

sys.run()
```

## 多任务之间互相等待并传递数据

```lua
sys = require("sys")
-- 第一个任务
sys.taskInit(function()
    while true do
        log.info("task1","wow")
        -- 延时1秒，这段时间里可以运行其他代码
        sys.wait(1000) 
        -- 发布这个消息，并且带上一个数据
        sys.publish("TASK1_DONE","balabala")
    end
end)

-- 第二个任务
sys.taskInit(function()
    while true do
        -- 等待这个消息，这个任务阻塞在这里了
        local _,data = sys.waitUntil("TASK1_DONE")
        log.info("task2","wow receive",data)
    end
end)

-- 第三个任务
sys.taskInit(function()
    while true do
        -- 等待超时时间500ms，超过就返回false而且不等了
        local result,data = sys.waitUntil("TASK1_DONE",500)
        log.info("task3","wait result",result,data)
    end
end)

-- 单独订阅，可以当回调来用
sys.subscribe("TASK1_DONE",function(data)
    log.info("subscribe","wow receive",data)
end)

sys.run()
```

## 传统定时器

```lua
sys = require("sys")

-- 一秒后执行某函数，可以在后面传递参数
sys.timerStart(log.info,1000,"1s timer")
-- 之间写个function也行
sys.timerStart(function()
    log.info("1s timer function")
end,1000)

-- 每秒执行，永久循环，返回定时器编号
local loopId = sys.timerLoopStart(log.info,1000,"1s loop timer")
-- 10秒后手动停止上面的无限循环定时器
sys.timerStart(function()
    sys.timerStop(loopId)
    log.info("stop 1s loop timer")
end,10000)

sys.run()
```
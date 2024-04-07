---
order: 1
date: 2024-04-07
---
# 排错必备-Kubectl命令详解

[参考文档](https://kubernetes.io/zh-cn/docs/reference/kubectl/)

## k8s命令自动补全

```shell
# 安装 bash-completion 包
yum install bash-completion -y


# 在 bash 中设置当前 shell 的自动补全
source <(kubectl completion bash) 

# 放入环境变量中
echo "source <(kubectl completion bash)" >> ~/.bashrc 
```

## 最常用命令

```shell
# 1.查看 Pod
#   查看所有 pod 列表
kubectl get pod -A
#   查看指定命令空间的Pod 
kubectl get pod -n kube-system
#   查看更详细的信息，比如Pod所在的节点
kubectl get pod -A -o wide		
#   获取pod并查看pod的标签
kubectl get pod -A --show-labels 
#   循环查看Pod状态，如果有变化将被打印
kubectl get pod -w


# 2.查看 RC 和 service 列表
kubectl get rc,svc
#   查看详细信息
kubectl get pod,svc -o wide  
#   查看yaml文件
kubectl get pod <pod-name> -o yaml


# 3.显示 Node 详细信息
#   后面可以跟 Node IP 或者 主机名
kubectl describe node k8s-master01


# 4.显示 Pod 详细信息(特别是查看 pod 无法创建的时候的日志)
#   后面可以跟Node IP或者主机名
kubectl describe pod <pod-name>


# 5.根据 yaml 创建资源(apply 可以重复执行，create 不行)
kubectl create -f pod.yaml
kubectl apply -f pod.yaml


# 6.根据 yaml 定义的名称删除资源
kubectl delete -f pod.yaml 


# 7.删除所有包含某个 label 的 pod 和 service
kubectl delete pod,svc -l name=<label-name>


# 8.删除默认命名空间下的所有 Pod
kubectl delete pod --all


# 9. 执行 pod 命令
kubectl exec <pod-name> -- date
kubectl exec <pod-name> -- bash
kubectl exec <pod-name> -- ping 10.24.51.9


# 10.通过bash获得 pod 中某个容器的TTY，相当于登录容器
kubectl exec -it <pod-name> -c <container-name> -- bash
# eg:
kubectl exec -it redis-master-cln81 -- bash


# 11.查看容器的日志
kubectl logs <pod-name>
#    实时查看日志
kubectl logs -f <pod-name> 
#    若 pod 只有一个容器，可以不加 -c 
kubectl log  <pod-name>  -c <container_name> 
#    返回所有标记为 app=frontend 的 pod 的合并日志
kubectl logs -l app=frontend


# 12.查看节点 labels
kubectl get node --show-labels


# 13.重启 pod
kubectl get pod <POD名称> -n <NAMESPACE名称> -o yaml | kubectl replace --force -f -
```

## 创建相关命令

```shell
kubectl apply -f ./my-manifest.yaml                            # 创建资源
kubectl apply -f ./my1.yaml -f ./my2.yaml                      # 使用多个文件创建
kubectl apply -f ./dir                                         # 基于目录下的所有清单文件创建资源
kubectl apply -f https://git.io/vPieo                          # 从 URL 中创建资源
kubectl create deployment nginx --image=nginx                  # 启动单实例 nginx（直接创建而不是使用yaml创建）
kubectl create deployment nginx --image=nginx -n myNameSpace   # 创建到指定namespace
kubectl create deployment nginx --image=nginx -dry-run=client -oyaml  # 只输出yaml内容，不创建pod
kubectl explain pods,svc                                       # 获取 pod 清单的文档说明


# 从标准输入创建多个 YAML 对象
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: busybox-sleep
spec:
  containers:
  - name: busybox
    image: busybox
    args:
    - sleep
    - "1000000"
---
apiVersion: v1
kind: Pod
metadata:
  name: busybox-sleep-less
spec:
  containers:
  - name: busybox
  image: busybox
    args:
    - sleep
    - "1000"
EOF


# 创建有多个 key 的 Secret
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  password: $(echo -n "s33msi4" | base64 -w0)
  username: $(echo -n "jane" | base64 -w0)
EOF
```

## 查看和查找资源

```shell
# get 命令的基本输出
kubectl get services                          # 列出当前命名空间下的所有 services
kubectl get pods --all-namespaces             # 列出所有命名空间下的全部的 Pods
kubectl get pods -o wide                      # 列出当前命名空间下的全部 Pods，并显示更详细的信息
kubectl get [deployment|deploy] my-dep        # 列出某个特定的 Deployment
kubectl get pods                              # 列出当前命名空间下的全部 Pods
kubectl get pod my-pod -o yaml                # 获取一个 pod 的 YAML


# describe 命令的详细输出
kubectl describe nodes my-node
kubectl describe pods my-pod

# 列出当前名字空间下所有 Services，按名称排序
kubectl get services --sort-by=.metadata.name

# 列出 Pods，按重启次数排序
kubectl get pods -A --sort-by='.status.containerStatuses[0].restartCount'

# 列举所有 PV 持久卷，按容量排序
kubectl get pv --sort-by=.spec.capacity.storage

# 获取包含 app=cassandra 标签的所有 Pods 的 version 标签
kubectl get pods --selector=app=cassandra -o \
  jsonpath='{.items[*].metadata.labels.version}'

# 获取所有工作节点（使用选择器以排除标签名称为 'node-role.kubernetes.io/master' 的结果）
kubectl get node --selector='!node-role.kubernetes.io/master'

# 获取当前命名空间中正在运行的 Pods
kubectl get pods --field-selector=status.phase=Running

# 获取全部节点的 ExternalIP 地址
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="ExternalIP")].address}'

# 列出属于某个特定 RC 的 Pods 的名称
# 在转换对于 jsonpath 过于复杂的场合，"jq" 命令很有用；可以在 https://stedolan.github.io/jq/ 找到它。
sel=${$(kubectl get rc my-rc --output=json | jq -j '.spec.selector | to_entries | .[] | "\(.key)=\(.value),"')%?}
echo $(kubectl get pods --selector=$sel --output=jsonpath={.items..metadata.name})

# 显示所有 Pods 的标签（或任何其他支持标签的 Kubernetes 对象）
kubectl get pods --show-labels

# 检查哪些节点处于就绪状态
JSONPATH='{range .items[*]}{@.metadata.name}:{range @.status.conditions[*]}{@.type}={@.status};{end}{end}' \
 && kubectl get nodes -o jsonpath="$JSONPATH" | grep "Ready=True"

# 列出被一个 Pod 使用的全部 Secret
kubectl get pods -o json | jq '.items[].spec.containers[].env[]?.valueFrom.secretKeyRef.name' | grep -v null | sort | uniq

# 列举所有 Pods 中初始化容器的容器 ID（containerID）
# Helpful when cleaning up stopped containers, while avoiding removal of initContainers.
kubectl get pods --all-namespaces -o jsonpath='{range .items[*].status.initContainerStatuses[*]}{.containerID}{"\n"}{end}' | cut -d/ -f3

# 列出事件（Events），按时间戳排序
kubectl get events --sort-by=.metadata.creationTimestamp

# 比较当前的集群状态和假定某清单被应用之后的集群状态
kubectl diff -f ./my-manifest.yaml
```

## 更新资源

```shell
# 滚动更新 "frontend" Deployment 的 "www" 容器镜像
kubectl set image deployment/frontend www=image:v2 

# 检查 Deployment 的历史记录，包括版本 
kubectl rollout history deployment/frontend  

# 回滚到上次部署版本
kubectl rollout undo deployment/frontend      

 # 回滚到特定部署版本
kubectl rollout undo deployment/frontend --to-revision=2   

# 监视 "frontend" Deployment 的滚动升级状态直到完成
kubectl rollout status -w deployment/frontend   

# 轮替重启 "frontend" Deployment
kubectl rollout restart deployment/frontend                      

# 通过传入到标准输入的 JSON 来替换 Pod
cat pod.json | kubectl replace -f -                             

# 强制替换，删除后重建资源。会导致服务不可用。
kubectl replace --force -f ./pod.json

# 为多副本的 nginx 创建服务，使用 80 端口提供服务，连接到容器的 8000 端口。
kubectl expose rc nginx --port=80 --target-port=8000

# 将某单容器 Pod 的镜像版本（标签）更新到 v4
kubectl get pod mypod -o yaml | sed 's/\(image: myimage\):.*$/\1:v4/' | kubectl replace -f -

# 添加标签
kubectl label pods my-pod new-label=awesome

# 添加注解
kubectl annotate pods my-pod icon-url=http://goo.gl/XXBTWq 

# 对 "foo" Deployment 自动伸缩容
kubectl autoscale deployment foo --min=2 --max=10                
```

## 部分更新资源

```shell
# 部分更新某节点
kubectl patch node k8s-node-1 -p '{"spec":{"unschedulable":true}}' 

# 更新容器的镜像；spec.containers[*].name 是必须的。因为它是一个合并性质的主键。
kubectl patch pod valid-pod -p '{"spec":{"containers":[{"name":"kubernetes-serve-hostname","image":"new image"}]}}'

# 使用带位置数组的 JSON patch 更新容器的镜像
kubectl patch pod valid-pod --type='json' -p='[{"op": "replace", "path": "/spec/containers/0/image", "value":"new image"}]'

# 使用带位置数组的 JSON patch 禁用某 Deployment 的 livenessProbe
kubectl patch deployment valid-deployment  --type json   -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/livenessProbe"}]'

# 在带位置数组中添加元素 
kubectl patch sa default --type='json' -p='[{"op": "add", "path": "/secrets/1", "value": {"name": "whatever" } }]'
```

## 删除资源

```shell
# 删除在 pod.yaml 中指定的类型和名称的 Pod
kubectl delete -f ./pod.yaml  

# 如果pod.yaml中未指定命名空间，需要用参数指定
kubectl delete -f ./pod.yaml -n myNameSpace

# 删除名称为 "baz" 和 "foo" 的 Pod 和服务
kubectl delete pod,service baz foo        

# 删除包含 name=myLabel 标签的 pods 和服务
kubectl delete pods,services -l name=myLabel            

# 删除包含 label name=myLabel 标签的 Pods 和服务
kubectl delete pods,services -l name=myLabel --include-uninitialized   

# 删除在 my-ns 名字空间中全部的 Pods 和服务
kubectl -n my-ns delete po,svc --all   

# 删除所有与 pattern1 或 pattern2 awk 模式匹配的 Pods
kubectl get pods  -n mynamespace --no-headers=true | awk '/pattern1|pattern2/{print $1}' | xargs  kubectl delete -n mynamespace pod
```

## Pod常用操作

```shell
# 获取 pod 日志（标准输出）
kubectl logs my-pod

# 获取含 name=myLabel 标签的Pods 的日志（标准输出）
kubectl logs -l name=myLabel

# 获取上个容器实例的 pod 日志（标准输出）
kubectl logs my-pod --previous

# 获取 Pod 容器的日志（标准输出, 多容器场景）
kubectl logs my-pod -c my-container

# 获取含 name=myLabel 标签的 Pod 容器日志（标准输出, 多容器场景）
kubectl logs -l name=myLabel -c my-container

# 获取 Pod 中某容器的上个实例的日志（标准输出, 多容器场景）
kubectl logs my-pod -c my-container --previous

# 流式输出 Pod 的日志（标准输出）
kubectl logs -f my-pod

# 流式输出 Pod 容器的日志（标准输出, 多容器场景）
kubectl logs -f my-pod -c my-container

# 流式输出含 name=myLabel 标签的 Pod 的所有日志（标准输出）
kubectl logs -f -l name=myLabel --all-containers

# 以交互式 Shell 运行 Pod
kubectl run -i --tty busybox --image=busybox -- sh

# 在指定名字空间中运行 nginx Pod
kubectl run nginx --image=nginx -n mynamespace

# 运行 ngins Pod 并将其规约写入到名为 pod.yaml 的文件
kubectl run nginx --image=nginx --dry-run=client -o yaml > pod.yaml

# 挂接到一个运行的容器中
kubectl attach my-pod -i

# 在本地计算机上侦听端口 5000 并转发到 my-pod 上的端口 6000
kubectl port-forward my-pod 5000:6000

# 在已有的 Pod 中运行命令（单容器场景）
kubectl exec my-pod -- ls / 

# 在已有的 Pod 中运行命令（多容器场景）
kubectl exec my-pod -c my-container -- ls /

# 显示给定 Pod 和其中容器的监控数据
kubectl top pod POD_NAME --containers
```

## 节点操作

```shell
# 标记 my-node 节点为不可调度
kubectl cordon my-node  

# 对 my-node 节点进行清空操作，为节点维护做准备
kubectl drain my-node  

# 标记 my-node 节点为可以调度
kubectl uncordon my-node  

# 显示给定节点的度量值
kubectl top node my-node      

# 显示主控节点和服务的地址
kubectl cluster-info       

# 将当前集群状态转储到标准输出
kubectl cluster-info dump   

# 将当前集群状态输出到 /path/to/cluster-state
kubectl cluster-info dump --output-directory=/path/to/cluster-state   

# 如果已存在具有指定键和效果的污点，则替换其值为指定值
kubectl taint nodes foo dedicated=special-user:NoSchedule
```

## 格式化输出

要以特定格式将详细信息输出到终端窗口，可以将 -o 或 --output 参数添加到支持的 kubectl 命令。

| 输出格式                           | 描述                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| -o=custom-columns=\<spec>          | 使用逗号分隔的自定义列来打印表格                             |
| -o=custom-columns-file=\<filename> | 使用 \<filename> 文件中的自定义列模板打印表格                |
| -o=json                            | 输出 JSON 格式的 API 对象                                    |
| -o=jsonpath=\<template>            | 打印 [jsonpath](https://kubernetes.io/docs/reference/kubectl/jsonpath) 表达式中定义的字段 |
| -o=jsonpath-file=\<filename>       | 打印在 \<filename> 文件中定义的 [jsonpath](https://kubernetes.io/docs/reference/kubectl/jsonpath) 表达式所指定的字段。 |
| -o=name                            | 仅打印资源名称而不打印其他内容                               |
| -o=wide                            | 以纯文本格式输出额外信息，对于 Pod 来说，输出中包含了节点名称 |
| -o=yaml                            | 输出 YAML 格式的 API 对象                                    |

使用 -o=custom-columns 的示例：

```shell
# 集群中运行着的所有镜像
kubectl get pods -A -o=custom-columns='DATA:spec.containers[*].image'

 # 除 "k8s.gcr.io/coredns:1.6.2" 之外的所有镜像
kubectl get pods -A -o=custom-columns='DATA:spec.containers[?(@.image!="k8s.gcr.io/coredns:1.6.2")].image'

# 输出 metadata 下面的所有字段，无论 Pod 名字为何
kubectl get pods -A -o=custom-columns='DATA:metadata.*'
```

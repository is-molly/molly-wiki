---
order: 10
date: 2024-04-07
---
# Axios网络请求封装

## 网络模块的选择

Vue中发送网络请求有非常多的方式，那么在开发中如何选择呢?

**选择一：传统的Ajax是基于XMLHttpRequest(XHR)**

为什么不用它呢？非常好解释配置和调用方式等非常混乱，编码起来看起来就非常蛋疼。所以真实开发中很少直接使用而是使用jQuery-Ajax。

**选择二：使用jQuery-Ajax**

相对于传统的Ajax非常好用，为什么不选择它呢？首先我们先明确一点，在Vue的整个开发中都是不需要使用jQuery了，那么就意味着为了方便我们进行一个网络请求特意引用一个jQuery，你觉得合理吗?jQuery的代码1w+行，Vue的代码才1w+行，完全没有必要为了用网络请求就引用这个重量级的框架。

**选择三：官方在Vue1.x的时候，推出了Vue-resource**

Vue-resource的体积相对于jQuery小很多，另外Vue-resource是官方推出的。为什么不选择它呢？在Vue2.0退出后，Vue作者就在GitHub的Issues中说明了去掉vue-resource，并且以后也不会再更新。那么意味着以后vue-reource不再支持新的版本也不会再继续更新和维护，如果使用它对以后的项目开发和维护都存在很大的隐患。

**选择四: axios**

在说明不再继续更新和维护vue-resource的同时，作者还推荐了一个框架: axios。axios有非常多的优点并且用起来也非常方便，我们将对他详细学习。

## jsonp网络请求封装

在前端开发中我们一种常见的网络请求方式就是JSONP，使用JSONP最主要的原因往往是为了解决跨域访问的问题。

JSONP的原理是什么呢？JSONP的核心在于通过`<script>`标签的src来帮助我们请求数据，原因是我们的项目部署在domain1.com服务器上时，是不能直接访问domain2.com服务器上的资料的。这个时候我们利用`<script>`标签的src帮助我们去服务器请求到数据，将数据当做一个javascript的函数来执行并且执行的过程中传入我们需要的json。所以封装jsonp的核心就在于我们监听window上的jsonp进行回调时的名称。

JSONP如何封装呢？我们一起自己来封装一个处理JSONP的代码吧

```javascript
function jsonp(options) {
    options = options || {};
    if (!options.url || !options.callback) {
        throw new Error('请传入合法参数');
    }

    // 创建script标签，并加入到页面中
    // 返回的回调函数名，加入随机参数避免缓存
    var callbackName = ('jsonp_' + Math.random()).replace('.', '');
    // 获取head标签
    var head = document.getElementsByTagName('head')[0];
    // 填充回调函数名
    options.data[options.callback] = callbackName;
    // 格式化参数
    var paramas = formatParams(options.data);
    // 创建script标签
    var script = document.createElement('script');
    // 插入script标签的head
    head.appendChild(script);

    // 创建JSONP回调函数
    // window[callbackName]的形式，可是的回调函数可被全局调用
    window[callbackName] = function(json) {
        // script标签的哦src属性只在第一次设置时起作用，即script标签标签是无法重用的，故每次创建回调函数，即每次设置script标签是需要将前一个script以及其src移除
        head.removeChild(script);
        clearTimeout(script.timer);
        window[callbackName] = null;
        options.success && options.success(json);
    };

    // 发送请求

    script.src = options.url + '?' + paramas;
    // 超时处理
    if (options.timeout) {
        script.timer = setTimeout(function() {
            window[callbackName] = null;
            head.removeChild(script);
            options.fail && options.fail(message, '请求超时');
        }, timeout);
    }
}

//格式化参数
function formatParams(data) {
    var arr = [];
    for (var name in data) {
        arr.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[i]));
    }
    return arr.join('&');
}
```

## axios基本使用

### 为什么选择axios（ajax i/o system）

为什么选择axios? 作者推荐，功能特点

**功能特点**

- 在浏览器中发送 `XML.HttpRequests` 请求
- 在 node.js 中发送 `http`请求
- 支持 `Promise API`
- 拦截请求和响应
- 转换请求和响应数据
- ...

### 请求方式

**支持多种请求方式**

- axios(config)
- axios.request(config)
- axios.get(url[, config])
- axios.delete(url[, config])
- axios.head(url[, config])
- axios.post(url[, data[, config]])
- axios.put(url[, data[, config]])
- axios.patch(url[, data[, config]])

### 发送基本请求

**安装axios**

```javascript
npm install axios --save
```

**前端配置跨域**

```javascript
//vue.comfig.js
module.exports = {
    devServer: {
        //配置跨域
        proxy: {  
            '/api': {  ///配置跨域，将所有带有'/api'的请求都拦截，代理到target上
                target: 'http://mpolaris.top:8080', //目标ip地址
                ws: true,
                changOrigin: true,//允许跨域
                pathRewrite: {
                    '^/api': ''// 替换请求路径中的'/api'字符
                }
            }
        }
    }
}
```

**发送get请求**

```javascript
<script>
import axios from 'axios'

export default {
  name: 'app',
  created() {
    //1.没有请求参数
    axios.get('/api/portal/article/categories')
    .then(res => {
      console.log(res);
    }).catch(err => {
      console.log(err);
    })
    //2.有请求参数
    axios.get('/api/portal/article/label/',{
      params: {size: 3}
    }).then(res => {
      console.log(res);
    }).catch(err => {
      console.log(err);
    })
  }
}
</script>
```

**发送并行请求**

有时候,我们可能需求同时发送两个请求，使用`axios.all`, 可以放入多个请求的数组，`axios.all([])` 返回的结果是一个数组，使用 `axios.spread` 可将数组 `[res1,res2]` 展开为 res1, res2

```javascript
<script>
import axios from "axios";

export default {
  name: "app",
  created() {
    //发送并行请求
    axios
      .all([
        axios.get("/api/portal/article/categories"),
        axios.get("/api/portal/article/label/", {
          params: { size: 3 },
        }),
      ])
      .then(
        axios.spread((res1, res2) => {
          console.log(res1);
          console.log(res2);
        })
      );
  }
};
</script>
```

### 全局配置

在上面的示例中我们的 `BaseURL` 是固定的，事实上在开发中可能很多参数都是固定的，这个时候我们可以进行一些抽取，也可以利用axiox的全局配置属性 `defaults`。

```javascript
export default {
  name: "app",
  created() {
    //提取全局的配置
    axios.defaults.baseURL = '/api';
	axios.defaults.timeout = 5000;
    axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    //...
      
    axios
      .all([
        axios.get("/portal/article/categories"),
        axios.get("/portal/article/label/", {
          params: { size: 3 },
        }),
      ])
      .then(
        axios.spread((res1, res2) => {
          console.log(res1);
          console.log(res2);
        })
      );
  }
};
</script>
```

### axios常见的配置项

请求地址

- url: '/user'

请求类型

- method: 'get'

根路径

- baseURL: 'http://mpolaris.top:8080'

请求前的数据处理

- transformRequest: `[function(data){}]`

请求后的数据处理

- transformResponse: `[function(data){}]`

自定义的请求头

- headers: `{'x-Requested-With': 'XMLHttpRequest'}`

URL查询对象

- params: `{ id: 12 }`

查询对象序列化函数

- paramsSerializer: `function(params){ }`

request body

- data: `{ key: 'aa'}`

超时设置

- timeout: 1000,

跨域是否带Token

- withCredentials: false

自定义请求处理

- adapter: `function(resolve, reject, config){}`

身份验证信息

- auth: `{ uname: '', pwd: '12'}`

响应的数据格式 json / blob /document /arraybuffer / text / stream

- responseType: 'json'

## axios的实例和模块封装

### axios实例

为什么要创建axios的实例呢?

当我们从axios模块中导入对象时，使用的实例是默认的实例（全局axios）。当给该实例设置一些默认配置时这些配置就被固定下来了，但是后续开发中某些配置可能会不太一样。比如某些请求需要使用特定的baseURL或者timeout或者content-Type等，这个时候我们就可以创建新的实例并且传入属于该实例的配置信息。

```javascript
//创建新的实例
const axiosInstance = axios.create({
   baseURL: '/api',
   timeout: 2000,
   headers: {
     'Content-Type': 'application/x-www-form-urlencoded'
   }
});
//发送网络请求
axiosInstance({
   url: '/portal/article/categories',
   method: 'get'
}).then(res => {
   console.log(res);
})
```

### axios模块封装

```javascript
//utils/httpRequest.js

import axios from 'axios'

//1.初步封装，将结果或错误信息通过函数形参回调出去
// export function request(config,success,failure) {
//     //创建axios实例
//     const instance = axios.create({
//         baseURL: '/api',
//         timeout: 5000
//     });

//     instance(config).then(res => {
//         success(res);
//     }).catch(err => {
//         failure(err);
//     })
// }


// 2.改进：使用Promise封装
// export function request (config) {
//     return new Promise((resolve, reject) => {
//         //创建axios实例
//         const instance = axios.create({
//             baseURL: '/api',
//             timeout: 5000
//         });

//         //发送网络请求
//         instance(config).then(res => {
//             resolve(res);
//         }).catch(err => {
//             reject(err);
//         })
//     })
// }

// 3.改进：其实axios实例返回的就是一个Promise（看源码发现），所以
//      我们可以直接返回axios实例，在外面也可以直接调then和catch
export function request(config) {
    //创建axios实例
    const instance = axios.create({
        baseURL: '/api',
        timeout: 5000
    });

    //发送网络请求
    return instance(config);
}
```

```html
<script>
import { request } from "@/utils/httpRequest";

export default {
  name: "app",
  created() {
    // request(
    //   {
    //     url: "/portal/article/categories",
    //     method: "get",
    //   },res => {
    //     console.log(res);
    //   }, err => {
    //     console.log(err);
    //   }
    // );

    request({
      url: '/portal/article/categories',
      method: 'get'
    }).then(res => {
      console.log(res);
    }).catch(err => {
      console.log(err);

    })
  },
};
</script>
```

### 拦截器

axios提供了拦截器，用于我们在发送每次请求或者得到相应后进行对应的处理。

**给我们上面封装的请求加上拦截器**

```javascript
//utils/httpRequest.js

import axios from 'axios'

export function request(config) {
    //创建axios实例
    const instance = axios.create({
        baseURL: '/api',
        timeout: 5000
    });

    //配置请求和响应拦截,注意直接写axios就是全局拦截
    instance.interceptors.request.use(config => {
        console.log('这里是request拦截success中');
        return config
    }, err => {
        console.log('这里是request拦截器failure中');
        return err
    })

    instance.interceptors.response.use(response => {
        console.log('这里是response拦截success中');
        return response.data
    }, err => {
        console.log('这里是response拦截器failure中');
        return err
    })

    //发送网络请求
    return instance(config);
}
```


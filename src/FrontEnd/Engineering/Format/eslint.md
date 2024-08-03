---
order: 1
date: 2024-06-23
---
# eslint

## 理解

[官方文档](https://zh-hans.eslint.org/docs/latest/)

[官方文档中文](https://eslint.nodejs.cn/docs/latest/use/getting-started)

ESLint 是一个用于检测 ECMAScript/JavaScript 代码中的潜在问题和错误的工具，旨在使代码更一致并避免错误。它可以帮助开发者检测代码中的潜在问题，提高代码质量。

### 安装

方式一：以问题的形式，根据用户选择配置属性

```shell
pnpm create @eslint/config

# √ How would you like to use ESLint? · problems
# √ What type of modules does your project use? · esm
# √ Which framework does your project use? · vue
# √ Does your project use TypeScript? · typescript
# √ Where does your code run? · browser
# The config that you've selected requires the following dependencies:

# eslint@9.x, globals, @eslint/js, typescript-eslint, eslint-plugin-vue
# √ Would you like to install them now? · No / Yes
# √ Which package manager do you want to use? · pnpm
```


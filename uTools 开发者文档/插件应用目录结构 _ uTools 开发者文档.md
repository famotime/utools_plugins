# 插件应用目录结构 | uTools 开发者文档

---

- 插件应用目录结构 | uTools 开发者文档
- [https://www.u-tools.cn/docs/developer/information/file-structure.html](https://www.u-tools.cn/docs/developer/information/file-structure.html)
- uTools 开发者文档，帮助开发者快速上手 uTools 插件开发。
- 2025-08-09 12:02

---

# 插件应用目录结构

此部分会帮助你了解，通常情况下，一个插件应用的文件目录结构。

插件应用至少要有一个 `plugin.json` 作为入口，并配置 `logo` 字段以及 `main` 或者 `preload` 字段。

一个相对完整可打包成插件应用的目录可能是这样的：

shell

```
/{plugin}
|-- plugin.json
|-- preload.js
|-- index.html
|-- index.js
|-- index.css
|-- logo.png
```

## 源码编译

uTools 仅识别 `html + css + javascript`, 通常我们在开发过程中可能会使用各种的工具来辅助开发，比如 `vite`、`webpack` 等等，也可能会引入各种前端框架，比如 `vue`、`react`、`svelte` 等等，而这些代码并不是直接可以被 uTools 识别的，当我们打包插件应用前应该先将框架代码编译成普通的 html 、css、js 文件。通常是将源码编译输出到 dist 文件夹，然后**将 dist 文件夹打包成插件应用**，切勿将整个项目的根目录打包成插件应用。

## 第三方依赖

当你使用第三方依赖时，根据项目情况进行区分：

当你使用前端依赖时，只需要在项目的根目录下安装即可，对前端项目进行正常的编译，输出到 dist 文件夹。

当你使用 nodejs 的第三方依赖时，应当保证你的模块存在于 `preload.js` 同级目录，并且不要对它们进行编译操作，保证提交插件应用时的目录结构不变，并且源码清晰可读。

# dbStorage | uTools 开发者文档

---

- dbStorage | uTools 开发者文档
- [https://www.u-tools.cn/docs/developer/api-reference/db/db-storage.html](https://www.u-tools.cn/docs/developer/api-reference/db/db-storage.html)
- uTools 开发者文档，帮助开发者快速上手 uTools 插件开发。
- 2025-08-09 12:14

---

## dbStorage 

dbStorage 是基于 [本地数据库](https://www.u-tools.cn/docs/developer/api-reference/db/local-db.html) 基础上，封装的一套类似 [LocalStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage) 的 API，通过键值对形式存储数据，可以快速存取数据。

## `utools.dbStorage.setItem(key, value)` 

存储一个键值对数据，若键已存在，则覆盖它的值。

### 类型定义 

ts

```
function setItem(key: string, value: any): void;
```

- ​`key` 键值
- ​`value` 值

### 示例代码 

js

```
utools.dbStorage.setItem("key", "value");
```

## `utools.dbStorage.getItem(key)` 

获取一个键值对数据。

### 类型定义 

ts

```
function getItem(key: string): any;
```

- ​`key` 键值

### 示例代码 

js

```
const value = utools.dbStorage.getItem("key");
console.log(value);
```

## `utools.dbStorage.removeItem(key)` 

删除一个键值对数据。

### 类型定义 

ts

```
function removeItem(key: string): void;
```

- ​`key` 键值

### 示例代码 

js

```
utools.dbStorage.removeItem("key");
```

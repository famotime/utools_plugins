# AI | uTools 开发者文档

---

- AI | uTools 开发者文档
- [https://www.u-tools.cn/docs/developer/api-reference/utools/ai.html](https://www.u-tools.cn/docs/developer/api-reference/utools/ai.html)
- uTools 开发者文档，帮助开发者快速上手 uTools 插件开发。
- 2025-08-09 12:12

---

# AI

调用 AI 能力，支持 **Function Calling**

## `utools.ai(option[, streamCallback])`​

调用 AI

### 类型定义

[X]

流式调用[ ]

非流式调用

ts

```
function ai(
  option: AiOption,
  streamCallback: (chunk: Message) => void
): PromiseLike<void>; // 版本：>=7.0.0
```

- ​`option`: Ai 选项
- ​`streamCallback`: 流式调用函数 (可选)
- 返回定制的 `PromiseLike`​
- ​`AiOption` 类型定义  
  ts

  ```
  interface AiOption {
    model?: string;
    messages: Message[];
    tools?: Tool[];
  }
  ```

  #### AiOption 字段说明

  - ​`model`​

    - AI 模型, 为空默认使用 *deepseek-v3*
  - ​`messages`​

    - 消息列表
  - ​`tools`​

    - 工具列表
- ​`Message` 类型定义  
  ts

  ```
  interface Message {
    role: "system" | "user" | "assistant";
    content?: string;
    reasoning_content?: string;
  }
  ```

  #### Message 字段说明

  - ​`role`​

    - 消息角色

      - ​`system`：系统消息
      - ​`user`：用户消息
      - ​`assistant`：AI 消息
  - ​`content`​

    - 消息内容
  - ​`reasoning_content`​

    - 消息推理内容，一般只有推理模型会返回
- ​`Tool` 类型定义  
  ts

  ```
  interface Tool {
    type: "function";
    function?: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, any>;
      };
      required?: string[];
    };
  }
  ```

  #### Tool 字段说明

  - ​`type`​

    - 工具类型

      - ​`function`：函数工具
  - ​`function`​

    - 函数工具配置

      - ​`name`：函数名称
      - ​`description`：函数描述
      - ​`parameters`：函数参数

        - ​`type`：参数类型
        - ​`properties`：参数属性
      - ​`required`：必填参数

​`PromiseLike` 类型定义

​`PromiseLike` 是 `Promise` 的扩展类型，包含 `abort()` 函数

默认情况下，你可以单纯把它当作 `Promise` 来使用，但是扩展了 `abort()` 函数，可以让你在调用 AI 过程中，执行 `abort()` 中止调用。

ts

```
interface PromiseLike<T> extends Promise<T> {
  abort(): void;
}
```

#### PromiseLike 字段说明

- ​`abort()`​

  - 中止 AI 调用

### 示例代码

---

#### AI 对话

[X]

流式调用[ ]

非流式调用

js

```
const messages = [
  {
    role: "system",
    content:
      "你是一个英文翻译专家，将用户的任何内容都翻译成英文，翻译结果要符合英文语言习惯",
  },
  {
    role: "user",
    content: "uTools 是一种高效工作方式",
  },
];

await utools.ai({ messages }, (chunk) => {
  console.log(chunk);
});
```

---

#### Function Calling 调用

WARNING

**Function Calling** 功能调用的函数**必须**挂到 `window` 对象上，例如：`window.getSystemInfo`​

[X]

App.jsx[ ]

preload.js

js

```
const messages = [
  {
    role: "user",
    content: "我电脑的 CPU 是什么，内存多大",
  },
];
const tools = [
  {
    type: "function",
    function: {
      name: "getSystemInfo",
      description: "获取用户的电脑信息",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

// 流式调用
await utools.ai({ messages, tools }, (delta) => {
  console.log(delta);
});
// 非流式调用
const result = await utools.ai({ messages, tools });
console.log(result.content);
```

## `utools.allAiModels()`​

获取所有 AI 模型

### 类型定义

ts

```
function allAiModels(): Promise<AiModel[]>; // 版本：>=7.0.0
```

- 在 `Promise` 内返回 `AiModel` 数组

### AiModel 类型定义

- ​`AiModel` 类型定义  
  ts

  ```
  interface AiModel {
    id: string;
    label: string;
    description: string;
    icon: string;
    cost: number;
  }
  ```

  #### AiModel 字段说明

  - ​`id`​

    - AI 模型 ID，用于 `utools.ai` 调用的 `model` 参数
  - ​`label`​

    - AI 模型名称
  - ​`description`​

    - AI 模型描述
  - ​`icon`​

    - AI 模型图标
  - ​`cost`​

    - AI 模型调用消耗

### 示例代码

js

```
const models = await utools.allAiModels();
console.log(models);
```

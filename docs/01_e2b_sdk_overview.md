# E2B SDK 深度分析

## 1. E2B SDK 概述

E2B SDK 是一个为 AI 代码执行提供安全沙箱环境的工具包，它允许开发者在隔离的环境中执行不受信任的代码，特别适合与 AI 模型（如 OpenAI 的 GPT 系列）集成，实现安全的代码解释器功能。

E2B SDK 主要提供以下语言版本：
- JavaScript/TypeScript SDK (`@e2b/code-interpreter`)
- Python SDK (`e2b_code_interpreter`)

## 2. 核心组件分析

### 2.1 沙箱 (Sandbox) 类

沙箱是 E2B 的核心概念，它提供了一个隔离的执行环境。从代码中可以看出：

#### TypeScript 版本:
```typescript
import 'dotenv/config'
import { Sandbox } from '@e2b/code-interpreter'

async function main() {
  const sbx = await Sandbox.create() // 默认沙箱存活5分钟
  const execution = await sbx.runCode('print("hello world")') // 在沙箱中执行Python代码
  console.log(execution.logs)

  const files = await sbx.files.list('/') // 列出沙箱中的文件
  console.log(files)
}
```

#### Python 版本:
```python
from e2b_code_interpreter import Sandbox

# 使用上下文管理器创建沙箱
with Sandbox() as sandbox:
    execution = sandbox.run_code(code)
    result = execution.text
```

沙箱提供的主要功能：
- 代码执行 (`runCode`/`run_code`)
- 文件系统操作 (`files.list`)
- 资源管理（自动清理）

### 2.2 代码执行结果

执行结果对象包含代码运行的输出和状态：

```typescript
// TypeScript
const execution = await sbx.runCode('print("hello world")')
console.log(execution.logs) // 输出执行日志
```

```python
# Python
execution = sandbox.run_code(code)
result = execution.text # 获取执行结果文本
```

### 2.3 与 OpenAI 集成

E2B SDK 设计为与 AI 模型无缝集成，特别是 OpenAI 的模型。代码展示了两种集成方式：

#### 基本集成:
```python
# 1. 使用OpenAI生成代码
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": prompt}
    ]
)
code = response.choices[0].message.content

# 2. 在E2B沙箱中执行代码
with Sandbox() as sandbox:
    execution = sandbox.run_code(code)
    result = execution.text
```

#### 函数调用集成:
```python
# 1. 定义代码执行工具
tools = [{
    "type": "function",
    "function": {
        "name": "execute_python",
        "description": "Execute python code in a Jupyter notebook cell and return result",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The python code to execute in a single cell"
                }
            },
            "required": ["code"]
        }
    }
}]

# 2. AI模型决定何时使用工具
response = client.chat.completions.create(
    model=model,
    messages=messages,
    tools=tools,
)

# 3. 执行AI生成的代码并返回结果
if response_message.tool_calls:
    for tool_call in response_message.tool_calls:
        if tool_call.function.name == "execute_python":
            with Sandbox() as sandbox:
                code = json.loads(tool_call.function.arguments)['code']
                execution = sandbox.run_code(code)
                result = execution.text
```

## 3. E2B SDK 的技术特点

### 3.1 安全隔离

E2B SDK 基于 Firecracker 微型虚拟机提供强大的安全隔离，确保执行的代码不会影响宿主系统：

- 每个沙箱都在独立的微型虚拟机中运行
- 资源限制防止过度使用
- 网络隔离控制外部访问

### 3.2 易用的 API

SDK 提供了简洁的 API，隐藏了底层复杂性：

```typescript
// 创建沙箱
const sbx = await Sandbox.create()

// 执行代码
const execution = await sbx.runCode('print("hello world")')

// 文件操作
const files = await sbx.files.list('/')
```

### 3.3 资源管理

E2B SDK 自动处理资源生命周期：

- 默认沙箱存活时间为 5 分钟
- Python 版本支持上下文管理器 (`with` 语句)
- 自动清理未使用的资源

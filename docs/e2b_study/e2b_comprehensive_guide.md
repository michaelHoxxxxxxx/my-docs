# E2B 完整使用指南

基于 e2b-cookbook 的深入分析，这份指南将带你全面了解 E2B（Elastic Execution Boundary）的使用方法和最佳实践。

## 目录

1. [E2B 概述](#e2b-概述)
2. [核心概念](#核心概念)
3. [快速开始](#快速开始)
4. [LLM 集成模式](#llm-集成模式)
5. [高级用法](#高级用法)
6. [最佳实践](#最佳实践)
7. [实际应用案例](#实际应用案例)

## E2B 概述

E2B 是一个安全的云端代码执行环境，专为 AI 应用设计。它提供了一个隔离的沙箱环境，让大语言模型能够安全地执行代码。

### 主要特性

- **安全隔离**: 完全隔离的执行环境
- **多语言支持**: 主要支持 Python，也支持其他语言
- **实时流式输出**: 支持流式接收执行结果
- **持久化会话**: 保持执行状态和变量
- **文件管理**: 上传/下载文件能力
- **可视化支持**: 支持图表、图像生成

## 核心概念

### Sandbox（沙箱）

沙箱是 E2B 的核心概念，代表一个独立的执行环境：

```typescript
import { Sandbox } from '@e2b/code-interpreter'

// 创建沙箱
const sandbox = await Sandbox.create()

// 执行代码
const execution = await sandbox.runCode('print("Hello World")')

// 清理资源
await sandbox.kill()
```

### 执行结果（Execution Result）

每次代码执行都会返回包含以下信息的结果：

- `results`: 执行结果（图表、图像等）
- `logs`: 标准输出和错误输出
- `error`: 执行错误信息

## 快速开始

### TypeScript/JavaScript 版本

#### 1. 基础 Hello World

```typescript
import 'dotenv/config'
import { Sandbox } from '@e2b/code-interpreter'

async function run() {
  const sbx = await Sandbox.create() // 沙箱默认存活5分钟
  const execution = await sbx.runCode('print("hello world")') // 在沙箱中执行Python代码
  console.log(execution.logs)

  const files = await sbx.files.list('/')
  console.log(files)
}

run()
```

#### 2. 流式输出处理

```typescript
const execution = await sandbox.runCode(code, {
  onStderr: (msg: OutputMessage) => console.log('[stderr]', msg),
  onStdout: (stdout: OutputMessage) => console.log('[stdout]', stdout),
  onResult: (result) => console.log('[result]', result)
})
```

### Python 版本

```python
from dotenv import load_dotenv
load_dotenv()
from e2b_code_interpreter import Sandbox

def main():
    sbx = Sandbox() # 沙箱默认存活5分钟
    execution = sbx.run_code("print('hello world')") # 在沙箱中执行Python代码
    print(execution.logs)

    files = sbx.files.list("/")
    print(files)
```

## LLM 集成模式

### 1. OpenAI 集成

```typescript
import OpenAI from 'openai'
import { Sandbox, Result } from '@e2b/code-interpreter'

const SYSTEM_PROMPT = `
你是一个 Python 数据科学家。你被给予任务来完成，你运行 Python 代码来解决它们。

- Python 代码在 Jupyter notebook 中运行
- 每次调用 execute_python 工具时，Python 代码在单独的单元格中执行
- 使用 matplotlib 或其他可视化库直接在 notebook 中显示可视化
- 你可以访问互联网并进行 API 请求
- 你可以访问文件系统并读取/写入文件
- 你可以安装任何 pip 包（如果存在的话）
- 你可以运行任何 Python 代码，一切都在安全的沙箱环境中运行
`

const tools = [
  {
    type: 'function',
    function: {
      name: 'execute_python',
      description: '在 Jupyter notebook 单元格中执行 Python 代码并返回结果、stdout、stderr 和错误',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '要在单个单元格中执行的 Python 代码'
          }
        },
        required: ['code']
      }
    }
  }
]

async function codeInterpret(codeInterpreter: Sandbox, code: string): Promise<Result[]> {
  console.log('运行代码解释器...')
  
  const exec = await codeInterpreter.runCode(code, {
    onStderr: (msg) => console.log('[代码解释器 stderr]', msg),
    onStdout: (stdout) => console.log('[代码解释器 stdout]', stdout),
  })

  if (exec.error) {
    console.log('[代码解释器 错误]', exec.error)
    throw new Error(exec.error.value)
  }
  return exec.results
}

const client = new OpenAI()

async function chatWithLLM(codeInterpreter: Sandbox, userMessage: string): Promise<Result[]> {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    tools: tools,
    tool_choice: 'auto'
  })

  const message = completion.choices[0].message

  if (message.tool_calls) {
    const toolCall = message.tool_calls[0]
    const toolInput = JSON.parse(toolCall.function.arguments)
    return await codeInterpret(codeInterpreter, toolInput.code)
  }
  
  throw new Error('未找到工具调用')
}
```

### 2. Anthropic Claude 集成

```typescript
import { Anthropic } from '@anthropic-ai/sdk'

const tools: Array<Anthropic.Tool> = [
  {
    name: 'execute_python',
    description: '在 Jupyter notebook 单元格中执行 Python 代码并返回结果、stdout、stderr 和错误',
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要在单个单元格中执行的 Python 代码'
        }
      },
      required: ['code']
    }
  }
]

async function chatWithClaude(codeInterpreter: Sandbox, userMessage: string): Promise<Result[]> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    system: SYSTEM_PROMPT,
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
    tools: tools,
  })

  if (message.stop_reason === 'tool_use') {
    const toolUse = message.content.find(block => block.type === 'tool_use') as Anthropic.ToolUseBlock
    if (!toolUse) {
      console.error('在消息内容中未找到工具使用块')
      return []
    }

    const toolName = toolUse.name
    const toolInput = toolUse.input

    if (toolName === 'execute_python') {
      return await codeInterpret(codeInterpreter, toolInput['code'])
    }
  }
  
  throw new Error('在消息内容中未找到工具使用块')
}
```

### 3. LangChain 集成

```python
import os
import json
from typing import Any, List
from langchain_core.tools import Tool
from pydantic.v1 import BaseModel, Field
from e2b_code_interpreter import Sandbox

class LangchainCodeInterpreterToolInput(BaseModel):
    code: str = Field(description="要执行的 Python 代码")

class CodeInterpreterFunctionTool:
    """
    这个类针对 Python Jupyter notebook 调用任意代码。
    它需要 E2B_API_KEY 来创建沙箱。
    """

    tool_name: str = "code_interpreter"

    def __init__(self):
        if "E2B_API_KEY" not in os.environ:
            raise Exception(
                "Code Interpreter 工具被调用时未设置 E2B_API_KEY 环境变量。"
                "请在 https://e2b.dev/docs 获取您的 E2B api key 并设置 E2B_API_KEY 环境变量。"
            )
        self.code_interpreter = Sandbox()

    def close(self):
        self.code_interpreter.kill()

    def call(self, parameters: dict, **kwargs: Any):
        code = parameters.get("code", "")
        print(f"***代码解释中...\n{code}\n====")
        execution = self.code_interpreter.run_code(code)
        return {
            "results": execution.results,
            "stdout": execution.logs.stdout,
            "stderr": execution.logs.stderr,
            "error": execution.error,
        }

    def langchain_call(self, code: str):
        return self.call({"code": code})

    def to_langchain_tool(self) -> Tool:
        tool = Tool(
            name=self.tool_name,
            description="在 Jupyter notebook 单元格中执行 Python 代码并返回任何富数据（如图表）、stdout、stderr 和错误。",
            func=self.langchain_call,
        )
        tool.args_schema = LangchainCodeInterpreterToolInput
        return tool
```

## 高级用法

### 1. 文件管理

```typescript
// 上传文件
const fileBuffer = fs.readFileSync('./data.csv')
const remotePath = await sandbox.files.write('data.csv', fileBuffer)

// 列出文件
const files = await sandbox.files.list('/')

// 读取文件
const content = await sandbox.files.read('/path/to/file')

// 删除文件
await sandbox.files.remove('/path/to/file')
```

### 2. 会话管理和重连

```typescript
// 创建带有元数据的沙箱
const sandbox = await Sandbox.create({
  apiKey: E2B_API_KEY,
  metadata: { sessionID: 'user-session-123' },
  timeoutMs: 10 * 60 * 1000 // 10 分钟
})

// 重连到现有沙箱
async function getSandbox(sessionID: string) {
  const sandboxes = await Sandbox.list()
  
  const sandboxID = sandboxes.find(
    sandbox => sandbox.metadata?.sessionID === sessionID
  )?.sandboxId

  if (sandboxID) {
    // 重连到现有沙箱
    const sandbox = await Sandbox.connect(sandboxID, { apiKey: E2B_API_KEY })
    await sandbox.setTimeout(sandboxTimeout)
    return sandbox
  } else {
    // 创建新沙箱
    return await Sandbox.create({
      apiKey: E2B_API_KEY,
      metadata: { sessionID },
      timeoutMs: sandboxTimeout
    })
  }
}
```

### 3. 流式处理

```typescript
const execution = await sandbox.runCode(code, {
  onStdout: (output) => {
    // 实时处理标准输出
    console.log('stdout:', output.line)
  },
  onStderr: (output) => {
    // 实时处理错误输出
    console.log('stderr:', output.line)
  },
  onResult: (result) => {
    // 实时处理执行结果（图表、图像等）
    if (result.png) {
      // 处理 PNG 图像
      console.log('生成了图像')
    }
    if (result.text) {
      // 处理文本结果
      console.log('文本结果:', result.text)
    }
  }
})
```

### 4. Next.js 集成示例

```typescript
// app/api/chat/route.ts
import { OpenAIStream, StreamingTextResponse, Tool } from 'ai'
import OpenAI from 'openai'
import { evaluateCode } from './codeInterpreter'

const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'execute_python_code',
      description: '通过代码解释器在 Jupyter Notebook 中执行 Python 代码',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '将通过 Jupyter Notebook 直接执行的 Python 代码'
          }
        },
        required: ['code']
      }
    }
  }
]

export async function POST(req: Request) {
  const { messages, sessionID } = await req.json()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    stream: true,
    messages,
    tools,
    tool_choice: 'auto'
  })

  const stream = OpenAIStream(response, {
    experimental_onToolCall: async (call, appendToolCallMessage) => {
      for (const toolCall of call.tools) {
        if (toolCall.func.name === 'execute_python_code') {
          const evaluation = await evaluateCode(
            sessionID, 
            toolCall.func.arguments.code as string
          )
          
          // 返回工具调用结果
          const msgs = appendToolCallMessage({
            tool_call_id: toolCall.id,
            function_name: 'execute_python_code',
            tool_call_result: {
              stdout: evaluation.stdout,
              stderr: evaluation.stderr,
              results: evaluation.results.map(result => result.text).filter(Boolean)
            }
          })
          
          return msgs
        }
      }
    }
  })

  return new StreamingTextResponse(stream)
}
```

## 最佳实践

### 1. 资源管理

```typescript
// ✅ 正确：总是清理资源
async function runAnalysis() {
  const sandbox = await Sandbox.create()
  
  try {
    // 执行代码
    const result = await sandbox.runCode('print("分析完成")')
    return result
  } finally {
    // 确保清理资源
    await sandbox.kill()
  }
}

// ✅ 正确：设置适当的超时时间
const sandbox = await Sandbox.create({
  timeoutMs: 10 * 60 * 1000 // 10分钟
})
```

### 2. 错误处理

```typescript
async function safeCodeExecution(sandbox: Sandbox, code: string) {
  try {
    const execution = await sandbox.runCode(code)
    
    if (execution.error) {
      console.error('执行错误:', execution.error)
      return {
        success: false,
        error: execution.error.value,
        traceback: execution.error.traceback
      }
    }
    
    return {
      success: true,
      results: execution.results,
      logs: execution.logs
    }
  } catch (error) {
    console.error('沙箱错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 3. 数据上传优化

```typescript
// ✅ 正确：处理大文件上传
async function uploadLargeDataset(sandbox: Sandbox, filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('数据集文件未找到')
    }
    
    const fileStats = fs.statSync(filePath)
    console.log(`上传文件大小: ${fileStats.size} 字节`)
    
    const fileBuffer = fs.readFileSync(filePath)
    const remotePath = await sandbox.files.write(
      path.basename(filePath), 
      fileBuffer
    )
    
    console.log('文件上传到:', remotePath)
    return remotePath
  } catch (error) {
    console.error('文件上传错误:', error)
    throw error
  }
}
```

### 4. 系统提示词优化

```typescript
const OPTIMIZED_SYSTEM_PROMPT = `
你是一个专业的 Python 数据科学家和代码解释器。

## 你的角色和上下文
- 你被给予数据分析和可视化任务
- 你在安全的 Jupyter notebook 环境中运行 Python 代码
- 你有访问常见数据科学库（pandas、numpy、matplotlib、seaborn 等）

## 执行规则
- 每次 execute_python 调用在单独的单元格中执行代码
- 保持代码简洁且有良好的注释
- 使用 matplotlib/seaborn 直接在 notebook 中显示可视化
- 如果需要安装额外的包，使用 pip install
- 处理错误时提供清晰的错误信息和建议

## 输出格式
- 工具响应中的 "[图表]" 表示在 notebook 中生成了图表
- 始终解释你的分析步骤和发现
- 如果分析失败，提供故障排除建议

## 数据处理最佳实践
- 在分析前检查数据结构和质量
- 处理缺失值和异常值
- 使用适当的数据类型
- 提供数据摘要和洞察
`
```

## 实际应用案例

### 1. 数据分析应用

```typescript
// 温度数据分析示例
async function analyzeTemperatureData() {
  const sandbox = await Sandbox.create()
  
  try {
    // 上传数据集
    const datasetPath = await uploadDataset(sandbox, './city_temperature.csv')
    
    // 分析任务
    const analysisCode = `
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# 读取数据
df = pd.read_csv('${datasetPath}')
print("数据集形状:", df.shape)
print("\\n列信息:")
print(df.info())

# 分析全球最热的5个城市
top_hot_cities = df.groupby('City')['AvgTemperature'].mean().nlargest(5)
print("\\n全球最热的5个城市:")
print(top_hot_cities)

# 创建可视化
plt.figure(figsize=(12, 6))
top_hot_cities.plot(kind='bar')
plt.title('全球最热的5个城市平均温度')
plt.xlabel('城市')
plt.ylabel('平均温度 (°C)')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
`
    
    const result = await sandbox.runCode(analysisCode)
    
    // 保存生成的图表
    if (result.results[0]?.png) {
      fs.writeFileSync(
        'temperature_analysis.png', 
        Buffer.from(result.results[0].png, 'base64')
      )
    }
    
    return result
  } finally {
    await sandbox.kill()
  }
}
```

### 2. 机器学习工作流

```typescript
async function mlWorkflow() {
  const sandbox = await Sandbox.create()
  
  try {
    // 数据准备
    await sandbox.runCode(`
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import matplotlib.pyplot as plt

# 生成示例数据
from sklearn.datasets import make_classification
X, y = make_classification(n_samples=1000, n_features=20, n_informative=2, 
                          n_redundant=10, n_classes=2, random_state=42)

# 数据分割
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"训练集大小: {X_train.shape}")
print(f"测试集大小: {X_test.shape}")
`)
    
    // 模型训练
    await sandbox.runCode(`
# 训练随机森林模型
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# 预测
y_pred = rf_model.predict(X_test)

# 评估
accuracy = accuracy_score(y_test, y_pred)
print(f"模型准确率: {accuracy:.4f}")
print("\\n分类报告:")
print(classification_report(y_test, y_pred))
`)
    
    // 特征重要性可视化
    const visualizationResult = await sandbox.runCode(`
# 特征重要性可视化
feature_importance = rf_model.feature_importances_
indices = np.argsort(feature_importance)[::-1]

plt.figure(figsize=(12, 6))
plt.title("特征重要性")
plt.bar(range(X.shape[1]), feature_importance[indices])
plt.xticks(range(X.shape[1]), [f"特征 {i}" for i in indices], rotation=90)
plt.tight_layout()
plt.show()
`)
    
    return visualizationResult
  } finally {
    await sandbox.kill()
  }
}
```

### 3. Web 应用中的实时代码执行

```typescript
// 实时代码执行 API
export async function executeCode(sessionId: string, code: string) {
  const sandbox = await getSandbox(sessionId)
  
  try {
    const execution = await sandbox.runCode(code, {
      onStdout: (output) => {
        // 通过 WebSocket 发送实时输出
        websocket.send(JSON.stringify({
          type: 'stdout',
          content: output.line
        }))
      },
      onResult: (result) => {
        // 发送结果（图表、图像等）
        if (result.png) {
          websocket.send(JSON.stringify({
            type: 'image',
            content: result.png,
            format: 'png'
          }))
        }
      }
    })
    
    return {
      success: true,
      results: execution.results,
      logs: execution.logs
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

## 总结

E2B 为 AI 应用提供了强大的代码执行能力，让大语言模型能够安全地运行代码并生成数据分析、可视化和机器学习模型。通过本指南中的模式和最佳实践，你可以：

- 快速集成 E2B 到你的 AI 应用中
- 实现安全的代码执行环境
- 构建交互式的数据分析工具
- 创建功能丰富的代码解释器

记住始终遵循最佳实践，特别是资源管理和错误处理，以确保你的应用稳定可靠。
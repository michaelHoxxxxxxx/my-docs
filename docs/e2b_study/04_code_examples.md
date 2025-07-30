# E2B SDK 代码示例分析

## 1. TypeScript 示例分析

以下是 E2B SDK 在 TypeScript 中的基本用法示例：

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

main().catch(console.error)
```

### 1.1 代码解析

1. **环境设置**：
   - `import 'dotenv/config'` - 加载环境变量，包括 E2B API 密钥
   - `import { Sandbox } from '@e2b/code-interpreter'` - 导入沙箱类

2. **沙箱创建**：
   - `const sbx = await Sandbox.create()` - 异步创建沙箱实例
   - 默认沙箱生命周期为 5 分钟

3. **代码执行**：
   - `const execution = await sbx.runCode('print("hello world")')`
   - 执行 Python 代码并获取结果

4. **文件系统操作**：
   - `const files = await sbx.files.list('/')`
   - 列出沙箱根目录下的所有文件

5. **错误处理**：
   - `main().catch(console.error)` - 捕获并打印任何错误

## 2. Python 基本示例分析

以下是 E2B SDK 在 Python 中的基本用法：

```python
from e2b_code_interpreter import Sandbox

# 使用上下文管理器创建沙箱
with Sandbox() as sandbox:
    execution = sandbox.run_code('print("hello world")')
    result = execution.text
    print(result)
```

### 2.1 代码解析

1. **导入**：
   - `from e2b_code_interpreter import Sandbox` - 导入沙箱类

2. **沙箱创建与管理**：
   - `with Sandbox() as sandbox:` - 使用上下文管理器创建沙箱
   - 自动处理沙箱的创建和销毁

3. **代码执行**：
   - `execution = sandbox.run_code('print("hello world")')`
   - 执行 Python 代码并获取结果

4. **结果处理**：
   - `result = execution.text` - 获取执行结果的文本输出
   - `print(result)` - 打印结果

## 3. Python 与 OpenAI 集成示例

以下示例展示了如何将 E2B SDK 与 OpenAI API 集成：

```python
from openai import OpenAI
from e2b_code_interpreter import Sandbox
from dotenv import load_dotenv

# 加载.env文件中的环境变量
load_dotenv()

# 创建OpenAI客户端，自动使用OPENAI_API_KEY环境变量
client = OpenAI()
system = "You are a helpful assistant that can execute python code in a Jupyter notebook. Only respond with the code to be executed and nothing else. Strip backticks in code blocks."
prompt = "Calculate how many r's are in the word 'strawberry'"

# 发送消息到OpenAI API
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": prompt}
    ]
)

# 从响应中提取代码
code = response.choices[0].message.content

# 在E2B沙箱中执行代码
if code:
    with Sandbox() as sandbox:
        execution = sandbox.run_code(code)
        result = execution.text

    print(result)
```

### 3.1 代码解析

1. **环境设置**：
   - `from dotenv import load_dotenv` - 导入环境变量加载工具
   - `load_dotenv()` - 加载环境变量，包括 OpenAI 和 E2B API 密钥

2. **OpenAI 客户端**：
   - `client = OpenAI()` - 创建 OpenAI 客户端
   - 使用环境变量中的 API 密钥

3. **提示设计**：
   - 系统提示指导 AI 只返回可执行的 Python 代码
   - 用户提示提出具体问题

4. **API 调用**：
   - `response = client.chat.completions.create(...)` - 调用 OpenAI API
   - 获取 AI 生成的代码

5. **代码执行**：
   - `with Sandbox() as sandbox:` - 创建 E2B 沙箱
   - `execution = sandbox.run_code(code)` - 执行 AI 生成的代码
   - `result = execution.text` - 获取执行结果

## 4. 函数调用高级示例

以下示例展示了如何使用 OpenAI 的函数调用功能与 E2B SDK 集成：

```python
import json
from openai import OpenAI
from e2b_code_interpreter import Sandbox
from dotenv import load_dotenv

# 加载.env文件中的环境变量
load_dotenv()

# 创建OpenAI客户端
client = OpenAI()
model = "gpt-4o"

# 定义消息
messages = [
    {
        "role": "user",
        "content": "Calculate how many r's are in the word 'strawberry'"
    }
]

# 定义工具
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

# 使用OpenAI生成文本
response = client.chat.completions.create(
    model=model,
    messages=messages,
    tools=tools,
)

# 将响应消息添加到消息列表
response_message = response.choices[0].message
messages.append(response_message)

# 打印模型返回的工具调用信息
if response_message.tool_calls:
    tool_call = response_message.tool_calls[0]
    print(f"模型决定使用工具: {tool_call.function.name}")
    print(f"工具参数: {tool_call.function.arguments}")
    print("生成的Python代码:")
    code = json.loads(tool_call.function.arguments)['code']
    print(f"\n{code}\n")

# 如果模型调用了工具，则执行
if response_message.tool_calls:
    for tool_call in response_message.tool_calls:
        if tool_call.function.name == "execute_python":
            # 创建沙箱并执行代码
            print("在E2B沙箱中执行代码...")
            with Sandbox() as sandbox:
                code = json.loads(tool_call.function.arguments)['code']
                execution = sandbox.run_code(code)
                result = execution.text
                print(f"执行结果: {result}")

            # 将结果发送回模型
            messages.append({
                "role": "tool",
                "name": "execute_python",
                "content": result,
                "tool_call_id": tool_call.id,
            })

# 生成最终响应
print("\n生成最终回答...")
final_response = client.chat.completions.create(
    model=model,
    messages=messages
)

print("\n最终回答:")
print(final_response.choices[0].message.content)
```

### 4.1 代码解析

1. **工具定义**：
   - 定义了一个名为 `execute_python` 的函数工具
   - 指定了参数结构和描述

2. **工具调用流程**：
   - 向 OpenAI 发送请求，包含消息和工具定义
   - AI 模型决定是否使用工具
   - 解析工具调用参数，提取 Python 代码
   - 在 E2B 沙箱中执行代码
   - 将执行结果作为工具响应发送回 AI 模型
   - 生成最终回答

3. **完整对话循环**：
   - 用户提问 → AI 决定使用工具 → 执行代码 → 结果反馈给 AI → AI 生成最终回答

## 5. 高级功能示例

### 5.1 文件上传与处理

```typescript
import { Sandbox } from '@e2b/code-interpreter'
import fs from 'fs'

async function processFile() {
  const sbx = await Sandbox.create()
  
  // 上传文件到沙箱
  await sbx.files.write('/data.csv', fs.readFileSync('./local_data.csv'))
  
  // 执行代码处理文件
  const execution = await sbx.runCode(`
    import pandas as pd
    import matplotlib.pyplot as plt
    
    # 读取数据
    df = pd.read_csv('/data.csv')
    
    # 数据处理
    result = df.describe()
    
    # 创建可视化
    plt.figure(figsize=(10, 6))
    df.plot(kind='bar')
    plt.savefig('/output.png')
    
    print(result)
  `)
  
  // 下载处理结果
  const outputImage = await sbx.files.read('/output.png')
  fs.writeFileSync('./result.png', outputImage)
  
  console.log(execution.logs)
  await sbx.close()
}

processFile().catch(console.error)
```

### 5.2 长时间运行的进程

```python
from e2b_code_interpreter import Sandbox

with Sandbox() as sandbox:
    # 安装依赖
    sandbox.run_code('!pip install flask')
    
    # 创建一个简单的 Flask 应用
    sandbox.run_code('''
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def hello():
        return "Hello from E2B Sandbox!"
    
    if __name__ == '__main__':
        app.run(host='0.0.0.0', port=8080)
    ''', background=True)  # 在后台运行
    
    # 获取端口转发信息
    port_info = sandbox.get_port_forwarding(8080)
    print(f"Web服务运行在: {port_info.url}")
    
    # 保持沙箱运行
    input("按Enter键结束...")
```

## 6. 最佳实践总结

1. **环境变量管理**：
   - 使用 `dotenv` 管理 API 密钥
   - 避免在代码中硬编码敏感信息

2. **资源管理**：
   - 使用上下文管理器（Python）或 try/finally（TypeScript）确保资源释放
   - 设置合理的超时时间

3. **错误处理**：
   - 捕获并处理可能的异常
   - 提供有意义的错误信息给用户

4. **安全考虑**：
   - 限制沙箱的网络访问
   - 设置资源使用限制
   - 验证和过滤用户输入

5. **性能优化**：
   - 重用沙箱实例处理多个请求
   - 预加载常用依赖
   - 使用文件缓存减少重复操作

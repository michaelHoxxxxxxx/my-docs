# E2B 零基础入门指南

这份指南专为没有编程基础的小白用户设计，将从最基本的概念开始，逐步带你了解和使用 E2B。

## 目录

1. [什么是 E2B？](#什么是-e2b)
2. [编程基础概念](#编程基础概念)
3. [第一个 E2B 程序](#第一个-e2b-程序)
4. [理解代码的每一行](#理解代码的每一行)
5. [与 AI 聊天机器人结合](#与-ai-聊天机器人结合)
6. [实际应用示例](#实际应用示例)
7. [常见问题解答](#常见问题解答)

## 什么是 E2B？

### 简单比喻

想象一下：
- 你有一个非常聪明的 AI 助手（比如 ChatGPT、Claude）
- 这个 AI 助手能够编写代码来帮你分析数据、制作图表
- 但是问题来了：AI 写的代码需要在哪里运行呢？

**E2B 就像是为 AI 提供的一个"虚拟电脑"**，让 AI 可以安全地运行代码，就像给 AI 分配了一台专门的电脑一样。

### E2B 的作用

1. **安全隔离**：AI 运行的代码不会影响你的真实电脑
2. **即开即用**：不需要你自己安装各种编程软件
3. **强大功能**：已经预装了数据分析、绘图等常用工具
4. **实时协作**：你可以看到 AI 正在做什么，结果立即显示

## 编程基础概念

在开始之前，我们需要了解一些基本概念：

### 1. 代码是什么？

代码就是给电脑的指令，就像菜谱一样：
```
菜谱：先切菜，再炒菜，最后装盘
代码：先读取数据，再分析数据，最后生成图表
```

### 2. 编程语言

就像人类有不同的语言（中文、英文），电脑也有不同的编程语言：
- **Python**：最适合数据分析的语言（E2B 主要使用）
- **JavaScript/TypeScript**：网页和应用开发语言

### 3. 函数（Function）

函数就像一个工具箱，你给它一些材料，它帮你做出成品：
```
输入：面粉 + 鸡蛋 + 牛奶
函数：制作蛋糕
输出：蛋糕
```

在编程中：
```
输入：数据
函数：分析数据
输出：图表或结果
```

### 4. 变量（Variable）

变量就像一个盒子，用来存储信息：
```
盒子标签：我的年龄
盒子内容：25
```

在代码中：
```javascript
let myAge = 25  // 创建一个叫 myAge 的盒子，里面放数字 25
```

## 第一个 E2B 程序

让我们从最简单的例子开始：

### TypeScript 版本（适合网页应用）

```typescript
// 这是一行注释，以 // 开头，用来解释代码的作用
// 注释不会被执行，只是给人看的说明

// 第一步：导入需要的工具
import 'dotenv/config'                    // 导入环境配置工具
import { Sandbox } from '@e2b/code-interpreter'  // 导入 E2B 的沙箱工具

// 第二步：定义一个异步函数（可以等待其他操作完成的函数）
async function run() {
  
  // 第三步：创建一个虚拟电脑（沙箱）
  // 就像租一台云端电脑，默认可以使用 5 分钟
  const sbx = await Sandbox.create()
  
  // 第四步：让虚拟电脑执行 Python 代码
  // 'print("hello world")' 是 Python 代码，意思是显示 "hello world"
  const execution = await sbx.runCode('print("hello world")')
  
  // 第五步：显示执行结果
  // execution.logs 包含了代码运行时的输出信息
  console.log(execution.logs)

  // 第六步：查看虚拟电脑里有什么文件
  // '/' 表示根目录，就像电脑的 C 盘
  const files = await sbx.files.list('/')
  console.log(files)
}

// 第七步：运行我们定义的函数
run()
```

### 详细解释每一行

让我们更详细地解释上面的代码：

#### 第一行：导入配置
```typescript
import 'dotenv/config'
```
**作用**：这行代码导入了一个叫 `dotenv` 的工具。
**比喻**：就像打开一个配置文件，里面存放着各种设置（比如你的 E2B 账号信息）。
**为什么需要**：E2B 需要知道你是谁，才能为你创建虚拟电脑。

#### 第二行：导入 E2B 工具
```typescript
import { Sandbox } from '@e2b/code-interpreter'
```
**作用**：从 E2B 的工具包中取出 `Sandbox`（沙箱）这个工具。
**比喻**：就像从工具箱中拿出特定的工具。
**Sandbox 是什么**：Sandbox 就是"沙箱"，是一个隔离的虚拟环境。

#### 第三行：定义函数
```typescript
async function run() {
```
**作用**：定义一个名为 `run` 的函数。
**async 是什么**：表示这个函数是"异步"的，可以等待其他操作完成。
**比喻**：就像定义一个菜谱，名字叫"制作蛋糕"。

#### 第四行：创建沙箱
```typescript
const sbx = await Sandbox.create()
```
**分解理解**：
- `const`：创建一个不会改变的变量
- `sbx`：变量的名字（你可以叫它任何名字）
- `await`：等待操作完成
- `Sandbox.create()`：创建一个新的虚拟电脑

**比喻**：就像打电话给云服务商说"请给我分配一台虚拟电脑"，然后等待分配完成。

#### 第五行：执行代码
```typescript
const execution = await sbx.runCode('print("hello world")')
```
**分解理解**：
- `execution`：用来存储执行结果的变量
- `sbx.runCode()`：让虚拟电脑运行代码
- `'print("hello world")'`：要执行的 Python 代码

**比喻**：告诉虚拟电脑"请执行这个命令：显示 hello world"。

### Python 版本（更简单）

```python
# Python 版本更简单，让我们看看：

# 第一步：导入环境配置
from dotenv import load_dotenv  # 导入配置加载工具
load_dotenv()                   # 加载配置文件

# 第二步：导入 E2B 工具
from e2b_code_interpreter import Sandbox  # 导入沙箱工具

# 第三步：定义主函数
def main():
    # 创建沙箱（虚拟电脑）
    sbx = Sandbox()  # Python 版本更简单，直接创建
    
    # 执行代码
    execution = sbx.run_code("print('hello world')")  # 让虚拟电脑说 hello
    
    # 显示结果
    print(execution.logs)  # 显示执行日志
    
    # 查看文件
    files = sbx.files.list("/")  # 查看虚拟电脑里的文件
    print(files)  # 显示文件列表

# 第四步：运行程序
if __name__ == "__main__":  # 这是 Python 的标准写法
    main()  # 运行主函数
```

### 运行结果解释

当你运行上面的代码时，你会看到类似这样的输出：

```
执行日志：
stdout: hello world
stderr: (空)

文件列表：
[
  { name: "home", type: "directory" },
  { name: "usr", type: "directory" },
  { name: "tmp", type: "directory" }
]
```

**解释**：
- `stdout`：标准输出，就是程序正常的显示内容
- `stderr`：标准错误，如果程序出错会显示在这里
- 文件列表：虚拟电脑里默认的文件夹

## 与 AI 聊天机器人结合

现在让我们看看如何让 AI（比如 ChatGPT）使用 E2B 来分析数据：

### 基本原理

1. **你**：给 AI 发送任务（比如"分析这个数据"）
2. **AI**：写出 Python 代码来完成任务
3. **E2B**：在虚拟电脑中执行 AI 写的代码
4. **结果**：返回分析结果和图表

### 完整示例：让 AI 分析温度数据

```typescript
// 这是一个完整的例子，展示如何让 AI 分析数据

// 第一步：导入所有需要的工具
import fs from 'node:fs'          // 文件系统工具，用来读写文件
import OpenAI from 'openai'       // OpenAI 的工具，用来和 ChatGPT 对话
import { Sandbox, Result } from '@e2b/code-interpreter'  // E2B 工具

// 第二步：配置 AI 的"职业设定"
const SYSTEM_PROMPT = `
你是一个专业的数据科学家。你的工作是：
1. 接收用户的数据分析任务
2. 编写 Python 代码来完成任务
3. 在 Jupyter notebook 中运行代码
4. 生成图表和分析报告

你可以使用的工具：
- pandas：处理数据表格
- matplotlib：制作图表
- numpy：数学计算

记住：用简单易懂的方式解释你的分析结果。
`

// 第三步：定义 AI 可以使用的工具
const tools = [
  {
    type: 'function',  // 这是一个函数工具
    function: {
      name: 'execute_python',  // 工具名称
      description: '在虚拟电脑中执行 Python 代码，返回结果',  // 工具描述
      parameters: {  // 工具需要的参数
        type: 'object',
        properties: {
          code: {  // 参数名称
            type: 'string',  // 参数类型：文本
            description: '要执行的 Python 代码'  // 参数描述
          }
        },
        required: ['code']  // 必需的参数
      }
    }
  }
]

// 第四步：定义代码执行函数
async function executeCode(sandbox: Sandbox, code: string): Promise<Result[]> {
  console.log('🤖 AI 开始执行代码...')
  console.log('📝 代码内容：')
  console.log(code)
  console.log('⚡ 执行中...')
  
  // 在虚拟电脑中运行代码
  const execution = await sandbox.runCode(code, {
    // 实时显示执行过程
    onStderr: (msg) => console.log('❌ 错误信息:', msg),
    onStdout: (msg) => console.log('📤 输出信息:', msg),
  })

  // 检查是否有错误
  if (execution.error) {
    console.log('💥 执行出错:', execution.error)
    throw new Error(execution.error.value)
  }
  
  console.log('✅ 执行完成！')
  return execution.results
}

// 第五步：创建 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // 从环境变量获取 API 密钥
})

// 第六步：与 AI 对话的函数
async function chatWithAI(sandbox: Sandbox, userMessage: string): Promise<Result[]> {
  console.log(`\n👤 用户说: ${userMessage}`)
  console.log('🤔 AI 思考中...')

  // 发送消息给 ChatGPT
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',  // 使用 GPT-4o 模型
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },  // AI 的角色设定
      { role: 'user', content: userMessage }       // 用户的问题
    ],
    tools: tools,      // 可用的工具
    tool_choice: 'auto'  // 让 AI 自动选择是否使用工具
  })

  const message = completion.choices[0].message
  console.log('🤖 AI 回复:', message.content)

  // 检查 AI 是否要使用工具
  if (message.tool_calls) {
    const toolCall = message.tool_calls[0]
    console.log(`🔧 AI 要使用工具: ${toolCall.function.name}`)
    
    // 解析 AI 想要执行的代码
    const toolInput = JSON.parse(toolCall.function.arguments)
    
    // 执行代码
    return await executeCode(sandbox, toolInput.code)
  }
  
  throw new Error('AI 没有生成代码')
}

// 第七步：上传数据文件的函数
async function uploadDataFile(sandbox: Sandbox, filePath: string): Promise<string> {
  console.log('📁 正在上传数据文件...')
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }
  
  // 读取文件内容
  const fileContent = fs.readFileSync(filePath)
  
  // 上传到虚拟电脑
  const remotePath = await sandbox.files.write(
    'temperature_data.csv',  // 在虚拟电脑中的文件名
    fileContent             // 文件内容
  )
  
  console.log(`✅ 文件上传成功，保存为: ${remotePath}`)
  return remotePath
}

// 第八步：主程序
async function main() {
  console.log('🚀 启动 AI 数据分析助手')
  
  // 创建虚拟电脑
  const sandbox = await Sandbox.create()
  console.log('💻 虚拟电脑创建成功')
  
  try {
    // 上传数据文件
    const dataPath = await uploadDataFile(sandbox, './city_temperature.csv')
    
    // 让 AI 分析数据
    const results = await chatWithAI(
      sandbox,
      '请分析温度数据，找出全球最热的5个城市，并制作一个柱状图显示它们的平均温度。'
    )
    
    // 保存生成的图表
    if (results[0]?.png) {
      fs.writeFileSync(
        'temperature_chart.png',  // 保存的文件名
        Buffer.from(results[0].png, 'base64')  // 将图片数据转换为文件
      )
      console.log('📊 图表已保存为 temperature_chart.png')
    }
    
    console.log('🎉 分析完成！')
    
  } catch (error) {
    console.log('❌ 出现错误:', error.message)
  } finally {
    // 清理资源
    await sandbox.kill()
    console.log('🧹 虚拟电脑已关闭')
  }
}

// 第九步：启动程序
main()
```

### 代码执行流程详解

当你运行上面的程序时，会发生以下过程：

1. **创建虚拟电脑** (第91行)
   ```
   💻 虚拟电脑创建成功
   ```

2. **上传数据文件** (第95行)
   ```
   📁 正在上传数据文件...
   ✅ 文件上传成功，保存为: /home/user/temperature_data.csv
   ```

3. **AI 分析任务** (第98-101行)
   ```
   👤 用户说: 请分析温度数据，找出全球最热的5个城市...
   🤔 AI 思考中...
   🤖 AI 回复: 我来帮你分析温度数据...
   🔧 AI 要使用工具: execute_python
   ```

4. **代码执行过程** 
   ```
   🤖 AI 开始执行代码...
   📝 代码内容:
   import pandas as pd
   import matplotlib.pyplot as plt
   
   # 读取数据
   df = pd.read_csv('/home/user/temperature_data.csv')
   print("数据概览:")
   print(df.head())
   
   ⚡ 执行中...
   📤 输出信息: 数据概览:
   📤 输出信息:     Region    Country  ...
   ✅ 执行完成！
   ```

5. **保存结果**
   ```
   📊 图表已保存为 temperature_chart.png
   🎉 分析完成！
   ```

## 实际应用示例

### 示例1：制作简单的数据图表

```typescript
// 这个例子展示如何让 AI 制作一个简单的图表

async function createSimpleChart() {
  const sandbox = await Sandbox.create()
  
  try {
    // 让 AI 创建一个简单的图表
    const code = `
# 导入绘图工具
import matplotlib.pyplot as plt

# 创建一些示例数据
months = ['一月', '二月', '三月', '四月', '五月', '六月']
temperatures = [5, 8, 15, 20, 25, 30]

# 创建柱状图
plt.figure(figsize=(10, 6))  # 设置图表大小
plt.bar(months, temperatures, color='skyblue')  # 绘制柱状图
plt.title('月度温度变化', fontsize=16)  # 设置标题
plt.xlabel('月份', fontsize=12)  # 设置 x 轴标签
plt.ylabel('温度 (°C)', fontsize=12)  # 设置 y 轴标签
plt.grid(True, alpha=0.3)  # 添加网格线
plt.show()  # 显示图表
`
    
    console.log('🎨 正在创建图表...')
    const result = await sandbox.runCode(code)
    
    // 保存图表
    if (result.results[0]?.png) {
      fs.writeFileSync('simple_chart.png', Buffer.from(result.results[0].png, 'base64'))
      console.log('✅ 图表已保存!')
    }
    
  } finally {
    await sandbox.kill()
  }
}
```

**代码解释**：
- `plt.figure(figsize=(10, 6))`：创建一个 10x6 英寸的画布
- `plt.bar()`：绘制柱状图
- `plt.title()`：设置图表标题
- `plt.show()`：显示图表（在虚拟电脑中显示，然后转换为图片）

### 示例2：处理 CSV 数据文件

```typescript
// 这个例子展示如何处理真实的数据文件

async function analyzeCSVData() {
  const sandbox = await Sandbox.create()
  
  try {
    // 上传数据文件
    const csvData = `
姓名,年龄,城市,薪资
张三,25,北京,8000
李四,30,上海,12000
王五,28,广州,9500
赵六,35,深圳,15000
钱七,22,杭州,7000
`
    
    // 将数据保存到虚拟电脑
    await sandbox.files.write('employee_data.csv', csvData)
    console.log('📄 数据文件已上传')
    
    // 分析数据的代码
    const analysisCode = `
import pandas as pd
import matplotlib.pyplot as plt

# 读取 CSV 文件
df = pd.read_csv('employee_data.csv')

print("📊 数据概览:")
print(df)

print("\\n📈 基本统计:")
print(f"员工总数: {len(df)}")
print(f"平均年龄: {df['年龄'].mean():.1f} 岁")
print(f"平均薪资: {df['薪资'].mean():.0f} 元")

# 创建薪资分布图
plt.figure(figsize=(10, 6))
plt.bar(df['姓名'], df['薪资'], color='lightgreen')
plt.title('员工薪资分布图', fontsize=16)
plt.xlabel('员工姓名', fontsize=12)
plt.ylabel('薪资 (元)', fontsize=12)
plt.xticks(rotation=45)  # 旋转 x 轴标签
plt.tight_layout()  # 自动调整布局
plt.show()
`
    
    console.log('📊 开始分析数据...')
    const result = await sandbox.runCode(analysisCode)
    
    console.log('📤 分析结果:')
    console.log(result.logs.stdout)
    
    // 保存图表
    if (result.results[0]?.png) {
      fs.writeFileSync('salary_chart.png', Buffer.from(result.results[0].png, 'base64'))
      console.log('💾 薪资图表已保存!')
    }
    
  } finally {
    await sandbox.kill()
  }
}
```

**这个例子展示了**：
1. 如何上传数据到虚拟电脑
2. 如何用 pandas 读取 CSV 文件
3. 如何计算基本统计信息
4. 如何创建柱状图
5. 如何保存结果

## 常见问题解答

### Q1: 我需要学会编程才能使用 E2B 吗？

**答案**: 不需要！E2B 的主要用途是让 AI 为你编程。你只需要：
1. 描述你想要什么（比如"分析这个数据"）
2. AI 会编写代码
3. E2B 执行代码
4. 你获得结果

### Q2: 虚拟电脑会一直运行吗？

**答案**: 不会。虚拟电脑有时间限制：
- 默认情况下，5分钟不使用就会自动关闭
- 你可以延长时间或手动关闭
- 这样可以节省资源和费用

```typescript
// 设置虚拟电脑运行10分钟
const sandbox = await Sandbox.create({
  timeoutMs: 10 * 60 * 1000  // 10分钟 = 10 × 60 × 1000 毫秒
})
```

### Q3: 我的数据安全吗？

**答案**: 是的，很安全：
- 每个虚拟电脑都是完全隔离的
- 数据不会泄露到其他用户的环境
- 虚拟电脑关闭后，数据会被清除
- 不会影响你的真实电脑

### Q4: 如果代码出错了怎么办？

**答案**: E2B 会告诉你错误信息：

```typescript
const execution = await sandbox.runCode('print(undefined_variable)')

if (execution.error) {
  console.log('出错了:', execution.error.value)
  // 输出: NameError: name 'undefined_variable' is not defined
}
```

你可以把错误信息告诉 AI，让它修复代码。

### Q5: 我可以上传什么类型的文件？

**答案**: 你可以上传各种类型的文件：
- CSV 数据文件
- Excel 文件
- 图片文件
- 文本文件

```typescript
// 上传不同类型的文件
await sandbox.files.write('data.csv', csvContent)      // CSV 文件
await sandbox.files.write('photo.jpg', imageBuffer)    // 图片文件
await sandbox.files.write('notes.txt', textContent)    // 文本文件
```

### Q6: 如何查看虚拟电脑里有什么文件？

```typescript
// 查看根目录的所有文件
const files = await sandbox.files.list('/')
console.log('所有文件:', files)

// 查看特定文件夹
const homeFiles = await sandbox.files.list('/home/user')
console.log('用户文件夹:', homeFiles)
```

### Q7: 我可以安装额外的软件包吗？

**答案**: 可以！你可以让 AI 安装任何 Python 包：

```python
# AI 可以写这样的代码来安装新包
import subprocess
subprocess.run(['pip', 'install', 'seaborn'])  # 安装 seaborn 绘图库

# 然后使用新安装的包
import seaborn as sns
```

## 总结

E2B 让没有编程基础的人也能享受到 AI 编程的强大功能：

1. **你提需求** → "我想分析销售数据"
2. **AI 写代码** → 自动生成数据分析代码
3. **E2B 执行** → 在安全环境中运行代码
4. **你获得结果** → 得到图表、报告等成果

这就像有一个永远不会累的程序员助手，随时为你分析数据、制作图表、解决问题！

**开始使用 E2B 的步骤**：
1. 注册 E2B 账号
2. 获取 API 密钥
3. 选择一个 AI 服务（OpenAI、Claude 等）
4. 复制本指南中的代码模板
5. 开始你的数据分析之旅！

记住：你不需要理解每一行代码，只需要知道如何描述你的需求，AI 和 E2B 会帮你完成剩下的工作！
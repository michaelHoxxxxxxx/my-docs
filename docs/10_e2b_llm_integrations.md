# E2B LLM 集成示例大全

本文档详细介绍了 E2B 与各种大语言模型（LLM）的集成方法和示例代码，涵盖主流的 AI 服务提供商和最新模型。

## 📋 目录

- [OpenAI 系列集成](#openai-系列集成)
- [Anthropic Claude 集成](#anthropic-claude-集成)
- [开源模型集成](#开源模型集成)
- [专业模型集成](#专业模型集成)
- [企业级平台集成](#企业级平台集成)
- [最佳实践与性能对比](#最佳实践与性能对比)

## OpenAI 系列集成

### 1. o1 和 o3-mini 模型集成

最新的推理模型，特别适合复杂的代码生成和数学推理任务。

#### Python 示例
```python
from e2b_code_interpreter import Sandbox
from openai import OpenAI
import json

client = OpenAI()

def analyze_data_with_o1(csv_path):
    """使用 o1 模型进行数据分析和可视化"""
    
    # 创建 E2B 沙箱
    with Sandbox() as sandbox:
        # 上传数据文件
        with open(csv_path, "rb") as f:
            sandbox.files.write("/tmp/data.csv", f.read())
        
        # 准备分析提示
        messages = [{
            "role": "user",
            "content": """
            分析 /tmp/data.csv 文件中的数据：
            1. 读取并展示数据概览
            2. 进行统计分析
            3. 创建可视化图表
            4. 生成洞察报告
            """
        }]
        
        # 调用 o1 模型
        response = client.chat.completions.create(
            model="o1-preview",  # 或 "o3-mini"
            messages=messages,
            tools=[{
                "type": "function",
                "function": {
                    "name": "execute_code",
                    "description": "在 E2B 沙箱中执行 Python 代码",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "code": {
                                "type": "string",
                                "description": "要执行的 Python 代码"
                            }
                        },
                        "required": ["code"]
                    }
                }
            }]
        )
        
        # 处理模型响应并执行代码
        for choice in response.choices:
            if hasattr(choice.message, 'tool_calls'):
                for tool_call in choice.message.tool_calls:
                    if tool_call.function.name == "execute_code":
                        args = json.loads(tool_call.function.arguments)
                        result = sandbox.run_code(args["code"])
                        print(f"执行结果：\n{result.logs.stdout}")
                        
                        # 如果生成了图表，保存它
                        if result.artifacts:
                            for artifact in result.artifacts:
                                if artifact.type == "image":
                                    with open(f"output_{artifact.name}", "wb") as f:
                                        f.write(artifact.content)

# 使用示例
analyze_data_with_o1("sales_data.csv")
```

#### TypeScript 示例
```typescript
import { Sandbox } from '@e2b/code-interpreter'
import OpenAI from 'openai'

const openai = new OpenAI()

async function performMLAnalysis(datasetPath: string) {
  const sandbox = await Sandbox.create()
  
  try {
    // 上传数据集
    const data = await fs.readFile(datasetPath)
    await sandbox.files.write('/tmp/dataset.csv', data)
    
    // 使用 o1 模型进行机器学习分析
    const response = await openai.chat.completions.create({
      model: 'o1-preview',
      messages: [{
        role: 'user',
        content: `
          对 /tmp/dataset.csv 执行完整的机器学习分析：
          1. 数据预处理和特征工程
          2. 训练多个模型（线性回归、随机森林、XGBoost）
          3. 交叉验证和模型评估
          4. 特征重要性分析
          5. 生成预测结果和可视化
        `
      }],
      tools: [{
        type: 'function',
        function: {
          name: 'run_ml_code',
          description: '执行机器学习代码',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string' }
            }
          }
        }
      }]
    })
    
    // 处理并执行生成的代码
    for (const choice of response.choices) {
      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments)
          const result = await sandbox.runCode(args.code)
          console.log('ML 分析结果:', result.logs.stdout)
        }
      }
    }
  } finally {
    await sandbox.kill()
  }
}
```

### 2. GPT-4o 图像理解集成

GPT-4o 支持多模态输入，可以理解和分析图像数据。

```python
from e2b_code_interpreter import Sandbox
from openai import OpenAI
import base64

def analyze_image_with_gpt4o(image_path):
    """使用 GPT-4o 分析图像并生成代码"""
    
    client = OpenAI()
    
    # 读取图像
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()
    
    with Sandbox() as sandbox:
        # 准备多模态消息
        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "分析这张图片，并编写代码来重现其中的数据可视化效果"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{image_data}"
                    }
                }
            ]
        }]
        
        # 调用 GPT-4o
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=2000
        )
        
        # 提取并执行生成的代码
        code = extract_code_from_response(response.choices[0].message.content)
        if code:
            result = sandbox.run_code(code)
            print("代码执行结果：", result.logs.stdout)
            
            # 保存生成的图表
            if result.artifacts:
                for artifact in result.artifacts:
                    if artifact.type == "image":
                        sandbox.download_file(artifact.path, f"recreated_{artifact.name}")

def extract_code_from_response(content):
    """从响应中提取 Python 代码块"""
    import re
    code_pattern = r"```python\n(.*?)\n```"
    matches = re.findall(code_pattern, content, re.DOTALL)
    return "\n\n".join(matches) if matches else None
```

## Anthropic Claude 集成

### Claude 3 Opus 代码解释器

Claude 3 Opus 在代码理解和生成方面表现出色。

```python
from e2b_code_interpreter import Sandbox
from anthropic import Anthropic

def claude_code_interpreter(task_description):
    """使用 Claude 3 Opus 作为代码解释器"""
    
    anthropic = Anthropic()
    
    with Sandbox() as sandbox:
        # 创建系统提示
        system_prompt = """
        你是一个高级代码解释器。你可以：
        1. 编写和执行 Python 代码
        2. 分析数据和创建可视化
        3. 解决复杂的编程问题
        4. 生成高质量的代码文档
        
        始终使用 execute_code 函数来运行代码。
        """
        
        # 与 Claude 交互
        message = anthropic.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": task_description
            }],
            tools=[{
                "name": "execute_code",
                "description": "在沙箱环境中执行 Python 代码",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "要执行的 Python 代码"
                        }
                    },
                    "required": ["code"]
                }
            }]
        )
        
        # 处理 Claude 的工具调用
        for content in message.content:
            if content.type == "tool_use":
                if content.name == "execute_code":
                    result = sandbox.run_code(content.input["code"])
                    print(f"执行结果：\n{result.logs.stdout}")
                    
                    # 处理错误
                    if result.error:
                        print(f"错误：{result.error}")
                    
                    # 保存输出文件
                    if result.artifacts:
                        for artifact in result.artifacts:
                            print(f"生成文件：{artifact.name}")

# 使用示例
claude_code_interpreter("""
创建一个机器学习模型来预测房价：
1. 生成模拟数据集（1000个样本）
2. 进行特征工程
3. 训练随机森林模型
4. 评估模型性能
5. 创建特征重要性图表
""")
```

## 开源模型集成

### 1. Llama 3.1 系列集成

通过 Fireworks AI 或 Together AI 使用 Llama 模型。

```python
from e2b_code_interpreter import Sandbox
import requests

class LlamaCodeInterpreter:
    def __init__(self, api_key, provider="fireworks"):
        self.api_key = api_key
        self.provider = provider
        self.base_url = self._get_base_url()
    
    def _get_base_url(self):
        urls = {
            "fireworks": "https://api.fireworks.ai/inference/v1",
            "together": "https://api.together.xyz/v1"
        }
        return urls.get(self.provider)
    
    def execute_with_llama(self, prompt, model="llama-v3.1-405b-instruct"):
        """使用 Llama 3.1 生成并执行代码"""
        
        with Sandbox() as sandbox:
            # 准备请求
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # 构建提示
            system_prompt = """You are a code interpreter powered by Llama 3.1.
            When asked to perform tasks, write Python code to accomplish them.
            Always include proper error handling and comments."""
            
            data = {
                "model": f"accounts/fireworks/models/{model}",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 2000,
                "temperature": 0.1,
                "tools": [{
                    "type": "function",
                    "function": {
                        "name": "run_python",
                        "description": "Execute Python code",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "code": {"type": "string"}
                            }
                        }
                    }
                }]
            }
            
            # 发送请求
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # 执行生成的代码
                for choice in result.get("choices", []):
                    message = choice.get("message", {})
                    if "tool_calls" in message:
                        for tool_call in message["tool_calls"]:
                            if tool_call["function"]["name"] == "run_python":
                                code = json.loads(tool_call["function"]["arguments"])["code"]
                                exec_result = sandbox.run_code(code)
                                print(f"Llama 3.1 执行结果：\n{exec_result.logs.stdout}")
            
            return sandbox

# 使用示例
interpreter = LlamaCodeInterpreter(api_key="your_api_key")
interpreter.execute_with_llama("""
创建一个实时股票价格监控器：
1. 模拟股票价格数据
2. 创建价格走势图
3. 计算移动平均线
4. 识别买入/卖出信号
""")
```

### 2. Qwen2.5-Coder 集成

专门针对代码生成优化的模型。

```python
from e2b_code_interpreter import Sandbox
import openai

def qwen_coder_integration(task):
    """使用 Qwen2.5-Coder 进行代码生成"""
    
    # 配置 Fireworks AI
    client = openai.OpenAI(
        api_key="your_fireworks_api_key",
        base_url="https://api.fireworks.ai/inference/v1"
    )
    
    with Sandbox() as sandbox:
        # 专门的编码提示
        messages = [{
            "role": "system",
            "content": "You are Qwen2.5-Coder, specialized in generating high-quality, production-ready code."
        }, {
            "role": "user",
            "content": f"""
            Task: {task}
            
            Requirements:
            1. Write clean, well-documented code
            2. Include comprehensive error handling
            3. Follow best practices and design patterns
            4. Add unit tests where appropriate
            """
        }]
        
        # 生成代码
        response = client.chat.completions.create(
            model="accounts/fireworks/models/qwen2p5-coder-32b-instruct",
            messages=messages,
            max_tokens=3000,
            temperature=0.1
        )
        
        # 提取并执行代码
        generated_code = response.choices[0].message.content
        
        # 分离主代码和测试代码
        main_code, test_code = separate_code_and_tests(generated_code)
        
        # 执行主代码
        print("执行主代码...")
        main_result = sandbox.run_code(main_code)
        print(main_result.logs.stdout)
        
        # 执行测试
        if test_code:
            print("\n执行单元测试...")
            test_result = sandbox.run_code(test_code)
            print(test_result.logs.stdout)
        
        return main_result, test_result

def separate_code_and_tests(code):
    """分离主代码和测试代码"""
    # 简单的分离逻辑，实际可以更复杂
    if "def test_" in code or "import unittest" in code:
        parts = code.split("if __name__ == '__main__':")
        if len(parts) > 1:
            return parts[0], parts[1]
    return code, None
```

## 专业模型集成

### 1. Mistral Codestral 集成

专门的代码生成模型，支持多种编程语言。

```typescript
import { Sandbox } from '@e2b/code-interpreter'
import { Mistral } from '@mistralai/mistralai'

class CodestralInterpreter {
  private mistral: Mistral
  private sandbox: Sandbox | null = null
  
  constructor(apiKey: string) {
    this.mistral = new Mistral({ apiKey })
  }
  
  async initialize() {
    this.sandbox = await Sandbox.create()
  }
  
  async generateAndExecute(prompt: string, language: string = 'python') {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    
    try {
      // 使用 Codestral 生成代码
      const response = await this.mistral.chat.complete({
        model: 'codestral-latest',
        messages: [{
          role: 'user',
          content: `Generate ${language} code for: ${prompt}\n\nRequirements:
          - Production-ready code
          - Proper error handling
          - Type hints (if applicable)
          - Docstrings
          - Follow ${language} best practices`
        }],
        temperature: 0.1,
        maxTokens: 2000
      })
      
      const generatedCode = response.choices[0].message.content
      
      // 根据语言执行代码
      let result
      switch (language) {
        case 'python':
          result = await this.sandbox.runCode(generatedCode)
          break
        case 'javascript':
          result = await this.sandbox.runCode(generatedCode, { 
            language: 'javascript' 
          })
          break
        case 'typescript':
          // 先编译 TypeScript
          const jsCode = await this.compileTypeScript(generatedCode)
          result = await this.sandbox.runCode(jsCode, { 
            language: 'javascript' 
          })
          break
        default:
          throw new Error(`Unsupported language: ${language}`)
      }
      
      return {
        code: generatedCode,
        output: result.logs.stdout,
        error: result.error
      }
    } catch (error) {
      console.error('Codestral execution error:', error)
      throw error
    }
  }
  
  private async compileTypeScript(tsCode: string): Promise<string> {
    // 在沙箱中编译 TypeScript
    const compileCode = `
import * as ts from 'typescript'

const code = \`${tsCode.replace(/`/g, '\\`')}\`
const result = ts.transpileModule(code, {
  compilerOptions: { 
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
})
console.log(result.outputText)
`
    const result = await this.sandbox!.runCode(compileCode)
    return result.logs.stdout
  }
  
  async cleanup() {
    if (this.sandbox) {
      await this.sandbox.kill()
    }
  }
}

// 使用示例
async function main() {
  const interpreter = new CodestralInterpreter('your_mistral_api_key')
  await interpreter.initialize()
  
  try {
    // Python 示例
    const pythonResult = await interpreter.generateAndExecute(
      '创建一个 REST API 客户端类，支持认证和重试机制',
      'python'
    )
    console.log('Python 代码：', pythonResult.code)
    console.log('执行结果：', pythonResult.output)
    
    // TypeScript 示例
    const tsResult = await interpreter.generateAndExecute(
      '实现一个类型安全的事件发射器',
      'typescript'
    )
    console.log('TypeScript 代码：', tsResult.code)
    
  } finally {
    await interpreter.cleanup()
  }
}
```

### 2. DeepSeek Coder 集成

通过 Together AI 使用 DeepSeek Coder。

```python
from e2b_code_interpreter import Sandbox
from typing import Dict, List, Optional
import httpx

class DeepSeekCoderIntegration:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.together.xyz/v1"
        
    async def analyze_codebase(self, repo_path: str) -> Dict:
        """使用 DeepSeek Coder 分析代码库"""
        
        async with httpx.AsyncClient() as client:
            with Sandbox() as sandbox:
                # 上传代码库
                sandbox.upload_directory(repo_path, "/tmp/repo")
                
                # 准备分析提示
                analysis_prompt = f"""
                Analyze the codebase at /tmp/repo and provide:
                1. Architecture overview
                2. Code quality assessment
                3. Security vulnerabilities
                4. Performance bottlenecks
                5. Refactoring suggestions
                
                Generate Python code to perform this analysis.
                """
                
                # 调用 DeepSeek Coder
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": "deepseek-coder-33b-instruct",
                        "messages": [
                            {"role": "system", "content": "You are DeepSeek Coder, specialized in code analysis and generation."},
                            {"role": "user", "content": analysis_prompt}
                        ],
                        "max_tokens": 3000
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    analysis_code = result["choices"][0]["message"]["content"]
                    
                    # 执行分析代码
                    analysis_result = sandbox.run_code(analysis_code)
                    
                    # 生成报告
                    report_code = """
import json
import matplotlib.pyplot as plt
from datetime import datetime

# 生成分析报告
report = {
    "timestamp": datetime.now().isoformat(),
    "summary": analysis_result,
    "metrics": calculate_metrics(),
    "recommendations": generate_recommendations()
}

# 创建可视化
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# 代码质量分布
axes[0, 0].pie(quality_distribution, labels=quality_labels)
axes[0, 0].set_title('代码质量分布')

# 复杂度热图
axes[0, 1].imshow(complexity_heatmap, cmap='hot')
axes[0, 1].set_title('代码复杂度热图')

# 依赖关系图
axes[1, 0].scatter(dependency_x, dependency_y)
axes[1, 0].set_title('模块依赖关系')

# 技术债务趋势
axes[1, 1].plot(tech_debt_timeline)
axes[1, 1].set_title('技术债务趋势')

plt.tight_layout()
plt.savefig('/tmp/codebase_analysis.png', dpi=300)

# 保存报告
with open('/tmp/analysis_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print("分析完成！报告已生成。")
"""
                    
                    sandbox.run_code(report_code)
                    
                    # 下载结果
                    report = sandbox.download_file("/tmp/analysis_report.json")
                    visualization = sandbox.download_file("/tmp/codebase_analysis.png")
                    
                    return {
                        "report": report,
                        "visualization": visualization,
                        "logs": analysis_result.logs.stdout
                    }
```

## 企业级平台集成

### 1. IBM WatsonX AI 集成

企业级 AI 平台集成示例。

```python
from e2b_code_interpreter import Sandbox
from ibm_watsonx_ai import APIClient
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.foundation_models import ModelInference

class WatsonXE2BIntegration:
    def __init__(self, api_key: str, project_id: str):
        self.api_key = api_key
        self.project_id = project_id
        self.credentials = {
            "url": "https://us-south.ml.cloud.ibm.com",
            "apikey": api_key
        }
        self.client = APIClient(self.credentials)
        
    def create_enterprise_workflow(self, requirements: str):
        """创建企业级工作流"""
        
        with Sandbox() as sandbox:
            # 使用 IBM Granite 模型
            model = ModelInference(
                model_id="ibm/granite-13b-instruct-v2",
                credentials=self.credentials,
                project_id=self.project_id
            )
            
            # 生成企业级代码
            parameters = {
                GenParams.MAX_NEW_TOKENS: 2000,
                GenParams.TEMPERATURE: 0.1,
                GenParams.TOP_P: 0.9
            }
            
            prompt = f"""
            Create enterprise-grade Python code for: {requirements}
            
            Include:
            1. Comprehensive logging
            2. Error handling and recovery
            3. Configuration management
            4. Security best practices
            5. Performance monitoring
            6. Unit and integration tests
            """
            
            response = model.generate_text(
                prompt=prompt,
                params=parameters
            )
            
            # 在沙箱中设置企业环境
            setup_code = """
# 设置企业级环境
import logging
import os
from datetime import datetime
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/enterprise_app.log'),
        logging.StreamHandler()
    ]
)

# 加载配置
config = {
    "environment": "production",
    "monitoring": {
        "enabled": True,
        "interval": 60
    },
    "security": {
        "encryption": "AES256",
        "authentication": "OAuth2"
    }
}

with open('/tmp/config.json', 'w') as f:
    json.dump(config, f)

print("企业环境配置完成")
"""
            
            sandbox.run_code(setup_code)
            
            # 执行生成的企业代码
            result = sandbox.run_code(response)
            
            # 运行测试套件
            test_code = """
import unittest
import sys

# 动态导入生成的模块
sys.path.append('/tmp')

# 运行所有测试
loader = unittest.TestLoader()
suite = loader.discover('/tmp', pattern='test_*.py')
runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)

# 生成测试报告
with open('/tmp/test_report.txt', 'w') as f:
    f.write(f"Tests run: {result.testsRun}\\n")
    f.write(f"Failures: {len(result.failures)}\\n")
    f.write(f"Errors: {len(result.errors)}\\n")
"""
            
            test_result = sandbox.run_code(test_code)
            
            # 性能分析
            performance_code = """
import cProfile
import pstats
import io

# 性能分析
profiler = cProfile.Profile()
profiler.enable()

# 运行主要功能
exec(open('/tmp/main.py').read())

profiler.disable()

# 生成性能报告
s = io.StringIO()
ps = pstats.Stats(profiler, stream=s).sort_stats('cumulative')
ps.print_stats(20)

with open('/tmp/performance_report.txt', 'w') as f:
    f.write(s.getvalue())

print("性能分析完成")
"""
            
            sandbox.run_code(performance_code)
            
            # 收集所有报告
            reports = {
                "logs": sandbox.download_file("/tmp/enterprise_app.log"),
                "test_report": sandbox.download_file("/tmp/test_report.txt"),
                "performance_report": sandbox.download_file("/tmp/performance_report.txt"),
                "config": sandbox.download_file("/tmp/config.json")
            }
            
            return reports
```

### 2. Groq 高速推理集成

使用 Groq 的超快推理速度进行实时代码生成。

```typescript
import { Sandbox } from '@e2b/code-interpreter'
import Groq from 'groq-sdk'

class GroqRealtimeInterpreter {
  private groq: Groq
  private sandbox: Sandbox | null = null
  
  constructor(apiKey: string) {
    this.groq = new Groq({ apiKey })
  }
  
  async streamingCodeGeneration(userInput: string) {
    this.sandbox = await Sandbox.create()
    
    try {
      // 使用 Groq 的流式响应
      const stream = await this.groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages: [{
          role: 'user',
          content: `Generate Python code for: ${userInput}. 
                   Output executable code blocks that can be run immediately.`
        }],
        stream: true,
        temperature: 0.1,
        max_tokens: 2000
      })
      
      let currentCode = ''
      let codeBuffer = ''
      
      // 实时处理流式响应
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        currentCode += content
        
        // 检测完整的代码块
        if (this.isCompleteCodeBlock(currentCode)) {
          const code = this.extractCode(currentCode)
          if (code && code !== codeBuffer) {
            codeBuffer = code
            
            // 立即执行代码
            console.log('执行代码块...')
            const result = await this.sandbox.runCode(code)
            
            // 实时显示结果
            if (result.logs.stdout) {
              console.log('输出:', result.logs.stdout)
            }
            if (result.error) {
              console.error('错误:', result.error)
            }
            
            // 处理生成的文件
            if (result.artifacts) {
              for (const artifact of result.artifacts) {
                console.log(`生成文件: ${artifact.name}`)
              }
            }
          }
        }
      }
      
      return currentCode
      
    } finally {
      if (this.sandbox) {
        await this.sandbox.kill()
      }
    }
  }
  
  private isCompleteCodeBlock(text: string): boolean {
    const codeBlockRegex = /```python\n[\s\S]*?\n```/g
    const matches = text.match(codeBlockRegex)
    return matches !== null && matches.length > 0
  }
  
  private extractCode(text: string): string | null {
    const codeBlockRegex = /```python\n([\s\S]*?)\n```/g
    const matches = [...text.matchAll(codeBlockRegex)]
    if (matches.length > 0) {
      return matches[matches.length - 1][1]
    }
    return null
  }
  
  async interactiveSession() {
    // 创建交互式会话
    this.sandbox = await Sandbox.create()
    const sessionContext: string[] = []
    
    const processQuery = async (query: string) => {
      sessionContext.push(`User: ${query}`)
      
      const response = await this.groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an interactive Python code interpreter. Maintain context between queries.'
          },
          ...sessionContext.map(msg => ({
            role: 'user' as const,
            content: msg
          }))
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'execute_python',
            description: 'Execute Python code in the sandbox',
            parameters: {
              type: 'object',
              properties: {
                code: { type: 'string' }
              }
            }
          }
        }]
      })
      
      // 处理工具调用
      const message = response.choices[0].message
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === 'execute_python') {
            const { code } = JSON.parse(toolCall.function.arguments)
            const result = await this.sandbox!.runCode(code)
            
            sessionContext.push(`Code executed: ${code}`)
            sessionContext.push(`Result: ${result.logs.stdout}`)
            
            return result
          }
        }
      }
      
      return null
    }
    
    return { processQuery, cleanup: () => this.sandbox?.kill() }
  }
}

// 使用示例
async function groqDemo() {
  const interpreter = new GroqRealtimeInterpreter('your_groq_api_key')
  
  // 流式代码生成
  await interpreter.streamingCodeGeneration(
    '创建一个实时数据仪表板，显示 CPU、内存和磁盘使用情况'
  )
  
  // 交互式会话
  const session = await interpreter.interactiveSession()
  
  await session.processQuery('创建一个数据框架并加载示例数据')
  await session.processQuery('对数据进行统计分析')
  await session.processQuery('创建可视化图表')
  
  await session.cleanup()
}
```

## 最佳实践与性能对比

### 模型选择指南

| 模型 | 最适合场景 | 响应速度 | 代码质量 | 成本 |
|------|-----------|---------|---------|------|
| o1/o3-mini | 复杂推理、算法设计 | 慢 | 极高 | 高 |
| GPT-4o | 多模态任务、图像理解 | 中等 | 高 | 中高 |
| Claude 3 Opus | 长文本理解、代码重构 | 中等 | 极高 | 高 |
| Llama 3.1 405B | 通用代码生成 | 快 | 高 | 低 |
| Qwen2.5-Coder | 专业代码生成 | 快 | 高 | 低 |
| Codestral | 多语言代码生成 | 快 | 高 | 中 |
| DeepSeek Coder | 代码分析、理解 | 快 | 高 | 低 |
| Groq (Llama) | 实时交互、低延迟 | 极快 | 中高 | 中 |

### 集成最佳实践

#### 1. 错误处理和重试
```python
import asyncio
from typing import Optional, Callable
from tenacity import retry, stop_after_attempt, wait_exponential

class RobustE2BIntegration:
    def __init__(self, primary_model: str, fallback_model: str):
        self.primary_model = primary_model
        self.fallback_model = fallback_model
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def execute_with_retry(
        self, 
        code_generator: Callable,
        prompt: str
    ) -> dict:
        """带重试机制的代码执行"""
        try:
            # 尝试使用主模型
            result = await code_generator(self.primary_model, prompt)
            return result
        except Exception as e:
            print(f"主模型失败: {e}, 切换到备用模型")
            # 降级到备用模型
            result = await code_generator(self.fallback_model, prompt)
            return result
```

#### 2. 沙箱资源优化
```python
from contextlib import asynccontextmanager
from typing import List
import asyncio

class SandboxPool:
    """沙箱池管理，提高性能"""
    
    def __init__(self, pool_size: int = 5):
        self.pool_size = pool_size
        self.available_sandboxes: List[Sandbox] = []
        self.in_use_sandboxes: List[Sandbox] = []
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """预创建沙箱池"""
        tasks = [Sandbox.create() for _ in range(self.pool_size)]
        self.available_sandboxes = await asyncio.gather(*tasks)
    
    @asynccontextmanager
    async def acquire(self):
        """获取沙箱"""
        async with self._lock:
            if not self.available_sandboxes:
                # 如果没有可用沙箱，创建新的
                sandbox = await Sandbox.create()
            else:
                sandbox = self.available_sandboxes.pop()
            
            self.in_use_sandboxes.append(sandbox)
        
        try:
            yield sandbox
        finally:
            # 清理并返回到池中
            await sandbox.reset()  # 假设有 reset 方法
            async with self._lock:
                self.in_use_sandboxes.remove(sandbox)
                self.available_sandboxes.append(sandbox)
    
    async def cleanup(self):
        """清理所有沙箱"""
        all_sandboxes = self.available_sandboxes + self.in_use_sandboxes
        tasks = [sandbox.kill() for sandbox in all_sandboxes]
        await asyncio.gather(*tasks)
```

#### 3. 模型响应缓存
```python
import hashlib
import json
from typing import Optional
import aioredis

class ModelResponseCache:
    """缓存模型响应以提高性能"""
    
    def __init__(self, redis_url: str = "redis://localhost"):
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        self.redis = await aioredis.from_url(self.redis_url)
    
    def _generate_cache_key(self, model: str, prompt: str) -> str:
        """生成缓存键"""
        content = f"{model}:{prompt}"
        return f"e2b:cache:{hashlib.md5(content.encode()).hexdigest()}"
    
    async def get_cached_response(
        self, 
        model: str, 
        prompt: str
    ) -> Optional[str]:
        """获取缓存的响应"""
        if not self.redis:
            return None
        
        key = self._generate_cache_key(model, prompt)
        cached = await self.redis.get(key)
        
        if cached:
            return json.loads(cached)
        return None
    
    async def cache_response(
        self, 
        model: str, 
        prompt: str, 
        response: str,
        ttl: int = 3600
    ):
        """缓存响应"""
        if not self.redis:
            return
        
        key = self._generate_cache_key(model, prompt)
        await self.redis.setex(
            key, 
            ttl, 
            json.dumps(response)
        )
```

### 安全性最佳实践

```python
import os
import secrets
from cryptography.fernet import Fernet

class SecureE2BIntegration:
    """安全的 E2B 集成"""
    
    def __init__(self):
        # 生成加密密钥
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
    
    def sanitize_code(self, code: str) -> str:
        """清理潜在的恶意代码"""
        # 移除危险的导入
        dangerous_imports = [
            'os.system', 'subprocess', 'eval', 'exec',
            '__import__', 'compile', 'open'
        ]
        
        for dangerous in dangerous_imports:
            if dangerous in code:
                raise ValueError(f"危险操作检测: {dangerous}")
        
        return code
    
    def encrypt_sensitive_data(self, data: str) -> bytes:
        """加密敏感数据"""
        return self.cipher.encrypt(data.encode())
    
    def create_secure_sandbox(self) -> Sandbox:
        """创建安全配置的沙箱"""
        return Sandbox.create(
            # 限制资源
            cpu_limit=1.0,  # 1 个 CPU 核心
            memory_limit="512MB",
            timeout=30000,  # 30 秒超时
            
            # 网络隔离
            network_enabled=False,
            
            # 文件系统限制
            max_file_size="10MB",
            
            # 环境变量白名单
            env_whitelist=["PATH", "PYTHONPATH"]
        )
```

## 总结

本文档详细介绍了 E2B 与各种 LLM 的集成方法，从最新的 OpenAI o1/o3-mini 模型到开源的 Llama 系列，再到企业级的 WatsonX 平台。每种集成都有其独特的优势：

- **OpenAI 系列**：适合需要高质量推理和多模态能力的场景
- **Claude 系列**：在代码理解和长文本处理方面表现卓越
- **开源模型**：提供了成本效益高的解决方案
- **专业模型**：针对特定编程任务优化
- **企业平台**：提供完整的企业级功能和支持

选择合适的模型需要考虑任务复杂度、响应时间要求、成本预算和安全性需求。通过本文档提供的示例和最佳实践，你可以快速实现各种 LLM 与 E2B 的集成，构建强大的 AI 代码解释器应用。

## 相关资源

- [E2B 官方文档](https://e2b.dev/docs)
- [E2B Cookbook](https://github.com/e2b-dev/e2b-cookbook)
- [各 LLM 提供商文档](#)
- [性能基准测试结果](#)
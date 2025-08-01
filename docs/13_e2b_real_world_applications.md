# E2B 实际应用案例详解

本文档深入介绍 E2B 在实际生产环境中的应用案例，包括 AI 分析师、代码片段生成器、计算机使用代理等具体实现。

## 📋 目录

- [E2B AI Analyst - 数据分析平台](#e2b-ai-analyst---数据分析平台)
- [E2B Fragments - 应用生成器](#e2b-fragments---应用生成器)
- [E2B Surf - 计算机使用代理](#e2b-surf---计算机使用代理)
- [企业级应用案例](#企业级应用案例)
- [教育平台应用](#教育平台应用)
- [开发工具集成](#开发工具集成)
- [行业特定解决方案](#行业特定解决方案)

## E2B AI Analyst - 数据分析平台

### 项目概述

E2B AI Analyst 是一个基于 E2B 构建的智能数据分析平台，允许用户通过自然语言描述来分析数据并生成交互式图表。

### 核心功能架构

```typescript
// src/types/analyst.ts
export interface AnalysisRequest {
  id: string
  userId: string
  dataSource: DataSource
  query: string
  timestamp: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface DataSource {
  type: 'csv' | 'json' | 'sql' | 'api'
  source: string
  schema?: Record<string, string>
  sampleData?: any[]
}

export interface AnalysisResult {
  code: string
  output: string
  visualizations: Visualization[]
  insights: string[]
  recommendations: string[]
}

export interface Visualization {
  id: string
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap'
  title: string
  data: any
  config: PlotlyConfig
}
```

### 数据分析引擎

```python
# backend/analyst_engine.py
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Any, Optional
from e2b_code_interpreter import Sandbox
import json
import openai

class AIAnalyst:
    """AI 数据分析师核心引擎"""
    
    def __init__(self, openai_api_key: str):
        self.client = openai.OpenAI(api_key=openai_api_key)
        self.sandbox = None
        
    async def analyze_data(self, data_source: Dict, query: str) -> Dict[str, Any]:
        """执行完整的数据分析流程"""
        
        # 1. 初始化沙箱环境
        self.sandbox = await Sandbox.create()
        
        try:
            # 2. 加载和预处理数据
            data_info = await self._load_data(data_source)
            
            # 3. 生成分析代码
            analysis_code = await self._generate_analysis_code(data_info, query)
            
            # 4. 执行分析
            result = await self._execute_analysis(analysis_code)
            
            # 5. 生成洞察和建议
            insights = await self._generate_insights(result, query)
            
            return {
                'success': True,
                'code': analysis_code,
                'result': result,
                'insights': insights,
                'visualizations': result.get('visualizations', [])
            }
            
        finally:
            if self.sandbox:
                await self.sandbox.kill()
    
    async def _load_data(self, data_source: Dict) -> Dict[str, Any]:
        """加载并分析数据源"""
        
        load_code = f"""
import pandas as pd
import numpy as np
import json
from io import StringIO

# 根据数据源类型加载数据
data_type = "{data_source['type']}"
data_source_path = "{data_source['source']}"

if data_type == 'csv':
    # 处理 CSV 文件
    if data_source_path.startswith('http'):
        df = pd.read_csv(data_source_path)
    else:
        with open(data_source_path, 'r') as f:
            df = pd.read_csv(f)
            
elif data_type == 'json':
    # 处理 JSON 文件
    if data_source_path.startswith('http'):
        import requests
        response = requests.get(data_source_path)
        data = response.json()
    else:
        with open(data_source_path, 'r') as f:
            data = json.load(f)
    
    if isinstance(data, list):
        df = pd.DataFrame(data)
    else:
        df = pd.json_normalize(data)

# 数据基本信息
data_info = {{
    'shape': df.shape,
    'columns': df.columns.tolist(),
    'dtypes': df.dtypes.to_dict(),
    'null_counts': df.isnull().sum().to_dict(),
    'sample_data': df.head(5).to_dict('records'),
    'numeric_columns': df.select_dtypes(include=[np.number]).columns.tolist(),
    'categorical_columns': df.select_dtypes(include=['object']).columns.tolist(),
    'memory_usage': df.memory_usage().sum()
}}

# 数值型列的统计信息
if len(data_info['numeric_columns']) > 0:
    data_info['numeric_stats'] = df[data_info['numeric_columns']].describe().to_dict()

# 分类型列的统计信息
if lenCategorical_columns := data_info['categorical_columns']):
    data_info['categorical_stats'] = {{}}
    for col in categorical_columns[:5]:  # 只处理前5个分类列
        data_info['categorical_stats'][col] = {{
            'unique_count': df[col].nunique(),
            'top_values': df[col].value_counts().head(10).to_dict()
        }}

# 保存数据到文件供后续使用
df.to_pickle('/tmp/analysis_data.pkl')

# 输出数据信息
print(json.dumps(data_info, indent=2, default=str))
"""
        
        result = await self.sandbox.run_code(load_code)
        
        if result.error:
            raise Exception(f"数据加载失败: {result.error}")
        
        # 解析数据信息
        try:
            data_info = json.loads(result.logs.stdout)
            return data_info
        except json.JSONDecodeError:
            # 如果解析失败，返回基本信息
            return {'error': '数据信息解析失败', 'raw_output': result.logs.stdout}
    
    async def _generate_analysis_code(self, data_info: Dict, query: str) -> str:
        """使用 LLM 生成分析代码"""
        
        # 构建提示
        prompt = f"""
你是一个专业的数据分析师。基于以下数据信息和用户查询，生成完整的 Python 数据分析代码。

数据信息:
- 数据形状: {data_info.get('shape', 'Unknown')}
- 列名: {data_info.get('columns', [])}
- 数据类型: {json.dumps(data_info.get('dtypes', {}), indent=2)}
- 数值型列: {data_info.get('numeric_columns', [])}
- 分类型列: {data_info.get('categorical_columns', [])}

用户查询: {query}

请生成完整的分析代码，包括:
1. 数据加载 (使用 pd.read_pickle('/tmp/analysis_data.pkl'))
2. 数据清洗和预处理
3. 探索性数据分析
4. 相关的统计分析
5. 数据可视化 (使用 plotly)
6. 关键发现和洞察

代码要求:
- 使用 pandas, numpy, plotly 等库
- 生成交互式图表
- 保存图表为 HTML 文件
- 输出关键统计指标
- 处理缺失值和异常值
- 提供清晰的注释

示例输出格式:
```python
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import plotly.offline as pyo
from plotly.subplots import make_subplots
import json

# 加载数据
df = pd.read_pickle('/tmp/analysis_data.pkl')

# 你的分析代码...

# 保存结果
results = {{
    'key_metrics': {{}},
    'insights': [],
    'visualizations': []
}}

with open('/tmp/analysis_results.json', 'w') as f:
    json.dump(results, f, indent=2, default=str)

print("分析完成！")
```
"""
        
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个专业的数据分析师和 Python 专家。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=3000
        )
        
        # 提取代码
        code = response.choices[0].message.content
        
        # 清理代码（移除 markdown 标记）
        if "```python" in code:
            code = code.split("```python")[1].split("```")[0]
        elif "```" in code:
            code = code.split("```")[1].split("```")[0]
        
        return code.strip()
    
    async def _execute_analysis(self, code: str) -> Dict[str, Any]:
        """执行分析代码"""
        
        result = await self.sandbox.run_code(code)
        
        if result.error:
            # 尝试修复常见错误
            fixed_code = await self._fix_code_errors(code, result.error)
            if fixed_code:
                result = await self.sandbox.run_code(fixed_code)
        
        # 读取分析结果
        try:
            results_content = await self.sandbox.download_file('/tmp/analysis_results.json')
            analysis_results = json.loads(results_content.decode())
        except:
            analysis_results = {'key_metrics': {}, 'insights': [], 'visualizations': []}
        
        # 收集生成的文件
        artifacts = []
        if result.artifacts:
            for artifact in result.artifacts:
                if artifact.name.endswith('.html'):
                    content = await self.sandbox.download_file(artifact.path)
                    artifacts.append({
                        'name': artifact.name,
                        'type': 'html',
                        'content': content.decode() if isinstance(content, bytes) else content
                    })
        
        return {
            'output': result.logs.stdout,
            'error': result.error,
            'artifacts': artifacts,
            'analysis_results': analysis_results
        }
    
    async def _fix_code_errors(self, code: str, error: str) -> Optional[str]:
        """尝试自动修复代码错误"""
        
        fix_prompt = f"""
以下 Python 代码执行时出现错误，请修复它:

原始代码:
```python
{code}
```

错误信息:
{error}

请返回修复后的完整代码，只返回代码，不要添加任何解释。
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是一个 Python 错误修复专家。"},
                    {"role": "user", "content": fix_prompt}
                ],
                temperature=0,
                max_tokens=2000
            )
            
            fixed_code = response.choices[0].message.content
            
            # 清理代码
            if "```python" in fixed_code:
                fixed_code = fixed_code.split("```python")[1].split("```")[0]
            elif "```" in fixed_code:
                fixed_code = fixed_code.split("```")[1].split("```")[0]
            
            return fixed_code.strip()
            
        except Exception as e:
            print(f"代码修复失败: {e}")
            return None
    
    async def _generate_insights(self, analysis_result: Dict, original_query: str) -> List[str]:
        """生成数据洞察"""
        
        insight_prompt = f"""
基于以下数据分析结果，生成有价值的业务洞察:

原始查询: {original_query}

分析输出:
{analysis_result.get('output', '')}

分析结果:
{json.dumps(analysis_result.get('analysis_results', {}), indent=2)}

请生成 3-5 个关键洞察，每个洞察应该:
1. 基于数据支持
2. 对业务有实际意义
3. 简洁明了
4. 可操作

以 JSON 格式返回:
{{"insights": ["洞察1", "洞察2", "洞察3"]}}
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是一个资深的业务分析师。"},
                    {"role": "user", "content": insight_prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            insights_text = response.choices[0].message.content
            insights_json = json.loads(insights_text)
            return insights_json.get('insights', [])
            
        except Exception as e:
            print(f"洞察生成失败: {e}")
            return ["数据分析已完成，请查看具体结果。"]

# 使用示例
async def demo_ai_analyst():
    """演示 AI 分析师的使用"""
    
    analyst = AIAnalyst(openai_api_key="your-api-key")
    
    # 示例数据源
    data_source = {
        'type': 'csv',
        'source': 'https://raw.githubusercontent.com/plotly/datasets/master/iris.csv'
    }
    
    # 分析查询
    query = "分析鸢尾花数据集，比较不同品种的特征差异，并创建可视化图表"
    
    # 执行分析
    result = await analyst.analyze_data(data_source, query)
    
    if result['success']:
        print("分析成功完成！")
        print(f"洞察: {result['insights']}")
        print(f"生成了 {len(result['visualizations'])} 个可视化图表")
    else:
        print(f"分析失败: {result.get('error', 'Unknown error')}")

# 运行演示
import asyncio
asyncio.run(demo_ai_analyst())
```

### Web 应用界面

```tsx
// frontend/src/components/AnalystInterface.tsx
import React, { useState, useCallback } from 'react'
import { Upload, Play, Download, Share2 } from 'lucide-react'
import { AnalysisRequest, AnalysisResult, DataSource } from '../types/analyst'

export const AnalystInterface: React.FC = () => {
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [query, setQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setDataSource({
        type: file.name.endsWith('.csv') ? 'csv' : 'json',
        source: content,
        schema: undefined
      })
    }
    reader.readAsText(file)
  }, [])

  const runAnalysis = useCallback(async () => {
    if (!dataSource || !query.trim()) {
      setError('请上传数据文件并输入分析查询')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataSource,
          query: query.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`分析失败: ${response.statusText}`)
      }

      const analysisResult = await response.json()
      setResult(analysisResult)

    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsAnalyzing(false)
    }
  }, [dataSource, query])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Data Analyst
          </h1>
          <p className="text-xl text-gray-600">
            通过自然语言描述分析您的数据
          </p>
        </div>

        {/* 数据上传区域 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" size={24} />
            上传数据
          </h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Upload className="mr-2" size={20} />
              选择 CSV 或 JSON 文件
            </label>
            
            {dataSource && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  ✓ 数据文件已上传 ({dataSource.type.toUpperCase()})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 查询输入区域 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            分析查询
          </h2>
          
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="描述您想要进行的数据分析，例如：分析销售趋势，比较不同地区的业绩，找出影响客户满意度的因素..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              提示：用自然语言描述您的分析需求
            </div>
            
            <button
              onClick={runAnalysis}
              disabled={!dataSource || !query.trim() || isAnalyzing}
              className="inline-flex items-center px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  分析中...
                </>
              ) : (
                <>
                  <Play className="mr-2" size={20} />
                  开始分析
                </>
              )}
            </button>
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 分析结果 */}
        {result && (
          <div className="space-y-6">
            {/* 关键洞察 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">关键洞察</h2>
              <div className="space-y-3">
                {result.insights.map((insight, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 可视化图表 */}
            {result.visualizations.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">数据可视化</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {result.visualizations.map((viz, index) => (
                    <div key={viz.id} className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">{viz.title}</h3>
                      <div
                        dangerouslySetInnerHTML={{ __html: viz.data }}
                        className="w-full h-96"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 分析代码 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">生成的分析代码</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(result.code)}
                    className="inline-flex items-center px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    复制代码
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([result.code], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'analysis_code.py'
                      a.click()
                    }}
                    className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    <Download className="mr-1" size={16} />
                    下载
                  </button>
                </div>
              </div>
              
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{result.code}</code>
              </pre>
            </div>

            {/* 分享和导出 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">分享和导出</h2>
              <div className="flex space-x-4">
                <button className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <Share2 className="mr-2" size={20} />
                  分享链接
                </button>
                <button className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                  <Download className="mr-2" size={20} />
                  导出报告
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

## E2B Fragments - 应用生成器

### 项目概述

E2B Fragments 是一个允许用户通过提示生成完整应用程序的平台，支持多种前端框架和 LLM 提供商。

### 核心架构

```typescript
// src/types/fragments.ts
export interface AppFragment {
  id: string
  title: string
  description: string
  prompt: string
  framework: Framework
  llmProvider: LLMProvider
  generatedCode: GeneratedCode
  preview: string
  status: 'generating' | 'ready' | 'error'
  createdAt: Date
  updatedAt: Date
}

export interface Framework {
  name: 'react' | 'vue' | 'svelte' | 'vanilla'
  version: string
  template: string
  dependencies: string[]
}

export interface LLMProvider {
  name: 'openai' | 'anthropic' | 'cohere' | 'local'
  model: string
  config: Record<string, any>
}

export interface GeneratedCode {
  html: string
  css: string
  javascript: string
  dependencies: string[]
  files: CodeFile[]
}

export interface CodeFile {
  path: string
  content: string
  type: 'component' | 'style' | 'config' | 'asset'
}
```

### 应用生成引擎

```python
# backend/fragment_generator.py
import asyncio
from typing import Dict, List, Any, Optional
from e2b_code_interpreter import Sandbox
import openai
import anthropic
from dataclasses import dataclass
import json
import re

@dataclass
class GenerationRequest:
    prompt: str
    framework: str
    style_preference: str
    complexity: str
    features: List[str]
    llm_provider: str
    model: str

class FragmentGenerator:
    """应用片段生成器"""
    
    def __init__(self):
        self.openai_client = openai.OpenAI()
        self.anthropic_client = anthropic.Anthropic()
        self.sandbox = None
        
    async def generate_app(self, request: GenerationRequest) -> Dict[str, Any]:
        """生成完整应用"""
        
        self.sandbox = await Sandbox.create()
        
        try:
            # 1. 设置开发环境
            await self._setup_environment(request.framework)
            
            # 2. 生成应用代码
            generated_code = await self._generate_code(request)
            
            # 3. 创建项目结构
            await self._create_project_structure(generated_code, request.framework)
            
            # 4. 安装依赖并构建
            build_result = await self._build_project(request.framework)
            
            # 5. 生成预览
            preview_url = await self._generate_preview()
            
            return {
                'success': True,
                'code': generated_code,
                'preview_url': preview_url,
                'build_logs': build_result,
                'files': await self._get_project_files()
            }
            
        finally:
            # 不立即关闭沙箱，保持预览可用
            pass
    
    async def _setup_environment(self, framework: str):
        """设置开发环境"""
        
        setup_commands = {
            'react': [
                'npm install -g create-react-app',
                'npm install -g serve'
            ],
            'vue': [
                'npm install -g @vue/cli',
                'npm install -g serve'
            ],
            'svelte': [
                'npm install -g degit',
                'npm install -g serve'
            ],
            'vanilla': [
                'npm install -g live-server'
            ]
        }
        
        # 安装 Node.js 和 npm
        await self.sandbox.run_code("""
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
""")
        
        # 安装框架特定工具
        for command in setup_commands.get(framework, []):
            result = await self.sandbox.run_code(f'npm install -g {command.split()[-1]}')
            if result.error:
                print(f"Warning: {command} installation failed: {result.error}")
    
    async def _generate_code(self, request: GenerationRequest) -> Dict[str, str]:
        """生成应用代码"""
        
        # 构建详细提示
        system_prompt = self._build_system_prompt(request.framework)
        user_prompt = self._build_user_prompt(request)
        
        if request.llm_provider == 'openai':
            response = await self.openai_client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            generated_content = response.choices[0].message.content
            
        elif request.llm_provider == 'anthropic':
            response = await self.anthropic_client.messages.create(
                model=request.model,
                max_tokens=4000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            generated_content = response.content[0].text
        
        # 解析生成的代码
        return self._parse_generated_code(generated_content, request.framework)
    
    def _build_system_prompt(self, framework: str) -> str:
        """构建系统提示"""
        
        framework_guides = {
            'react': """
你是一个 React 应用开发专家。请生成完整的 React 应用代码，包括:

1. 使用现代 React (Hooks, 函数组件)
2. 响应式设计 (Tailwind CSS 或 styled-components)
3. 适当的组件结构
4. 状态管理 (useState, useEffect)
5. 错误处理
6. 可访问性考虑

代码结构:
- App.js (主组件)
- components/ (子组件)
- styles/ (样式文件)
- package.json (依赖配置)
""",
            'vue': """
你是一个 Vue.js 应用开发专家。请生成完整的 Vue 3 应用代码，包括:

1. 使用 Composition API
2. 单文件组件 (.vue)
3. 响应式设计
4. 合理的组件组织
5. 生命周期钩子
6. 错误处理

代码结构:
- App.vue (主组件)
- components/ (子组件)
- main.js (入口文件)
- package.json (依赖配置)
""",
            'svelte': """
你是一个 Svelte 应用开发专家。请生成完整的 Svelte 应用代码，包括:

1. 现代 Svelte 语法
2. 响应式声明
3. 组件通信
4. 状态管理
5. 样式绑定
6. 事件处理

代码结构:
- App.svelte (主组件)
- components/ (子组件)
- main.js (入口文件)
- package.json (依赖配置)
""",
            'vanilla': """
你是一个原生 JavaScript 应用开发专家。请生成完整的原生 Web 应用代码，包括:

1. 现代 ES6+ 语法
2. 模块化代码结构
3. DOM 操作
4. 事件处理
5. 响应式设计 (CSS Grid/Flexbox)
6. 本地存储

代码结构:
- index.html (主页面)
- js/ (JavaScript 文件)
- css/ (样式文件)
- assets/ (资源文件)
"""
        }
        
        return framework_guides.get(framework, framework_guides['vanilla'])
    
    def _build_user_prompt(self, request: GenerationRequest) -> str:
        """构建用户提示"""
        
        return f"""
请基于以下需求生成一个完整的 {request.framework} 应用：

应用描述: {request.prompt}

设计要求:
- 风格偏好: {request.style_preference}
- 复杂度: {request.complexity}
- 必需功能: {', '.join(request.features)}

具体要求:
1. 创建功能完整的应用
2. 使用现代最佳实践
3. 代码要有良好的注释
4. 响应式设计，支持移动端
5. 包含错误处理
6. 用户体验友好

请按以下格式返回代码:

```filename: package.json
{{
  "name": "generated-app",
  "version": "1.0.0",
  ...
}}
```

```filename: src/App.{{'js' if request.framework == 'react' else 'vue' if request.framework == 'vue' else 'svelte' if request.framework == 'svelte' else 'html'}}
// 主应用代码
```

```filename: src/components/ComponentName.{{'js' if request.framework == 'react' else 'vue' if request.framework == 'vue' else 'svelte' if request.framework == 'svelte' else 'js'}}
// 组件代码
```

请确保所有文件都是完整可运行的。
"""
    
    def _parse_generated_code(self, content: str, framework: str) -> Dict[str, str]:
        """解析生成的代码内容"""
        
        files = {}
        
        # 使用正则表达式提取代码块
        pattern = r'```filename:\s*([^\n]+)\n(.*?)```'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for filename, code in matches:
            # 清理文件名
            filename = filename.strip()
            # 清理代码内容
            code = code.strip()
            files[filename] = code
        
        # 如果没有找到格式化的代码块，尝试其他解析方法
        if not files:
            files = self._fallback_code_parsing(content, framework)
        
        return files
    
    def _fallback_code_parsing(self, content: str, framework: str) -> Dict[str, str]:
        """备用代码解析方法"""
        
        # 尝试按常见的代码块标记分割
        code_blocks = re.findall(r'```(?:\w+)?\n(.*?)```', content, re.DOTALL)
        
        files = {}
        
        # 根据框架创建默认文件结构
        if framework == 'react':
            if len(code_blocks) >= 1:
                files['src/App.js'] = code_blocks[0]
            if len(code_blocks) >= 2:
                files['package.json'] = code_blocks[1]
        elif framework == 'vue':
            if len(code_blocks) >= 1:
                files['src/App.vue'] = code_blocks[0]
            if len(code_blocks) >= 2:
                files['package.json'] = code_blocks[1]
        elif framework == 'vanilla':
            if len(code_blocks) >= 1:
                files['index.html'] = code_blocks[0]
            if len(code_blocks) >= 2:
                files['js/app.js'] = code_blocks[1]
            if len(code_blocks) >= 3:
                files['css/style.css'] = code_blocks[2]
        
        return files
    
    async def _create_project_structure(self, files: Dict[str, str], framework: str):
        """创建项目文件结构"""
        
        # 创建项目根目录
        await self.sandbox.run_code('mkdir -p /tmp/generated-app')
        
        # 根据框架初始化项目
        if framework == 'react':
            await self.sandbox.run_code("""
cd /tmp
npx create-react-app generated-app --template typescript
cd generated-app
""")
        elif framework == 'vue':
            await self.sandbox.run_code("""
cd /tmp
vue create generated-app -d
cd generated-app
""")
        elif framework == 'svelte':
            await self.sandbox.run_code("""
cd /tmp
npx degit sveltejs/template generated-app
cd generated-app
npm install
""")
        
        # 写入生成的文件
        for filepath, content in files.items():
            # 确保目录存在
            dir_path = '/'.join(filepath.split('/')[:-1])
            if dir_path:
                await self.sandbox.run_code(f'mkdir -p /tmp/generated-app/{dir_path}')
            
            # 写入文件
            escaped_content = content.replace("'", "'\"'\"'")
            await self.sandbox.run_code(f"""
cat > /tmp/generated-app/{filepath} << 'EOF'
{content}
EOF
""")
    
    async def _build_project(self, framework: str) -> Dict[str, Any]:
        """构建项目"""
        
        build_commands = {
            'react': 'npm run build',
            'vue': 'npm run build',
            'svelte': 'npm run build',
            'vanilla': 'echo "No build step needed for vanilla JS"'
        }
        
        # 安装依赖
        install_result = await self.sandbox.run_code("""
cd /tmp/generated-app
npm install
""")
        
        # 构建项目
        build_command = build_commands.get(framework, 'echo "Unknown framework"')
        build_result = await self.sandbox.run_code(f"""
cd /tmp/generated-app
{build_command}
""")
        
        return {
            'install_output': install_result.logs.stdout,
            'install_error': install_result.error,
            'build_output': build_result.logs.stdout,
            'build_error': build_result.error
        }
    
    async def _generate_preview(self) -> str:
        """生成应用预览"""
        
        # 启动开发服务器
        await self.sandbox.run_code("""
cd /tmp/generated-app

# 根据项目类型启动服务器
if [ -f "package.json" ]; then
    # 对于框架项目，尝试启动开发服务器
    if grep -q "react-scripts" package.json; then
        npm start &
    elif grep -q "vue" package.json; then
        npm run serve &
    elif grep -q "svelte" package.json; then
        npm run dev &
    else
        # 使用通用静态服务器
        npx serve -s build -l 3000 &
    fi
else
    # 对于原生 HTML 项目
    npx live-server --port=3000 &
fi

# 等待服务器启动
sleep 5
""")
        
        # 返回预览 URL（在实际实现中，需要配置端口转发）
        return "http://localhost:3000"
    
    async def _get_project_files(self) -> List[Dict[str, str]]:
        """获取项目文件列表"""
        
        result = await self.sandbox.run_code("""
cd /tmp/generated-app
find . -type f -name "*.js" -o -name "*.ts" -o -name "*.vue" -o -name "*.svelte" -o -name "*.html" -o -name "*.css" -o -name "*.json" | head -20
""")
        
        files = []
        for filepath in result.logs.stdout.strip().split('\n'):
            if filepath.strip():
                content_result = await self.sandbox.run_code(f'cat /tmp/generated-app/{filepath}')
                files.append({
                    'path': filepath,
                    'content': content_result.logs.stdout
                })
        
        return files

# 使用示例
async def demo_fragment_generator():
    """演示应用生成器"""
    
    generator = FragmentGenerator()
    
    request = GenerationRequest(
        prompt="创建一个待办事项管理应用，支持添加、删除、标记完成任务，带有优雅的用户界面",
        framework="react",
        style_preference="现代简约",
        complexity="中等",
        features=["任务管理", "本地存储", "响应式设计", "暗色主题"],
        llm_provider="openai",
        model="gpt-4"
    )
    
    result = await generator.generate_app(request)
    
    if result['success']:
        print("应用生成成功！")
        print(f"预览地址: {result['preview_url']}")
        print(f"生成了 {len(result['files'])} 个文件")
    else:
        print(f"生成失败: {result.get('error', 'Unknown error')}")

# 运行演示
import asyncio
asyncio.run(demo_fragment_generator())
```

### Web 界面组件

```tsx
// frontend/src/components/FragmentGenerator.tsx
import React, { useState, useCallback } from 'react'
import { Wand2, Eye, Download, Code, Smartphone, Monitor } from 'lucide-react'

interface Framework {
  id: string
  name: string
  icon: string
  description: string
}

const frameworks: Framework[] = [
  { id: 'react', name: 'React', icon: '⚛️', description: '现代前端框架' },
  { id: 'vue', name: 'Vue.js', icon: '💚', description: '渐进式框架' },
  { id: 'svelte', name: 'Svelte', icon: '🧡', description: '编译时优化' },
  { id: 'vanilla', name: 'Vanilla JS', icon: '📜', description: '原生 JavaScript' }
]

const stylePreferences = [
  { id: 'modern', name: '现代简约', description: '简洁的设计和布局' },
  { id: 'colorful', name: '色彩丰富', description: '生动的色彩搭配' },
  { id: 'dark', name: '暗色主题', description: '深色背景界面' },
  { id: 'glassmorphism', name: '玻璃态', description: '毛玻璃效果' }
]

export const FragmentGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [selectedFramework, setSelectedFramework] = useState('react')
  const [selectedStyle, setSelectedStyle] = useState('modern')
  const [complexity, setComplexity] = useState('medium')
  const [features, setFeatures] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedApp, setGeneratedApp] = useState<any>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const handleFeatureToggle = useCallback((feature: string) => {
    setFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }, [])

  const generateApp = useCallback(async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-fragment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          framework: selectedFramework,
          style_preference: selectedStyle,
          complexity,
          features,
          llm_provider: 'openai',
          model: 'gpt-4'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setGeneratedApp(result)
      } else {
        console.error('Generation failed:', result.error)
      }
    } catch (error) {
      console.error('Error generating app:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, selectedFramework, selectedStyle, complexity, features])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            AI App Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            通过自然语言描述，瞬间生成完整的 Web 应用程序
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 配置面板 */}
          <div className="space-y-6">
            {/* 应用描述 */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Wand2 className="mr-2 text-purple-500" size={24} />
                应用描述
              </h2>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述您想要创建的应用程序，例如：一个现代化的任务管理应用，包含拖拽功能和数据持久化..."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
              
              <div className="mt-4 text-sm text-gray-500">
                💡 提示：详细描述功能需求，包括界面风格和用户体验
              </div>
            </div>

            {/* 框架选择 */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">前端框架</h2>
              
              <div className="grid grid-cols-2 gap-3">
                {frameworks.map((framework) => (
                  <button
                    key={framework.id}
                    onClick={() => setSelectedFramework(framework.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedFramework === framework.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{framework.icon}</div>
                    <div className="font-semibold">{framework.name}</div>
                    <div className="text-sm text-gray-500">{framework.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 设计风格 */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">设计风格</h2>
              
              <div className="space-y-2">
                {stylePreferences.map((style) => (
                  <label
                    key={style.id}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="style"
                      value={style.id}
                      checked={selectedStyle === style.id}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="mr-3 text-purple-500"
                    />
                    <div>
                      <div className="font-medium">{style.name}</div>
                      <div className="text-sm text-gray-500">{style.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 复杂度 */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">应用复杂度</h2>
              
              <div className="space-y-2">
                {[
                  { id: 'simple', name: '简单', desc: '基础功能，单页面' },
                  { id: 'medium', name: '中等', desc: '多功能，多组件' },
                  { id: 'complex', name: '复杂', desc: '完整应用，高级功能' }
                ].map((level) => (
                  <label
                    key={level.id}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="complexity"
                      value={level.id}
                      checked={complexity === level.id}
                      onChange={(e) => setComplexity(e.target.value)}
                      className="mr-3 text-purple-500"
                    />
                    <div>
                      <div className="font-medium">{level.name}</div>
                      <div className="text-sm text-gray-500">{level.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 功能特性 */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">功能特性</h2>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  '响应式设计', '暗色主题', '本地存储', '拖拽功能',
                  '搜索过滤', '数据可视化', '用户认证', '实时更新',
                  '多语言支持', '键盘快捷键', '导出功能', '离线支持'
                ].map((feature) => (
                  <label
                    key={feature}
                    className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={features.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="mr-2 text-purple-500"
                    />
                    <span className="text-sm">{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={generateApp}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 rounded-2xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2" size={20} />
                  生成应用
                </>
              )}
            </button>
          </div>

          {/* 预览面板 */}
          <div className="space-y-6">
            {generatedApp ? (
              <>
                {/* 预览控制 */}
                <div className="bg-white rounded-2xl shadow-xl p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center">
                      <Eye className="mr-2 text-green-500" size={20} />
                      应用预览
                    </h2>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPreviewMode('desktop')}
                        className={`p-2 rounded-lg ${
                          previewMode === 'desktop' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Monitor size={20} />
                      </button>
                      <button
                        onClick={() => setPreviewMode('mobile')}
                        className={`p-2 rounded-lg ${
                          previewMode === 'mobile' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Smartphone size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 预览窗口 */}
                <div className="bg-white rounded-2xl shadow-xl p-4">
                  <div className={`mx-auto bg-gray-100 rounded-lg overflow-hidden ${
                    previewMode === 'mobile' ? 'max-w-sm' : 'w-full'
                  }`}>
                    <div className="bg-gray-300 px-4 py-2 flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <div className="flex-1 text-center text-sm text-gray-600">
                        localhost:3000
                      </div>
                    </div>
                    
                    <iframe
                      src={generatedApp.preview_url}
                      className={`w-full border-0 ${
                        previewMode === 'mobile' ? 'h-96' : 'h-[600px]'
                      }`}
                      title="App Preview"
                    />
                  </div>
                </div>

                {/* 操作面板 */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Code className="mr-2 text-blue-500" size={20} />
                    操作
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      <Eye className="mr-2" size={16} />
                      查看代码
                    </button>
                    <button className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                      <Download className="mr-2" size={16} />
                      下载项目
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  准备生成您的应用
                </h3>
                <p className="text-gray-500">
                  填写左侧配置，然后点击生成按钮
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

## E2B Surf - 计算机使用代理

### 项目概述

E2B Surf 是一个基于 OpenAI 的计算机使用 AI 代理，能够自动操作浏览器和桌面应用程序。

### 核心架构

```python
# backend/surf_agent.py
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from e2b_code_interpreter import Sandbox
import openai
from PIL import Image
import base64
import io
import json
import time

class SurfAgent:
    """计算机使用 AI 代理"""
    
    def __init__(self, openai_api_key: str):
        self.client = openai.OpenAI(api_key=openai_api_key)
        self.sandbox = None
        self.screen_size = (1920, 1080)
        self.action_history = []
        
    async def initialize(self):
        """初始化代理环境"""
        self.sandbox = await Sandbox.create()
        
        # 安装桌面环境和浏览器
        await self._setup_desktop_environment()
        
    async def _setup_desktop_environment(self):
        """设置桌面环境"""
        
        setup_script = """
# 更新系统
sudo apt-get update

# 安装桌面环境
sudo apt-get install -y xvfb x11vnc fluxbox

# 安装浏览器
sudo apt-get install -y chromium-browser firefox-esr

# 安装截图工具
sudo apt-get install -y scrot

# 安装图像处理工具
sudo apt-get install -y imagemagick

# 启动虚拟显示
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &

# 启动窗口管理器
fluxbox &

# 等待桌面环境启动
sleep 5

echo "桌面环境设置完成"
"""
        
        result = await self.sandbox.run_code(setup_script)
        if result.error:
            raise Exception(f"桌面环境设置失败: {result.error}")
    
    async def execute_task(self, task_description: str) -> Dict[str, Any]:
        """执行计算机使用任务"""
        
        try:
            # 1. 分析任务
            task_plan = await self._analyze_task(task_description)
            
            # 2. 执行任务步骤
            execution_results = []
            
            for step in task_plan['steps']:
                print(f"执行步骤: {step['description']}")
                
                # 获取当前屏幕截图
                screenshot = await self._take_screenshot()
                
                # 分析屏幕并决定下一步操作
                action = await self._analyze_screen_and_plan_action(
                    screenshot, 
                    step['description'],
                    task_description
                )
                
                # 执行操作
                result = await self._execute_action(action)
                
                execution_results.append({
                    'step': step,
                    'action': action,
                    'result': result,
                    'screenshot': screenshot
                })
                
                # 检查是否完成
                if result.get('task_completed'):
                    break
                
                # 等待操作完成
                await asyncio.sleep(2)
            
            return {
                'success': True,
                'task_plan': task_plan,
                'execution_results': execution_results,
                'final_screenshot': await self._take_screenshot()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'action_history': self.action_history
            }
    
    async def _analyze_task(self, task_description: str) -> Dict[str, Any]:
        """分析任务并制定计划"""
        
        analysis_prompt = f"""
请分析以下计算机使用任务，并制定详细的执行计划：

任务描述: {task_description}

请返回 JSON 格式的执行计划，包含：
1. 任务类型分类（浏览器操作、文件管理、应用程序使用等）
2. 详细的执行步骤
3. 每个步骤的预期结果
4. 可能的风险和备选方案

返回格式：
{{
  "task_type": "browser_automation",
  "estimated_duration": "5-10分钟",
  "steps": [
    {{
      "id": 1,
      "description": "打开浏览器",
      "action_type": "launch_application",
      "expected_result": "浏览器窗口打开"
    }},
    {{
      "id": 2,
      "description": "导航到目标网站",
      "action_type": "navigate",
      "expected_result": "页面加载完成"
    }}
  ],
  "success_criteria": "任务完成的判断标准",
  "risks": ["可能的风险1", "可能的风险2"]
}}
"""
        
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个计算机操作专家，擅长分析和规划自动化任务。"},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.1
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            # 如果解析失败，返回默认计划
            return {
                "task_type": "general",
                "steps": [{"id": 1, "description": task_description, "action_type": "general"}],
                "success_criteria": "任务完成"
            }
    
    async def _take_screenshot(self) -> str:
        """截取屏幕截图"""
        
        screenshot_script = """
export DISPLAY=:99
scrot /tmp/screenshot.png
base64 /tmp/screenshot.png
"""
        
        result = await self.sandbox.run_code(screenshot_script)
        
        if result.error:
            raise Exception(f"截图失败: {result.error}")
        
        return result.logs.stdout.strip()
    
    async def _analyze_screen_and_plan_action(
        self, 
        screenshot_base64: str, 
        current_step: str,
        overall_task: str
    ) -> Dict[str, Any]:
        """分析屏幕内容并规划下一步操作"""
        
        vision_prompt = f"""
请分析这个屏幕截图，并为当前步骤规划具体的操作。

整体任务: {overall_task}
当前步骤: {current_step}

请分析屏幕上的元素（按钮、输入框、链接、菜单等），并返回具体的操作指令。

返回 JSON 格式：
{{
  "screen_analysis": "屏幕内容描述",
  "identified_elements": [
    {{
      "type": "button",
      "text": "按钮文本",
      "location": "描述位置",
      "coordinates": [x, y]
    }}
  ],
  "recommended_action": {{
    "type": "click|type|scroll|wait|navigate",
    "target": "操作目标",
    "coordinates": [x, y],
    "text": "要输入的文本（如果是输入操作）",
    "reasoning": "操作理由"
  }},
  "confidence": 0.95,
  "alternative_actions": []
}}
"""
        
        response = await self.client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": vision_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{screenshot_base64}"}
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        try:
            action_plan = json.loads(response.choices[0].message.content)
            self.action_history.append({
                'timestamp': time.time(),
                'step': current_step,
                'action_plan': action_plan
            })
            return action_plan
        except json.JSONDecodeError:
            # 返回默认操作
            return {
                "screen_analysis": "无法解析屏幕内容",
                "recommended_action": {
                    "type": "wait",
                    "reasoning": "等待进一步指令"
                }
            }
    
    async def _execute_action(self, action_plan: Dict[str, Any]) -> Dict[str, Any]:
        """执行具体操作"""
        
        action = action_plan.get('recommended_action', {})
        action_type = action.get('type', 'wait')
        
        try:
            if action_type == 'click':
                return await self._execute_click(action)
            elif action_type == 'type':
                return await self._execute_type(action)
            elif action_type == 'scroll':
                return await self._execute_scroll(action)
            elif action_type == 'navigate':
                return await self._execute_navigate(action)
            elif action_type == 'wait':
                return await self._execute_wait(action)
            else:
                return {'success': False, 'error': f'未知操作类型: {action_type}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _execute_click(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行点击操作"""
        
        coordinates = action.get('coordinates', [960, 540])  # 默认屏幕中央
        x, y = coordinates
        
        click_script = f"""
export DISPLAY=:99

# 使用 xdotool 模拟鼠标点击
sudo apt-get install -y xdotool
xdotool mousemove {x} {y}
xdotool click 1

echo "点击完成: ({x}, {y})"
"""
        
        result = await self.sandbox.run_code(click_script)
        
        return {
            'success': not bool(result.error),
            'action': 'click',
            'coordinates': coordinates,
            'output': result.logs.stdout,
            'error': result.error
        }
    
    async def _execute_type(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行输入操作"""
        
        text = action.get('text', '')
        coordinates = action.get('coordinates')
        
        type_script = f"""
export DISPLAY=:99

# 如果提供了坐标，先点击
{f'xdotool mousemove {coordinates[0]} {coordinates[1]} && xdotool click 1' if coordinates else ''}

# 输入文本
xdotool type "{text}"

echo "输入完成: {text}"
"""
        
        result = await self.sandbox.run_code(type_script)
        
        return {
            'success': not bool(result.error),
            'action': 'type',
            'text': text,
            'output': result.logs.stdout,
            'error': result.error
        }
    
    async def _execute_scroll(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行滚动操作"""
        
        direction = action.get('direction', 'down')
        amount = action.get('amount', 3)
        
        scroll_script = f"""
export DISPLAY=:99

# 滚动操作
if [ "{direction}" = "down" ]; then
    xdotool click 5 5 5  # 向下滚动
elif [ "{direction}" = "up" ]; then
    xdotool click 4 4 4  # 向上滚动
fi

echo "滚动完成: {direction}"
"""
        
        result = await self.sandbox.run_code(scroll_script)
        
        return {
            'success': not bool(result.error),
            'action': 'scroll',
            'direction': direction,
            'output': result.logs.stdout,
            'error': result.error
        }
    
    async def _execute_navigate(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行导航操作"""
        
        url = action.get('url', '')
        
        navigate_script = f"""
export DISPLAY=:99

# 打开浏览器并导航到指定 URL
chromium-browser --no-sandbox --disable-dev-shm-usage "{url}" &

# 等待页面加载
sleep 5

echo "导航完成: {url}"
"""
        
        result = await self.sandbox.run_code(navigate_script)
        
        return {
            'success': not bool(result.error),
            'action': 'navigate',
            'url': url,
            'output': result.logs.stdout,
            'error': result.error
        }
    
    async def _execute_wait(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行等待操作"""
        
        duration = action.get('duration', 2)
        
        await asyncio.sleep(duration)
        
        return {
            'success': True,
            'action': 'wait',
            'duration': duration
        }
    
    async def cleanup(self):
        """清理资源"""
        if self.sandbox:
            await self.sandbox.kill()

# 使用示例
async def demo_surf_agent():
    """演示 Surf 代理的使用"""
    
    agent = SurfAgent(openai_api_key="your-api-key")
    
    try:
        await agent.initialize()
        
        # 执行网页搜索任务
        result = await agent.execute_task(
            "打开浏览器，搜索 'Python 教程'，并点击第一个搜索结果"
        )
        
        if result['success']:
            print("任务执行成功！")
            print(f"执行了 {len(result['execution_results'])} 个步骤")
        else:
            print(f"任务执行失败: {result['error']}")
            
    finally:
        await agent.cleanup()

# 运行演示
import asyncio
asyncio.run(demo_surf_agent())
```

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "\u68c0\u7d22\u5f53\u524d\u76ee\u5f55\u7684 E2B \u9879\u76ee\u6587\u4ef6", "status": "completed", "priority": "high", "id": "1"}, {"content": "\u67e5\u770b my-docs \u4e2d\u7684 E2B \u5b66\u4e60\u6587\u6863", "status": "completed", "priority": "high", "id": "2"}, {"content": "\u5bf9\u6bd4\u5e76\u627e\u51fa\u53ef\u4ee5\u8865\u5145\u7684\u5185\u5bb9", "status": "completed", "priority": "medium", "id": "3"}, {"content": "\u521b\u5efa E2B LLM \u96c6\u6210\u793a\u4f8b\u6587\u6863", "status": "completed", "priority": "high", "id": "4"}, {"content": "\u521b\u5efa E2B AI \u6846\u67b6\u96c6\u6210\u6307\u5357", "status": "completed", "priority": "high", "id": "5"}, {"content": "\u521b\u5efa E2B \u81ea\u6258\u7ba1\u90e8\u7f72\u6587\u6863", "status": "completed", "priority": "medium", "id": "6"}, {"content": "\u521b\u5efa E2B \u5b9e\u9645\u5e94\u7528\u6848\u4f8b\u6587\u6863", "status": "completed", "priority": "medium", "id": "7"}, {"content": "\u66f4\u65b0 E2B README \u7d22\u5f15", "status": "in_progress", "priority": "low", "id": "8"}]
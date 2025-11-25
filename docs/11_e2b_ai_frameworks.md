# E2B AI 框架集成指南

本文档详细介绍了如何将 E2B 与主流 AI 开发框架集成，包括 LangChain、LangGraph、Autogen、Vercel AI SDK 和 AgentKit 等，构建强大的 AI 应用。

## 📋 目录

- [LangChain 集成](#langchain-集成)
- [LangGraph 工作流集成](#langgraph-工作流集成)
- [Autogen 多代理集成](#autogen-多代理集成)
- [Vercel AI SDK 集成](#vercel-ai-sdk-集成)
- [AgentKit 编码代理](#agentkit-编码代理)
- [框架对比与选择](#框架对比与选择)
- [高级集成模式](#高级集成模式)

## LangChain 集成

### 概述

LangChain 是最流行的 LLM 应用开发框架，E2B 可以作为 LangChain 的工具（Tool）集成，提供安全的代码执行环境。

### 基础集成

```python
from langchain.tools import Tool
from langchain.agents import initialize_agent, AgentType
from langchain.chat_models import ChatOpenAI
from e2b_code_interpreter import Sandbox
import json

class E2BTool:
    """E2B 作为 LangChain 工具"""
    
    def __init__(self):
        self.sandbox = None
        
    def _ensure_sandbox(self):
        """确保沙箱已初始化"""
        if not self.sandbox:
            self.sandbox = Sandbox()
    
    def run_code(self, code: str) -> str:
        """执行 Python 代码"""
        self._ensure_sandbox()
        try:
            result = self.sandbox.run_code(code)
            output = {
                "stdout": result.logs.stdout,
                "stderr": result.logs.stderr,
                "error": result.error,
                "artifacts": [
                    {"name": a.name, "type": a.type} 
                    for a in result.artifacts
                ] if result.artifacts else []
            }
            return json.dumps(output, indent=2)
        except Exception as e:
            return f"Error: {str(e)}"
    
    def cleanup(self):
        """清理资源"""
        if self.sandbox:
            self.sandbox.kill()

# 创建 LangChain 工具
e2b_tool = E2BTool()

# 定义工具
tools = [
    Tool(
        name="Python Code Interpreter",
        func=e2b_tool.run_code,
        description="""
        Use this tool to execute Python code in a secure sandbox environment.
        Input should be valid Python code.
        The tool will return the output, including stdout, stderr, and any generated files.
        Perfect for data analysis, calculations, and creating visualizations.
        """
    )
]

# 初始化 LLM 和代理
llm = ChatOpenAI(model="gpt-4", temperature=0)
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# 使用示例
response = agent.run("""
分析这组数据并创建可视化：
data = [23, 45, 56, 78, 32, 67, 89, 12, 34, 56]
1. 计算基本统计信息
2. 创建直方图
3. 识别异常值
""")

print(response)
```

### 高级 LangChain 集成

```python
from langchain.memory import ConversationBufferMemory
from langchain.callbacks import StreamingStdOutCallbackHandler
from langchain.schema import Document
from typing import List, Dict, Any
import asyncio

class AdvancedE2BChain:
    """高级 E2B LangChain 集成"""
    
    def __init__(self, model_name: str = "gpt-4"):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0,
            streaming=True,
            callbacks=[StreamingStdOutCallbackHandler()]
        )
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        self.sandbox = None
        self.context_documents: List[Document] = []
        
    async def initialize_sandbox(self):
        """异步初始化沙箱"""
        self.sandbox = await Sandbox.create()
        
        # 预装常用库
        setup_code = """
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import requests
import json
from datetime import datetime, timedelta
import sqlite3

# 设置绘图样式
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

print("环境初始化完成！")
print("可用库: pandas, numpy, matplotlib, seaborn, requests, sqlite3")
"""
        await self.sandbox.run_code(setup_code)
    
    def add_context(self, documents: List[Document]):
        """添加上下文文档"""
        self.context_documents.extend(documents)
    
    async def process_with_context(self, query: str) -> Dict[str, Any]:
        """处理带上下文的查询"""
        # 构建上下文
        context = "\n".join([doc.page_content for doc in self.context_documents])
        
        # 创建增强提示
        enhanced_prompt = f"""
        Context information:
        {context}
        
        User query: {query}
        
        Based on the context, write Python code to answer the query.
        Use the sandbox environment to execute the code.
        """
        
        # 使用 Chain 处理
        from langchain.chains import LLMChain
        from langchain.prompts import ChatPromptTemplate
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful AI assistant with access to a Python code interpreter."),
            ("human", "{input}")
        ])
        
        chain = LLMChain(
            llm=self.llm,
            prompt=prompt,
            memory=self.memory
        )
        
        # 获取 LLM 响应
        response = await chain.arun(input=enhanced_prompt)
        
        # 提取并执行代码
        code = self._extract_code(response)
        if code:
            result = await self.sandbox.run_code(code)
            return {
                "response": response,
                "code": code,
                "execution_result": result,
                "context_used": len(self.context_documents)
            }
        
        return {"response": response, "code": None}
    
    def _extract_code(self, text: str) -> str:
        """从文本中提取代码"""
        import re
        code_blocks = re.findall(r'```python\n(.*?)\n```', text, re.DOTALL)
        return '\n\n'.join(code_blocks) if code_blocks else ""
    
    async def create_rag_pipeline(self, data_source: str):
        """创建 RAG (Retrieval-Augmented Generation) 管道"""
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain.embeddings import OpenAIEmbeddings
        from langchain.vectorstores import FAISS
        
        # 在沙箱中处理数据
        load_code = f"""
# 加载和处理数据
import pandas as pd

# 假设是 CSV 文件
data = pd.read_csv('{data_source}')
print(f"数据形状: {{data.shape}}")
print(f"列: {{data.columns.tolist()}}")

# 转换为文本用于 RAG
text_data = []
for idx, row in data.iterrows():
    text = " | ".join([f"{{col}}: {{row[col]}}" for col in data.columns])
    text_data.append(text)

# 保存处理后的文本
with open('/tmp/processed_data.txt', 'w') as f:
    f.write('\\n'.join(text_data))
    
print(f"处理了 {{len(text_data)}} 条记录")
"""
        
        result = await self.sandbox.run_code(load_code)
        
        # 下载处理后的数据
        processed_data = await self.sandbox.download_file('/tmp/processed_data.txt')
        
        # 创建向量存储
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        documents = text_splitter.create_documents([processed_data])
        embeddings = OpenAIEmbeddings()
        vectorstore = FAISS.from_documents(documents, embeddings)
        
        return vectorstore
    
    async def cleanup(self):
        """清理资源"""
        if self.sandbox:
            await self.sandbox.kill()

# 使用示例
async def advanced_langchain_demo():
    chain = AdvancedE2BChain()
    await chain.initialize_sandbox()
    
    # 添加上下文
    chain.add_context([
        Document(page_content="公司 2023 年收入为 1000 万美元"),
        Document(page_content="主要产品包括 AI 工具和数据分析平台"),
        Document(page_content="客户主要分布在北美和欧洲")
    ])
    
    # 处理查询
    result = await chain.process_with_context(
        "基于提供的公司信息，创建一个收入预测模型并可视化未来 5 年的增长趋势"
    )
    
    print(f"执行结果: {result}")
    
    await chain.cleanup()

# 运行示例
asyncio.run(advanced_langchain_demo())
```

## LangGraph 工作流集成

### 概述

LangGraph 是 LangChain 的工作流扩展，支持创建复杂的有状态 AI 应用。E2B 可以作为 LangGraph 中的节点，处理代码执行任务。

### 基础 LangGraph 集成

```python
from langgraph.graph import Graph, Node
from langgraph.prebuilt import ToolExecutor
from langchain.tools import Tool
from e2b_code_interpreter import Sandbox
from typing import TypedDict, Annotated, Sequence
import operator

class GraphState(TypedDict):
    """图状态定义"""
    messages: Annotated[Sequence[str], operator.add]
    code_history: Annotated[Sequence[str], operator.add]
    results: Annotated[Sequence[dict], operator.add]
    current_context: dict
    sandbox: Sandbox

class E2BLangGraphIntegration:
    """E2B LangGraph 工作流集成"""
    
    def __init__(self):
        self.graph = Graph()
        self._build_graph()
    
    def _build_graph(self):
        """构建工作流图"""
        
        # 定义节点
        @Node
        async def analyze_request(state: GraphState) -> GraphState:
            """分析用户请求"""
            last_message = state["messages"][-1]
            
            # 使用 LLM 分析请求类型
            analysis = {
                "type": "data_analysis",  # 或 visualization, ml_model, etc.
                "requirements": ["pandas", "matplotlib"],
                "complexity": "medium"
            }
            
            state["current_context"] = analysis
            return state
        
        @Node
        async def setup_environment(state: GraphState) -> GraphState:
            """设置执行环境"""
            if not state.get("sandbox"):
                state["sandbox"] = await Sandbox.create()
            
            # 根据需求安装库
            requirements = state["current_context"].get("requirements", [])
            setup_code = f"""
import sys
import subprocess

# 安装所需库
libs = {requirements}
for lib in libs:
    try:
        __import__(lib)
        print(f"{{lib}} 已安装")
    except ImportError:
        print(f"正在安装 {{lib}}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", lib])

print("环境设置完成！")
"""
            
            result = await state["sandbox"].run_code(setup_code)
            state["results"].append({"type": "setup", "output": result.logs.stdout})
            return state
        
        @Node
        async def generate_code(state: GraphState) -> GraphState:
            """生成代码"""
            # 使用 LLM 生成代码
            task_type = state["current_context"]["type"]
            
            if task_type == "data_analysis":
                code = """
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 生成示例数据
np.random.seed(42)
data = pd.DataFrame({
    'date': pd.date_range('2023-01-01', periods=100),
    'value': np.cumsum(np.random.randn(100)) + 100,
    'category': np.random.choice(['A', 'B', 'C'], 100)
})

# 基本统计
print("数据统计信息:")
print(data.describe())

# 按类别分组分析
grouped = data.groupby('category')['value'].agg(['mean', 'std', 'count'])
print("\\n按类别分组:")
print(grouped)

# 创建可视化
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))

# 时间序列图
data.set_index('date')['value'].plot(ax=ax1, title='Value Over Time')
ax1.set_xlabel('Date')
ax1.set_ylabel('Value')

# 类别分布
data['category'].value_counts().plot(kind='bar', ax=ax2, title='Category Distribution')
ax2.set_xlabel('Category')
ax2.set_ylabel('Count')

plt.tight_layout()
plt.savefig('/tmp/analysis_results.png', dpi=300, bbox_inches='tight')
print("\\n分析完成！图表已保存。")
"""
            
            state["code_history"].append(code)
            return state
        
        @Node
        async def execute_code(state: GraphState) -> GraphState:
            """执行代码"""
            code = state["code_history"][-1]
            result = await state["sandbox"].run_code(code)
            
            execution_result = {
                "type": "execution",
                "stdout": result.logs.stdout,
                "stderr": result.logs.stderr,
                "error": result.error,
                "artifacts": []
            }
            
            # 处理生成的文件
            if result.artifacts:
                for artifact in result.artifacts:
                    if artifact.type == "image":
                        # 下载图片
                        content = await state["sandbox"].download_file(artifact.path)
                        execution_result["artifacts"].append({
                            "name": artifact.name,
                            "type": "image",
                            "size": len(content)
                        })
            
            state["results"].append(execution_result)
            return state
        
        @Node
        async def review_results(state: GraphState) -> GraphState:
            """审查和优化结果"""
            last_result = state["results"][-1]
            
            if last_result.get("error"):
                # 如果有错误，生成修复代码
                fix_code = f"""
# 错误修复尝试
try:
    {state["code_history"][-1]}
except Exception as e:
    print(f"错误: {{e}}")
    print("尝试替代方案...")
    # 这里添加替代逻辑
"""
                state["code_history"].append(fix_code)
                # 返回执行节点重试
                return state
            
            # 生成总结
            summary_code = """
print("\\n=== 执行总结 ===")
print(f"成功执行了 {len(state['code_history'])} 段代码")
print(f"生成了 {len(state['results'][-1].get('artifacts', []))} 个文件")
print("任务完成！")
"""
            
            result = await state["sandbox"].run_code(summary_code)
            state["results"].append({"type": "summary", "output": result.logs.stdout})
            
            return state
        
        # 添加节点到图
        self.graph.add_node("analyze", analyze_request)
        self.graph.add_node("setup", setup_environment)
        self.graph.add_node("generate", generate_code)
        self.graph.add_node("execute", execute_code)
        self.graph.add_node("review", review_results)
        
        # 定义边（工作流）
        self.graph.add_edge("analyze", "setup")
        self.graph.add_edge("setup", "generate")
        self.graph.add_edge("generate", "execute")
        self.graph.add_edge("execute", "review")
        
        # 条件边 - 如果有错误则重试
        def should_retry(state: GraphState) -> str:
            last_result = state["results"][-1]
            if last_result.get("error") and len(state["code_history"]) < 3:
                return "generate"
            return "END"
        
        self.graph.add_conditional_edges("review", should_retry)
        
        # 设置入口点
        self.graph.set_entry_point("analyze")
    
    async def run(self, message: str) -> GraphState:
        """运行工作流"""
        initial_state: GraphState = {
            "messages": [message],
            "code_history": [],
            "results": [],
            "current_context": {},
            "sandbox": None
        }
        
        # 编译并运行图
        app = self.graph.compile()
        final_state = await app.ainvoke(initial_state)
        
        # 清理资源
        if final_state.get("sandbox"):
            await final_state["sandbox"].kill()
        
        return final_state

# 使用示例
async def langgraph_demo():
    workflow = E2BLangGraphIntegration()
    
    result = await workflow.run(
        "分析销售数据，创建趋势图表，并生成月度报告"
    )
    
    print("工作流执行完成！")
    print(f"执行了 {len(result['code_history'])} 段代码")
    print(f"生成了 {len(result['results'])} 个结果")

# 运行示例
asyncio.run(langgraph_demo())
```

### 高级 LangGraph 工作流

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain.schema import BaseMessage, HumanMessage, AIMessage
import uuid

class AdvancedE2BWorkflow:
    """高级 E2B LangGraph 工作流，支持多代理协作"""
    
    def __init__(self):
        self.memory = MemorySaver()
        self.workflow = self._create_workflow()
        
    def _create_workflow(self) -> StateGraph:
        """创建复杂工作流"""
        
        workflow = StateGraph(GraphState)
        
        # 数据收集代理
        async def data_collector_agent(state: GraphState) -> GraphState:
            """收集和预处理数据"""
            code = """
# 数据收集代理
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# 模拟从多个数据源收集数据
print("开始数据收集...")

# 数据源 1: 销售数据
sales_data = pd.DataFrame({
    'date': pd.date_range(start='2023-01-01', periods=365),
    'sales': np.random.exponential(1000, 365) * (1 + np.sin(np.arange(365) * 2 * np.pi / 365) * 0.3),
    'region': np.random.choice(['North', 'South', 'East', 'West'], 365)
})

# 数据源 2: 客户数据
customer_data = pd.DataFrame({
    'customer_id': range(1000),
    'join_date': pd.date_range(start='2020-01-01', periods=1000),
    'lifetime_value': np.random.lognormal(6, 1.5, 1000),
    'segment': np.random.choice(['Premium', 'Standard', 'Basic'], 1000, p=[0.2, 0.5, 0.3])
})

# 数据源 3: 产品数据
product_data = pd.DataFrame({
    'product_id': range(50),
    'category': np.random.choice(['Electronics', 'Clothing', 'Food', 'Books'], 50),
    'price': np.random.uniform(10, 1000, 50),
    'stock': np.random.randint(0, 1000, 50)
})

# 保存数据
sales_data.to_csv('/tmp/sales_data.csv', index=False)
customer_data.to_csv('/tmp/customer_data.csv', index=False)
product_data.to_csv('/tmp/product_data.csv', index=False)

print(f"收集了 {len(sales_data)} 条销售记录")
print(f"收集了 {len(customer_data)} 个客户信息")
print(f"收集了 {len(product_data)} 个产品信息")

# 数据质量检查
print("\\n数据质量报告:")
print(f"销售数据缺失值: {sales_data.isnull().sum().sum()}")
print(f"客户数据缺失值: {customer_data.isnull().sum().sum()}")
print(f"产品数据缺失值: {product_data.isnull().sum().sum()}")
"""
            
            if not state.get("sandbox"):
                state["sandbox"] = await Sandbox.create()
                
            result = await state["sandbox"].run_code(code)
            state["results"].append({
                "agent": "data_collector",
                "output": result.logs.stdout,
                "timestamp": datetime.now().isoformat()
            })
            
            return state
        
        # 分析代理
        async def analyst_agent(state: GraphState) -> GraphState:
            """执行数据分析"""
            code = """
# 数据分析代理
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

print("开始数据分析...")

# 加载数据
sales_data = pd.read_csv('/tmp/sales_data.csv')
customer_data = pd.read_csv('/tmp/customer_data.csv')
product_data = pd.read_csv('/tmp/product_data.csv')

# 转换日期列
sales_data['date'] = pd.to_datetime(sales_data['date'])
customer_data['join_date'] = pd.to_datetime(customer_data['join_date'])

# 1. 销售趋势分析
sales_monthly = sales_data.groupby(pd.Grouper(key='date', freq='M'))['sales'].agg(['sum', 'mean', 'std'])
print("\\n月度销售统计:")
print(sales_monthly.tail())

# 2. 区域性能分析
region_performance = sales_data.groupby('region')['sales'].agg(['sum', 'mean', 'count'])
region_performance['conversion_rate'] = region_performance['sum'] / region_performance['count']
print("\\n区域性能:")
print(region_performance)

# 3. 客户细分分析
customer_segments = customer_data.groupby('segment')['lifetime_value'].agg(['mean', 'median', 'std', 'count'])
print("\\n客户细分:")
print(customer_segments)

# 4. 产品分析
product_analysis = product_data.groupby('category').agg({
    'price': ['mean', 'min', 'max'],
    'stock': ['sum', 'mean']
})
print("\\n产品类别分析:")
print(product_analysis)

# 5. 相关性分析
# 创建综合数据集进行相关性分析
sales_daily = sales_data.groupby('date')['sales'].sum().reset_index()
sales_daily['day_of_week'] = pd.to_datetime(sales_daily['date']).dt.dayofweek
sales_daily['month'] = pd.to_datetime(sales_daily['date']).dt.month

correlation_matrix = sales_daily[['sales', 'day_of_week', 'month']].corr()
print("\\n相关性矩阵:")
print(correlation_matrix)

# 创建分析报告
analysis_report = {
    'total_revenue': sales_data['sales'].sum(),
    'avg_daily_sales': sales_data['sales'].mean(),
    'best_region': region_performance['sum'].idxmax(),
    'best_segment': customer_segments['mean'].idxmax(),
    'total_customers': len(customer_data),
    'product_categories': len(product_data['category'].unique())
}

# 保存分析结果
import json
with open('/tmp/analysis_report.json', 'w') as f:
    json.dump(analysis_report, f, indent=2)

print("\\n分析报告已生成！")
print(f"总收入: ${analysis_report['total_revenue']:,.2f}")
print(f"最佳区域: {analysis_report['best_region']}")
print(f"最佳客户群: {analysis_report['best_segment']}")
"""
            
            result = await state["sandbox"].run_code(code)
            state["results"].append({
                "agent": "analyst",
                "output": result.logs.stdout,
                "timestamp": datetime.now().isoformat()
            })
            
            return state
        
        # 可视化代理
        async def visualization_agent(state: GraphState) -> GraphState:
            """创建数据可视化"""
            code = """
# 可视化代理
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json
from matplotlib.gridspec import GridSpec

print("创建可视化...")

# 加载数据
sales_data = pd.read_csv('/tmp/sales_data.csv')
customer_data = pd.read_csv('/tmp/customer_data.csv')
product_data = pd.read_csv('/tmp/product_data.csv')

with open('/tmp/analysis_report.json', 'r') as f:
    report = json.load(f)

# 设置样式
plt.style.use('seaborn-v0_8-darkgrid')
colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

# 创建综合仪表板
fig = plt.figure(figsize=(20, 12))
gs = GridSpec(3, 3, figure=fig, hspace=0.3, wspace=0.3)

# 1. 销售趋势图
ax1 = fig.add_subplot(gs[0, :2])
sales_data['date'] = pd.to_datetime(sales_data['date'])
sales_monthly = sales_data.groupby(pd.Grouper(key='date', freq='M'))['sales'].sum()
ax1.plot(sales_monthly.index, sales_monthly.values, linewidth=2, color=colors[0])
ax1.fill_between(sales_monthly.index, sales_monthly.values, alpha=0.3, color=colors[0])
ax1.set_title('月度销售趋势', fontsize=16, fontweight='bold')
ax1.set_xlabel('日期')
ax1.set_ylabel('销售额 ($)')
ax1.tick_params(axis='x', rotation=45)

# 2. 区域销售分布
ax2 = fig.add_subplot(gs[0, 2])
region_sales = sales_data.groupby('region')['sales'].sum()
ax2.pie(region_sales.values, labels=region_sales.index, autopct='%1.1f%%', 
        colors=colors[:len(region_sales)], startangle=90)
ax2.set_title('区域销售分布', fontsize=16, fontweight='bold')

# 3. 客户细分分析
ax3 = fig.add_subplot(gs[1, 0])
segment_data = customer_data.groupby('segment')['lifetime_value'].mean().sort_values()
bars = ax3.barh(segment_data.index, segment_data.values, color=colors[1])
ax3.set_xlabel('平均生命周期价值 ($)')
ax3.set_title('客户细分价值', fontsize=16, fontweight='bold')
for bar in bars:
    width = bar.get_width()
    ax3.text(width, bar.get_y() + bar.get_height()/2, 
             f'${width:,.0f}', ha='left', va='center')

# 4. 产品类别库存
ax4 = fig.add_subplot(gs[1, 1])
category_stock = product_data.groupby('category')['stock'].sum()
ax4.bar(category_stock.index, category_stock.values, color=colors[2])
ax4.set_xlabel('产品类别')
ax4.set_ylabel('总库存')
ax4.set_title('产品库存分布', fontsize=16, fontweight='bold')
ax4.tick_params(axis='x', rotation=45)

# 5. 销售热力图
ax5 = fig.add_subplot(gs[1, 2])
sales_data['month'] = pd.to_datetime(sales_data['date']).dt.month
sales_data['day'] = pd.to_datetime(sales_data['date']).dt.day
sales_pivot = sales_data.pivot_table(values='sales', index='day', columns='month', aggfunc='mean')
sns.heatmap(sales_pivot, cmap='YlOrRd', ax=ax5, cbar_kws={'label': '平均销售额'})
ax5.set_title('销售热力图 (日/月)', fontsize=16, fontweight='bold')

# 6. 关键指标卡片
ax6 = fig.add_subplot(gs[2, :])
ax6.axis('off')

# 创建指标文本
metrics_text = f"""
📊 关键业务指标

💰 总收入: ${report['total_revenue']:,.2f}
📈 日均销售: ${report['avg_daily_sales']:,.2f}
🏆 最佳区域: {report['best_region']}
👥 总客户数: {report['total_customers']:,}
🎯 最佳客户群: {report['best_segment']}
📦 产品类别: {report['product_categories']}
"""

ax6.text(0.5, 0.5, metrics_text, fontsize=18, ha='center', va='center',
         bbox=dict(boxstyle='round,pad=1', facecolor='lightgray', alpha=0.8))

plt.suptitle('业务分析仪表板', fontsize=24, fontweight='bold', y=0.98)
plt.savefig('/tmp/business_dashboard.png', dpi=300, bbox_inches='tight')
print("仪表板已创建！")

# 创建单独的趋势预测图
fig2, ax = plt.subplots(figsize=(12, 6))
from sklearn.linear_model import LinearRegression

# 准备数据
sales_data['date_numeric'] = (sales_data['date'] - sales_data['date'].min()).dt.days
X = sales_data[['date_numeric']]
y = sales_data['sales']

# 训练模型
model = LinearRegression()
model.fit(X, y)

# 预测未来 30 天
future_days = pd.DataFrame({
    'date_numeric': range(sales_data['date_numeric'].max() + 1, 
                          sales_data['date_numeric'].max() + 31)
})
predictions = model.predict(future_days)

# 绘图
ax.scatter(sales_data['date'], sales_data['sales'], alpha=0.5, label='历史数据')
ax.plot(sales_data['date'], model.predict(X), color='red', linewidth=2, label='趋势线')

future_dates = pd.date_range(sales_data['date'].max() + timedelta(days=1), periods=30)
ax.plot(future_dates, predictions, color='green', linewidth=2, linestyle='--', label='预测')
ax.fill_between(future_dates, predictions * 0.9, predictions * 1.1, alpha=0.3, color='green')

ax.set_title('销售趋势与预测', fontsize=16, fontweight='bold')
ax.set_xlabel('日期')
ax.set_ylabel('销售额 ($)')
ax.legend()
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('/tmp/sales_forecast.png', dpi=300)

print("预测图表已创建！")
print(f"预测下月销售额: ${predictions.sum():,.2f}")
"""
            
            result = await state["sandbox"].run_code(code)
            state["results"].append({
                "agent": "visualization",
                "output": result.logs.stdout,
                "timestamp": datetime.now().isoformat()
            })
            
            return state
        
        # 报告生成代理
        async def report_agent(state: GraphState) -> GraphState:
            """生成最终报告"""
            code = """
# 报告生成代理
import json
from datetime import datetime
import pandas as pd

print("生成最终报告...")

# 加载分析结果
with open('/tmp/analysis_report.json', 'r') as f:
    analysis = json.load(f)

# 创建 Markdown 报告
report = f\"\"\"
# 业务分析报告

**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 执行摘要

本报告基于最新的销售、客户和产品数据，提供全面的业务洞察和建议。

### 关键发现

1. **总收入**: ${analysis['total_revenue']:,.2f}
2. **日均销售额**: ${analysis['avg_daily_sales']:,.2f}
3. **表现最佳区域**: {analysis['best_region']}
4. **最有价值客户群**: {analysis['best_segment']}
5. **活跃客户总数**: {analysis['total_customers']:,}

## 详细分析

### 销售表现
- 销售数据显示稳定增长趋势
- 季节性波动明显，需要针对性营销策略
- 区域差异显著，建议加强弱势区域推广

### 客户洞察
- Premium 客户群体虽然数量少但价值高
- 需要制定客户保留策略以提高生命周期价值
- 考虑推出忠诚度计划

### 产品策略
- 库存分布不均，需要优化供应链
- 某些类别产品需求旺盛，建议增加库存
- 价格策略可以进一步优化

## 建议行动

1. **短期（1-3个月）**
   - 在表现最佳的区域增加营销投入
   - 为 Premium 客户推出专属服务
   - 优化库存管理系统

2. **中期（3-6个月）**
   - 开发新的客户细分策略
   - 实施动态定价系统
   - 扩展到新的地理区域

3. **长期（6-12个月）**
   - 建立预测分析系统
   - 开发客户终身价值模型
   - 实施全渠道营销策略

## 附件
- [业务仪表板](/tmp/business_dashboard.png)
- [销售预测图表](/tmp/sales_forecast.png)
- [原始数据文件](/tmp/)

---
*本报告由 E2B AI 分析系统自动生成*
\"\"\"

# 保存报告
with open('/tmp/final_report.md', 'w', encoding='utf-8') as f:
    f.write(report)

print("报告生成完成！")
print(f"报告已保存至: /tmp/final_report.md")

# 生成执行总结
summary = {
    "workflow_complete": True,
    "agents_executed": 4,
    "files_generated": [
        "sales_data.csv",
        "customer_data.csv", 
        "product_data.csv",
        "analysis_report.json",
        "business_dashboard.png",
        "sales_forecast.png",
        "final_report.md"
    ],
    "execution_time": "约 2 分钟",
    "status": "SUCCESS"
}

with open('/tmp/workflow_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print("\\n工作流执行总结:")
print(json.dumps(summary, indent=2))
"""
            
            result = await state["sandbox"].run_code(code)
            state["results"].append({
                "agent": "report_generator",
                "output": result.logs.stdout,
                "timestamp": datetime.now().isoformat()
            })
            
            # 下载生成的文件
            files_to_download = [
                '/tmp/business_dashboard.png',
                '/tmp/sales_forecast.png',
                '/tmp/final_report.md'
            ]
            
            for file_path in files_to_download:
                try:
                    content = await state["sandbox"].download_file(file_path)
                    # 保存到本地
                    local_path = file_path.split('/')[-1]
                    with open(local_path, 'wb') as f:
                        f.write(content if isinstance(content, bytes) else content.encode())
                    print(f"已下载: {local_path}")
                except Exception as e:
                    print(f"下载失败 {file_path}: {e}")
            
            return state
        
        # 构建工作流
        workflow.add_node("collect_data", data_collector_agent)
        workflow.add_node("analyze", analyst_agent)
        workflow.add_node("visualize", visualization_agent)
        workflow.add_node("report", report_agent)
        
        # 定义工作流
        workflow.add_edge("collect_data", "analyze")
        workflow.add_edge("analyze", "visualize")
        workflow.add_edge("visualize", "report")
        workflow.add_edge("report", END)
        
        workflow.set_entry_point("collect_data")
        
        return workflow
    
    async def execute(self, task: str, thread_id: str = None) -> dict:
        """执行工作流"""
        if not thread_id:
            thread_id = str(uuid.uuid4())
        
        initial_state = GraphState(
            messages=[task],
            code_history=[],
            results=[],
            current_context={"task": task},
            sandbox=None
        )
        
        # 编译工作流
        app = self.workflow.compile(checkpointer=self.memory)
        
        # 执行工作流
        config = {"configurable": {"thread_id": thread_id}}
        
        try:
            final_state = await app.ainvoke(initial_state, config)
            
            # 清理资源
            if final_state.get("sandbox"):
                await final_state["sandbox"].kill()
            
            return {
                "success": True,
                "thread_id": thread_id,
                "results": final_state["results"],
                "files_generated": len([r for r in final_state["results"] if "agent" in r])
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "thread_id": thread_id
            }

# 使用示例
async def advanced_langgraph_demo():
    workflow = AdvancedE2BWorkflow()
    
    result = await workflow.execute(
        "执行完整的业务分析流程：收集数据、分析趋势、创建可视化、生成报告"
    )
    
    if result["success"]:
        print(f"工作流成功完成！")
        print(f"线程 ID: {result['thread_id']}")
        print(f"执行了 {result['files_generated']} 个代理")
    else:
        print(f"工作流失败: {result['error']}")

# 运行示例
asyncio.run(advanced_langgraph_demo())
```

## Autogen 多代理集成

### 概述

Autogen 是微软开发的多代理框架，E2B 可以为 Autogen 代理提供安全的代码执行环境。

### 基础 Autogen 集成

```python
import autogen
from e2b_code_interpreter import Sandbox
from typing import Dict, Any, List
import asyncio

class E2BCodeExecutor:
    """E2B 代码执行器 for Autogen"""
    
    def __init__(self):
        self.sandbox = Sandbox()
        
    def execute_code(self, code: str) -> Dict[str, Any]:
        """执行代码并返回结果"""
        result = self.sandbox.run_code(code)
        return {
            "exit_code": 0 if not result.error else 1,
            "output": result.logs.stdout,
            "error": result.logs.stderr or result.error
        }
    
    def cleanup(self):
        """清理资源"""
        self.sandbox.kill()

# 配置 Autogen
config_list = [{
    "model": "gpt-4",
    "api_key": "your_openai_api_key"
}]

# 创建 E2B 执行器
executor = E2BCodeExecutor()

# 创建助手代理
assistant = autogen.AssistantAgent(
    name="coding_assistant",
    llm_config={
        "config_list": config_list,
        "temperature": 0,
        "functions": [
            {
                "name": "execute_python_code",
                "description": "Execute Python code in a secure sandbox",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Python code to execute"
                        }
                    },
                    "required": ["code"]
                }
            }
        ]
    },
    system_message="""You are a helpful AI assistant that can write and execute Python code.
    When asked to perform tasks, write Python code and use the execute_python_code function to run it.
    Always include proper error handling and comments in your code."""
)

# 创建用户代理
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=10,
    code_execution_config=False,  # 禁用本地执行
    function_map={
        "execute_python_code": executor.execute_code
    }
)

# 使用示例
user_proxy.initiate_chat(
    assistant,
    message="""
    创建一个机器学习模型来预测房价：
    1. 生成合成数据集（1000个样本）
    2. 进行特征工程
    3. 训练多个模型并比较
    4. 创建性能可视化
    """
)

# 清理
executor.cleanup()
```

### 高级 Autogen 多代理系统

```python
import autogen
from autogen.agentchat.contrib.capabilities.teachability import Teachability
from e2b_code_interpreter import Sandbox
import json
from typing import Optional

class E2BMultiAgentSystem:
    """E2B 支持的 Autogen 多代理系统"""
    
    def __init__(self):
        self.sandboxes = {}  # 每个代理一个沙箱
        self.shared_data = {}  # 代理间共享数据
        self._setup_agents()
    
    def _create_sandbox_for_agent(self, agent_name: str) -> Sandbox:
        """为代理创建独立沙箱"""
        sandbox = Sandbox()
        self.sandboxes[agent_name] = sandbox
        return sandbox
    
    def _setup_agents(self):
        """设置多代理系统"""
        
        # LLM 配置
        llm_config = {
            "config_list": [{
                "model": "gpt-4",
                "api_key": "your_api_key"
            }],
            "temperature": 0
        }
        
        # 1. 数据工程师代理
        self.data_engineer = autogen.AssistantAgent(
            name="data_engineer",
            llm_config=llm_config,
            system_message="""You are a data engineer specialized in:
            - Data collection and cleaning
            - ETL pipelines
            - Database operations
            - Data validation
            
            Always use the sandbox to execute code."""
        )
        
        # 2. 机器学习工程师代理
        self.ml_engineer = autogen.AssistantAgent(
            name="ml_engineer",
            llm_config=llm_config,
            system_message="""You are a machine learning engineer specialized in:
            - Model development and training
            - Feature engineering
            - Model evaluation and optimization
            - Deployment strategies
            
            Always use the sandbox to execute code."""
        )
        
        # 3. 数据科学家代理
        self.data_scientist = autogen.AssistantAgent(
            name="data_scientist",
            llm_config=llm_config,
            system_message="""You are a data scientist specialized in:
            - Statistical analysis
            - Data visualization
            - Insights generation
            - A/B testing
            
            Always use the sandbox to execute code."""
        )
        
        # 4. 项目经理代理
        self.project_manager = autogen.AssistantAgent(
            name="project_manager",
            llm_config=llm_config,
            system_message="""You are a project manager who:
            - Coordinates between team members
            - Tracks progress
            - Ensures deliverables meet requirements
            - Manages timelines
            
            You don't write code but guide the team."""
        )
        
        # 创建用户代理
        self.user_proxy = autogen.UserProxyAgent(
            name="user_proxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=20,
            code_execution_config=False,
            function_map=self._create_function_map()
        )
        
        # 添加可学习能力
        teachability = Teachability(
            verbosity=0,
            reset_db=False,
            path_to_db_dir="./tmp/autogen_teachability_db"
        )
        teachability.add_to_agent(self.data_scientist)
        
    def _create_function_map(self) -> dict:
        """创建函数映射"""
        
        def execute_in_sandbox(agent_name: str, code: str) -> dict:
            """在特定代理的沙箱中执行代码"""
            if agent_name not in self.sandboxes:
                self._create_sandbox_for_agent(agent_name)
            
            sandbox = self.sandboxes[agent_name]
            result = sandbox.run_code(code)
            
            return {
                "success": not bool(result.error),
                "output": result.logs.stdout,
                "error": result.error,
                "artifacts": [a.name for a in result.artifacts] if result.artifacts else []
            }
        
        def share_data(key: str, value: Any, from_agent: str) -> dict:
            """在代理间共享数据"""
            self.shared_data[key] = {
                "value": value,
                "from": from_agent,
                "timestamp": datetime.now().isoformat()
            }
            return {"success": True, "message": f"Data '{key}' shared successfully"}
        
        def get_shared_data(key: str) -> dict:
            """获取共享数据"""
            if key in self.shared_data:
                return {
                    "success": True,
                    "data": self.shared_data[key]
                }
            return {"success": False, "message": f"No data found for key '{key}'"}
        
        return {
            "execute_in_sandbox": execute_in_sandbox,
            "share_data": share_data,
            "get_shared_data": get_shared_data
        }
    
    async def run_project(self, project_description: str):
        """运行完整项目"""
        
        # 创建群聊
        groupchat = autogen.GroupChat(
            agents=[
                self.user_proxy,
                self.project_manager,
                self.data_engineer,
                self.ml_engineer,
                self.data_scientist
            ],
            messages=[],
            max_round=30
        )
        
        # 创建群聊管理器
        manager = autogen.GroupChatManager(
            groupchat=groupchat,
            llm_config={
                "config_list": [{
                    "model": "gpt-4",
                    "api_key": "your_api_key"
                }]
            }
        )
        
        # 启动项目
        await self.user_proxy.a_initiate_chat(
            manager,
            message=f"""
            Project: {project_description}
            
            Project Manager, please coordinate the team to complete this project.
            Break it down into tasks and assign to appropriate team members.
            """
        )
        
        # 生成项目报告
        self._generate_project_report()
        
    def _generate_project_report(self):
        """生成项目报告"""
        report = {
            "project_summary": {
                "agents_involved": list(self.sandboxes.keys()),
                "data_shared": len(self.shared_data),
                "sandboxes_created": len(self.sandboxes)
            },
            "shared_data": self.shared_data,
            "execution_logs": []
        }
        
        # 收集执行日志
        for agent_name, sandbox in self.sandboxes.items():
            # 获取沙箱中的文件列表
            files_code = """
import os
import json

files = []
for root, dirs, filenames in os.walk('/tmp'):
    for filename in filenames:
        files.append(os.path.join(root, filename))

print(json.dumps(files))
"""
            result = sandbox.run_code(files_code)
            if result.logs.stdout:
                try:
                    files = json.loads(result.logs.stdout)
                    report["execution_logs"].append({
                        "agent": agent_name,
                        "files_created": files
                    })
                except:
                    pass
        
        # 保存报告
        with open("project_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print("项目报告已生成: project_report.json")
    
    def cleanup(self):
        """清理所有资源"""
        for sandbox in self.sandboxes.values():
            sandbox.kill()

# 使用示例
async def autogen_demo():
    system = E2BMultiAgentSystem()
    
    await system.run_project("""
    开发一个客户流失预测系统：
    1. 生成模拟的客户数据（包括行为、交易、人口统计信息）
    2. 进行探索性数据分析
    3. 构建多个预测模型
    4. 评估模型性能
    5. 创建可视化报告
    6. 提供业务建议
    """)
    
    system.cleanup()

# 运行示例
asyncio.run(autogen_demo())
```

## Vercel AI SDK 集成

### 概述

Vercel AI SDK 提供了构建 AI 应用的工具，E2B 可以作为后端执行引擎。

### Next.js + AI SDK + E2B 集成

```typescript
// app/api/execute/route.ts
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Sandbox } from '@e2b/code-interpreter'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function POST(req: Request) {
  const { messages, code } = await req.json()
  
  // 创建 E2B 沙箱
  const sandbox = await Sandbox.create()
  
  try {
    // 如果有代码，先执行
    let codeResult = null
    if (code) {
      codeResult = await sandbox.runCode(code)
    }
    
    // 准备消息，包含代码执行结果
    const enhancedMessages = [...messages]
    if (codeResult) {
      enhancedMessages.push({
        role: 'system',
        content: `Code execution result:\nOutput: ${codeResult.logs.stdout}\nError: ${codeResult.error || 'None'}`
      })
    }
    
    // 创建 OpenAI 流
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: enhancedMessages,
      stream: true,
      functions: [{
        name: 'execute_code',
        description: 'Execute Python code in sandbox',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Python code to execute'
            }
          },
          required: ['code']
        }
      }]
    })
    
    // 处理流式响应
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // 检查是否需要执行代码
        try {
          const parsed = JSON.parse(completion)
          if (parsed.function_call?.name === 'execute_code') {
            const code = JSON.parse(parsed.function_call.arguments).code
            const result = await sandbox.runCode(code)
            
            // 可以将结果存储或返回给客户端
            console.log('Code executed:', result)
          }
        } catch (e) {
          // 不是函数调用，忽略
        }
      },
      async onFinal() {
        // 清理沙箱
        await sandbox.kill()
      }
    })
    
    return new StreamingTextResponse(stream)
    
  } catch (error) {
    await sandbox.kill()
    throw error
  }
}
```

### React 组件集成

```tsx
// components/CodeInterpreter.tsx
'use client'

import { useChat } from 'ai/react'
import { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeExecution {
  code: string
  output: string
  error?: string
  timestamp: Date
}

export function CodeInterpreter() {
  const [executions, setExecutions] = useState<CodeExecution[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat-with-code',
    onResponse: async (response) => {
      // 处理代码执行响应
      const reader = response.body?.getReader()
      if (!reader) return
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = new TextDecoder().decode(value)
        // 解析并处理代码执行事件
        try {
          const data = JSON.parse(text)
          if (data.type === 'code_execution') {
            setExecutions(prev => [...prev, data.execution])
          }
        } catch (e) {
          // 常规文本响应
        }
      }
    }
  })
  
  const executeCode = useCallback(async (code: string) => {
    setIsExecuting(true)
    
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      
      const result = await response.json()
      
      setExecutions(prev => [...prev, {
        code,
        output: result.output,
        error: result.error,
        timestamp: new Date()
      }])
      
    } catch (error) {
      console.error('Execution error:', error)
    } finally {
      setIsExecuting(false)
    }
  }, [])
  
  return (
    <div className="flex h-screen">
      {/* 聊天面板 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me to write and execute code..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
      
      {/* 代码执行面板 */}
      <div className="w-1/2 border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Code Executions</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {executions.map((execution, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {execution.timestamp.toLocaleTimeString()}
                </span>
                <button
                  onClick={() => executeCode(execution.code)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Re-run
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Code:</div>
                <SyntaxHighlighter
                  language="python"
                  style={vscDarkPlus}
                  className="text-sm"
                >
                  {execution.code}
                </SyntaxHighlighter>
              </div>
              
              {execution.output && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Output:</div>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                    {execution.output}
                  </pre>
                </div>
              )}
              
              {execution.error && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-red-500">Error:</div>
                  <pre className="bg-red-50 p-2 rounded text-sm text-red-700 overflow-x-auto">
                    {execution.error}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 流式执行和实时反馈

```typescript
// app/api/stream-execute/route.ts
import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: Request) {
  const { code, sessionId } = await req.json()
  
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // 异步执行
  ;(async () => {
    const sandbox = await Sandbox.create()
    
    try {
      // 发送开始事件
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          sessionId
        })}\n\n`)
      )
      
      // 分段执行代码
      const codeBlocks = code.split('\n\n')
      
      for (let i = 0; i < codeBlocks.length; i++) {
        const block = codeBlocks[i]
        
        // 发送进度
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            current: i + 1,
            total: codeBlocks.length
          })}\n\n`)
        )
        
        // 执行代码块
        const result = await sandbox.runCode(block)
        
        // 发送结果
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'result',
            blockIndex: i,
            output: result.logs.stdout,
            error: result.error
          })}\n\n`)
        )
        
        // 如果有文件生成，发送文件信息
        if (result.artifacts) {
          for (const artifact of result.artifacts) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({
                type: 'artifact',
                name: artifact.name,
                type: artifact.type,
                size: artifact.size
              })}\n\n`)
            )
          }
        }
      }
      
      // 发送完成事件
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({
          type: 'complete'
        })}\n\n`)
      )
      
    } catch (error) {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error.message
        })}\n\n`)
      )
    } finally {
      await sandbox.kill()
      await writer.close()
    }
  })()
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

## AgentKit 编码代理

### 概述

AgentKit 是一个专注于编码任务的代理框架，E2B 提供了完美的执行环境。

### 基础 AgentKit 集成

```typescript
import { Agent, Task, Tool } from '@agentkit/core'
import { Sandbox } from '@e2b/code-interpreter'

// 定义 E2B 工具
class E2BTool extends Tool {
  private sandbox: Sandbox | null = null
  
  async initialize() {
    this.sandbox = await Sandbox.create()
  }
  
  async execute(params: { code: string, language?: string }) {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized')
    }
    
    const result = await this.sandbox.runCode(params.code)
    
    return {
      success: !result.error,
      output: result.logs.stdout,
      error: result.error,
      artifacts: result.artifacts?.map(a => ({
        name: a.name,
        type: a.type
      }))
    }
  }
  
  async cleanup() {
    if (this.sandbox) {
      await this.sandbox.kill()
    }
  }
  
  getSchema() {
    return {
      name: 'execute_code',
      description: 'Execute code in a secure sandbox',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code to execute'
          },
          language: {
            type: 'string',
            enum: ['python', 'javascript', 'typescript'],
            default: 'python'
          }
        },
        required: ['code']
      }
    }
  }
}

// 创建编码代理
class CodingAgent extends Agent {
  private e2bTool: E2BTool
  
  constructor() {
    super({
      name: 'CodingAgent',
      description: 'An agent specialized in writing and executing code',
      model: 'gpt-4'
    })
    
    this.e2bTool = new E2BTool()
    this.registerTool(this.e2bTool)
  }
  
  async initialize() {
    await this.e2bTool.initialize()
  }
  
  async processTask(task: Task): Promise<any> {
    // 分析任务
    const analysis = await this.analyzeTask(task)
    
    // 生成解决方案
    const solution = await this.generateSolution(analysis)
    
    // 执行和验证
    const result = await this.executeAndValidate(solution)
    
    return result
  }
  
  private async analyzeTask(task: Task) {
    const prompt = `
    Analyze this coding task:
    ${task.description}
    
    Provide:
    1. Required functionality
    2. Suggested approach
    3. Potential challenges
    4. Success criteria
    `
    
    return await this.complete(prompt)
  }
  
  private async generateSolution(analysis: string) {
    const prompt = `
    Based on this analysis:
    ${analysis}
    
    Generate complete, production-ready code that:
    1. Implements all requirements
    2. Includes error handling
    3. Has proper documentation
    4. Follows best practices
    `
    
    return await this.complete(prompt)
  }
  
  private async executeAndValidate(solution: string) {
    // 提取代码
    const code = this.extractCode(solution)
    
    // 执行代码
    const result = await this.e2bTool.execute({ code })
    
    // 如果失败，尝试修复
    if (!result.success) {
      const fixedCode = await this.fixCode(code, result.error)
      return await this.e2bTool.execute({ code: fixedCode })
    }
    
    return result
  }
  
  private extractCode(text: string): string {
    const codeBlockRegex = /```(?:python|javascript|typescript)?\n([\s\S]*?)\n```/g
    const matches = [...text.matchAll(codeBlockRegex)]
    return matches.map(m => m[1]).join('\n\n')
  }
  
  private async fixCode(code: string, error: string): Promise<string> {
    const prompt = `
    This code has an error:
    
    Code:
    ${code}
    
    Error:
    ${error}
    
    Fix the code and return the corrected version.
    `
    
    const response = await this.complete(prompt)
    return this.extractCode(response)
  }
  
  async cleanup() {
    await this.e2bTool.cleanup()
  }
}

// 使用示例
async function agentKitDemo() {
  const agent = new CodingAgent()
  await agent.initialize()
  
  try {
    // 创建任务
    const task = new Task({
      description: `
        Create a web scraper that:
        1. Fetches the top stories from Hacker News
        2. Extracts title, URL, points, and comments
        3. Saves data to CSV and JSON formats
        4. Creates a summary visualization
      `,
      requirements: [
        'Use appropriate libraries',
        'Handle errors gracefully',
        'Include rate limiting',
        'Generate clean output files'
      ]
    })
    
    // 执行任务
    const result = await agent.processTask(task)
    
    console.log('Task completed!')
    console.log('Output:', result.output)
    console.log('Files generated:', result.artifacts)
    
  } finally {
    await agent.cleanup()
  }
}
```

### 高级 AgentKit 工作流

```typescript
import { Workflow, Stage, Condition } from '@agentkit/workflow'
import { CodingAgent, ReviewAgent, TestAgent } from './agents'

class DevelopmentWorkflow extends Workflow {
  constructor() {
    super({
      name: 'DevelopmentWorkflow',
      description: 'Complete software development workflow'
    })
    
    this.setupStages()
  }
  
  private setupStages() {
    // 阶段 1: 需求分析
    this.addStage(new Stage({
      name: 'requirements_analysis',
      agent: new RequirementsAgent(),
      inputs: ['user_requirements'],
      outputs: ['technical_spec']
    }))
    
    // 阶段 2: 架构设计
    this.addStage(new Stage({
      name: 'architecture_design',
      agent: new ArchitectureAgent(),
      inputs: ['technical_spec'],
      outputs: ['architecture_doc', 'component_list']
    }))
    
    // 阶段 3: 并行开发
    this.addParallelStages([
      new Stage({
        name: 'backend_development',
        agent: new BackendAgent(),
        inputs: ['architecture_doc'],
        outputs: ['backend_code']
      }),
      new Stage({
        name: 'frontend_development',
        agent: new FrontendAgent(),
        inputs: ['architecture_doc'],
        outputs: ['frontend_code']
      })
    ])
    
    // 阶段 4: 集成测试
    this.addStage(new Stage({
      name: 'integration',
      agent: new IntegrationAgent(),
      inputs: ['backend_code', 'frontend_code'],
      outputs: ['integrated_app']
    }))
    
    // 阶段 5: 测试
    this.addStage(new Stage({
      name: 'testing',
      agent: new TestAgent(),
      inputs: ['integrated_app'],
      outputs: ['test_results']
    }))
    
    // 条件分支
    this.addCondition(new Condition({
      name: 'check_tests',
      evaluate: (context) => {
        const testResults = context.get('test_results')
        return testResults.passed ? 'deploy' : 'fix_issues'
      }
    }))
    
    // 阶段 6A: 修复问题
    this.addStage(new Stage({
      name: 'fix_issues',
      agent: new DebugAgent(),
      inputs: ['test_results', 'integrated_app'],
      outputs: ['fixed_app'],
      nextStage: 'testing'  // 返回测试
    }))
    
    // 阶段 6B: 部署
    this.addStage(new Stage({
      name: 'deploy',
      agent: new DeploymentAgent(),
      inputs: ['integrated_app'],
      outputs: ['deployment_url', 'deployment_report']
    }))
  }
  
  async execute(requirements: string) {
    const context = new WorkflowContext()
    context.set('user_requirements', requirements)
    
    return await this.run(context)
  }
}

// 专门的 E2B 增强代理
class E2BEnhancedAgent extends Agent {
  private sandboxPool: SandboxPool
  
  constructor(config: AgentConfig) {
    super(config)
    this.sandboxPool = new SandboxPool(3)  // 3 个并发沙箱
  }
  
  async initialize() {
    await this.sandboxPool.initialize()
  }
  
  async executeWithDependencies(code: string, dependencies: string[]) {
    const sandbox = await this.sandboxPool.acquire()
    
    try {
      // 安装依赖
      if (dependencies.length > 0) {
        const installCmd = `pip install ${dependencies.join(' ')}`
        await sandbox.runCode(`
import subprocess
subprocess.run("${installCmd}".split(), check=True)
print("Dependencies installed successfully")
`)
      }
      
      // 执行主代码
      const result = await sandbox.runCode(code)
      
      // 收集输出文件
      const artifacts = []
      if (result.artifacts) {
        for (const artifact of result.artifacts) {
          const content = await sandbox.downloadFile(artifact.path)
          artifacts.push({
            name: artifact.name,
            content: content,
            type: artifact.type
          })
        }
      }
      
      return {
        success: !result.error,
        output: result.logs.stdout,
        error: result.error,
        artifacts
      }
      
    } finally {
      await this.sandboxPool.release(sandbox)
    }
  }
  
  async runTests(code: string, testCode: string) {
    const sandbox = await this.sandboxPool.acquire()
    
    try {
      // 保存主代码
      await sandbox.writeFile('/tmp/main.py', code)
      
      // 保存测试代码
      await sandbox.writeFile('/tmp/test_main.py', testCode)
      
      // 运行测试
      const testResult = await sandbox.runCode(`
import subprocess
import json

# 运行 pytest
result = subprocess.run(
    ['pytest', '/tmp/test_main.py', '-v', '--json-report', '--json-report-file=/tmp/test_report.json'],
    capture_output=True,
    text=True
)

# 读取测试报告
with open('/tmp/test_report.json', 'r') as f:
    report = json.load(f)

print(f"Tests passed: {report['summary']['passed']}")
print(f"Tests failed: {report['summary']['failed']}")
print(f"Total tests: {report['summary']['total']}")

# 返回测试是否全部通过
success = report['summary']['failed'] == 0
`)
      
      const report = await sandbox.downloadFile('/tmp/test_report.json')
      
      return {
        success: testResult.logs.stdout.includes('success = True'),
        report: JSON.parse(report),
        output: testResult.logs.stdout
      }
      
    } finally {
      await this.sandboxPool.release(sandbox)
    }
  }
}

// 使用示例
async function advancedAgentKitDemo() {
  const workflow = new DevelopmentWorkflow()
  
  const result = await workflow.execute(`
    Build a real-time dashboard application that:
    1. Monitors system metrics (CPU, memory, disk)
    2. Displays data in interactive charts
    3. Sends alerts when thresholds are exceeded
    4. Has both web interface and API
    5. Includes user authentication
  `)
  
  console.log('Workflow completed!')
  console.log('Deployment URL:', result.deployment_url)
  console.log('Full report:', result.deployment_report)
}
```

## 框架对比与选择

### 对比表

| 特性 | LangChain | LangGraph | Autogen | Vercel AI SDK | AgentKit |
|------|-----------|-----------|---------|---------------|----------|
| **主要用途** | LLM 应用开发 | 工作流编排 | 多代理协作 | Web AI 应用 | 编码任务 |
| **复杂度** | 中等 | 高 | 高 | 低 | 中等 |
| **学习曲线** | 平缓 | 陡峭 | 中等 | 平缓 | 中等 |
| **E2B 集成** | 工具方式 | 节点方式 | 执行器方式 | API 方式 | 原生支持 |
| **最适合** | 通用 AI 应用 | 复杂工作流 | 团队协作模拟 | Web 应用 | 代码生成 |
| **性能** | 良好 | 良好 | 中等 | 优秀 | 良好 |
| **社区支持** | 优秀 | 良好 | 良好 | 优秀 | 发展中 |

### 选择建议

1. **选择 LangChain**：
   - 需要快速原型开发
   - 构建通用 AI 应用
   - 需要丰富的工具生态

2. **选择 LangGraph**：
   - 需要复杂的状态管理
   - 构建多步骤工作流
   - 需要条件分支和循环

3. **选择 Autogen**：
   - 模拟团队协作
   - 需要多个专业代理
   - 构建自主代理系统

4. **选择 Vercel AI SDK**：
   - 构建 Web 应用
   - 需要流式响应
   - 重视用户体验

5. **选择 AgentKit**：
   - 专注代码生成
   - 需要代码质量保证
   - 构建开发工具

## 高级集成模式

### 1. 混合框架架构

```python
from langchain.agents import Tool
from langgraph.graph import Graph
import autogen
from e2b_code_interpreter import Sandbox

class HybridAISystem:
    """混合多个 AI 框架的系统"""
    
    def __init__(self):
        # LangChain 用于工具管理
        self.tools = self._create_langchain_tools()
        
        # LangGraph 用于工作流
        self.workflow = self._create_langgraph_workflow()
        
        # Autogen 用于多代理
        self.agents = self._create_autogen_agents()
        
        # E2B 作为统一执行层
        self.execution_layer = E2BExecutionLayer()
    
    async def process_request(self, request: str):
        """处理复杂请求"""
        
        # 1. 使用 LangChain 分析请求
        analysis = await self.analyze_with_langchain(request)
        
        # 2. 根据分析结果选择工作流
        if analysis['complexity'] == 'high':
            # 使用 LangGraph 处理复杂工作流
            result = await self.workflow.run(analysis)
        elif analysis['requires_collaboration']:
            # 使用 Autogen 进行多代理协作
            result = await self.run_autogen_collaboration(analysis)
        else:
            # 直接执行
            result = await self.execution_layer.execute(analysis['code'])
        
        return result
```

### 2. 统一监控和日志

```typescript
import { EventEmitter } from 'events'

class UnifiedMonitor extends EventEmitter {
  private metrics: Map<string, any> = new Map()
  
  trackExecution(framework: string, executionId: string, data: any) {
    const key = `${framework}:${executionId}`
    
    this.metrics.set(key, {
      framework,
      executionId,
      startTime: Date.now(),
      ...data
    })
    
    this.emit('execution:start', { framework, executionId, data })
  }
  
  updateExecution(framework: string, executionId: string, update: any) {
    const key = `${framework}:${executionId}`
    const existing = this.metrics.get(key)
    
    if (existing) {
      this.metrics.set(key, { ...existing, ...update })
      this.emit('execution:update', { framework, executionId, update })
    }
  }
  
  completeExecution(framework: string, executionId: string, result: any) {
    const key = `${framework}:${executionId}`
    const existing = this.metrics.get(key)
    
    if (existing) {
      const duration = Date.now() - existing.startTime
      
      this.metrics.set(key, {
        ...existing,
        endTime: Date.now(),
        duration,
        result,
        status: 'completed'
      })
      
      this.emit('execution:complete', {
        framework,
        executionId,
        duration,
        result
      })
    }
  }
  
  getMetrics() {
    return Array.from(this.metrics.values())
  }
}
```

### 3. 错误恢复和重试策略

```python
class ResilientE2BIntegration:
    """弹性 E2B 集成"""
    
    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.fallback_strategies = []
    
    def add_fallback(self, strategy):
        """添加降级策略"""
        self.fallback_strategies.append(strategy)
    
    async def execute_with_resilience(self, code: str, context: dict):
        """弹性执行"""
        
        errors = []
        
        # 主执行尝试
        for attempt in range(self.max_retries):
            try:
                sandbox = await Sandbox.create()
                result = await sandbox.run_code(code)
                
                if not result.error:
                    return result
                    
                errors.append({
                    'attempt': attempt + 1,
                    'error': result.error
                })
                
                # 尝试自动修复
                if attempt < self.max_retries - 1:
                    code = await self.auto_fix_code(code, result.error)
                    
            except Exception as e:
                errors.append({
                    'attempt': attempt + 1,
                    'error': str(e)
                })
            finally:
                if 'sandbox' in locals():
                    await sandbox.kill()
        
        # 执行降级策略
        for strategy in self.fallback_strategies:
            try:
                return await strategy(code, context, errors)
            except:
                continue
        
        raise Exception(f"All attempts failed: {errors}")
    
    async def auto_fix_code(self, code: str, error: str) -> str:
        """自动修复代码"""
        # 使用 LLM 尝试修复
        prompt = f"""
        Fix this Python code that has the following error:
        
        Code:
        {code}
        
        Error:
        {error}
        
        Return only the fixed code.
        """
        
        # 调用 LLM 获取修复
        fixed_code = await self.llm_fix(prompt)
        return fixed_code
```

## 最佳实践总结

1. **选择合适的框架**：
   - 根据项目需求选择框架
   - 可以组合使用多个框架
   - E2B 作为统一的执行层

2. **资源管理**：
   - 使用沙箱池提高性能
   - 及时清理资源
   - 实现优雅的错误处理

3. **安全考虑**：
   - 验证所有输入代码
   - 限制资源使用
   - 实现访问控制

4. **性能优化**：
   - 缓存常用结果
   - 并行执行任务
   - 使用流式响应

5. **监控和调试**：
   - 统一日志格式
   - 追踪执行链路
   - 收集性能指标

通过合理集成这些 AI 框架和 E2B，你可以构建功能强大、可扩展的 AI 应用，充分发挥各框架的优势，为用户提供卓越的体验。
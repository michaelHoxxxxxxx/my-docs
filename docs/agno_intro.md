# Agno 学习指南

## 简介

Agno 是一个轻量级库，用于构建具有记忆、知识、工具和推理能力的智能代理（Agent）。开发者可以使用 Agno 构建推理代理、多模态代理、代理团队和代理工作流。Agno 还提供了美观的 UI 界面用于与代理聊天，预构建的 FastAPI 路由用于部署代理服务，以及用于监控和评估代理性能的工具。

## 环境设置

### Windows 环境设置

1. **创建虚拟环境**:
   ```powershell
   python -m venv .venv
   ```

2. **激活虚拟环境**:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

3. **安装必要的库**:
   ```powershell
   pip install -U openai agno
   ```
   
   根据需要，可以安装更多依赖:
   ```powershell
   pip install duckduckgo-search yfinance lancedb tantivy pypdf requests exa-py newspaper4k lxml_html_clean sqlalchemy
   ```

4. **设置 API 密钥**:
   ```powershell
   $env:OPENAI_API_KEY="你的OpenAI密钥"
   $env:GOOGLE_API_KEY="你的Google密钥"  # 如果需要
   ```

### Linux/Mac 环境设置

1. **创建虚拟环境**:
   ```bash
   python3 -m venv .venv
   ```

2. **激活虚拟环境**:
   ```bash
   source .venv/bin/activate
   ```

3. **安装必要的库**:
   ```bash
   pip install -U openai agno
   ```

4. **设置 API 密钥**:
   ```bash
   export OPENAI_API_KEY=你的OpenAI密钥
   export GOOGLE_API_KEY=你的Google密钥  # 如果需要
   ```

## 学习路径

Agno 提供了一系列循序渐进的学习示例，从基础到高级，帮助您逐步掌握 Agno 的各种功能。以下是推荐的学习路径：

### 1. 入门基础 (Getting Started)

入门示例位于 `cookbook/getting_started` 目录，按照编号顺序学习：

1. **基础代理** (`01_basic_agent.py`)
   - 创建一个简单的新闻记者代理
   - 学习基本的代理配置和响应
   - 了解如何自定义代理指令和风格

2. **带工具的代理** (`02_agent_with_tools.py`)
   - 为新闻记者添加网络搜索能力
   - 学习如何集成 DuckDuckGo 搜索工具
   - 了解实时信息收集

3. **带知识库的代理** (`03_agent_with_knowledge.py`)
   - 创建一个泰国烹饪专家代理，带有食谱知识库
   - 学习如何结合本地知识与网络搜索
   - 了解向量数据库集成用于信息检索

4. **带存储的代理** (`04_agent_with_storage.py`)
   - 为泰国烹饪专家添加持久化存储
   - 学习如何保存和检索代理状态
   - 了解会话管理和历史记录

5. **代理团队** (`05_agent_team.py`)
   - 实现一个由网络代理和金融代理组成的团队
   - 学习代理协作和角色专业化
   - 了解如何结合市场研究与金融数据分析

### 2. 进阶功能

6. **结构化输出** (`06_structured_output.py`)
   - 创建一个电影剧本生成器，带有结构化输出
   - 学习如何使用 Pydantic 模型进行响应验证
   - 了解 JSON 模式和结构化输出格式

7. **自定义工具** (`07_write_your_own_tool.py`)
   - 学习如何创建自定义工具
   - 为代理添加查询 Hacker News API 的工具

8. **研究代理** (`08_research_agent_exa.py`)
   - 使用 Exa 创建 AI 研究代理
   - 学习如何引导代理的预期输出

9. **研究工作流** (`09_research_workflow.py`)
   - 创建 AI 研究工作流
   - 使用 DuckDuckGo 搜索并用 Newspaper4k 抓取网页
   - 学习如何引导代理的预期输出

### 3. 多模态功能

10. **图像代理** (`10_image_agent.py`)
    - 创建用于图像分析的代理
    - 学习如何结合图像理解与网络搜索
    - 了解如何处理和分析图像

11. **图像生成** (`11_generate_image.py`)
    - 使用 DALL-E 实现图像生成代理
    - 学习图像生成的提示工程
    - 了解如何处理生成的图像输出

12. **视频生成** (`12_generate_video.py`)
    - 使用 ModelsLabs 创建视频代理
    - 学习视频提示工程技术
    - 了解视频生成和处理

13. **音频输入/输出** (`13_audio_input_output.py`)
    - 创建用于语音交互的音频代理
    - 学习如何处理音频输入并生成响应
    - 了解音频文件处理功能

### 4. 状态和上下文管理

14. **带状态的代理** (`14_agent_state.py`)
    - 学习如何使用会话状态
    - 了解代理状态管理

15. **带上下文的代理** (`15_agent_context.py`)
    - 学习如何在 agent.run 时评估依赖项并将其注入到指令中
    - 了解如何使用上下文变量

16. **代理会话** (`16_agent_session.py`)
    - 学习如何创建带有会话记忆的代理
    - 了解如何从之前的会话恢复对话

17. **用户记忆和摘要** (`17_user_memories_and_summaries.py`)
    - 学习如何创建存储用户记忆和摘要的代理
    - 了解如何访问聊天历史和会话摘要

### 5. 高级功能

18. **重试函数调用** (`18_retry_function_call.py`)
    - 学习如何在函数调用失败或输出不满意时重试

19. **人机协作** (`19_human_in_the_loop.py`)
    - 为工具执行添加用户确认
    - 学习如何实现安全检查
    - 了解交互式代理控制

## 代理概念学习

在掌握基础示例后，可以深入学习 Agno 的核心概念，这些概念位于 `cookbook/agent_concepts` 目录：

1. **异步** (`agent_concepts/async`)
   - 学习如何创建异步代理和处理并发请求

2. **RAG（检索增强生成）** (`agent_concepts/rag`)
   - 深入了解如何使用检索增强生成技术改进代理响应

3. **知识管理** (`agent_concepts/knowledge`)
   - 学习如何为代理构建和管理知识库

4. **记忆** (`agent_concepts/memory`)
   - 了解代理的短期和长期记忆机制

5. **存储** (`storage`)
   - 学习如何使用不同的存储后端保存代理状态和数据

6. **工具** (`tools`)
   - 探索 Agno 提供的各种工具和如何创建自定义工具

7. **推理** (`reasoning`)
   - 了解代理的推理机制和如何增强代理的思考能力

8. **向量数据库** (`agent_concepts/knowledge/vector_dbs`)
   - 学习如何使用向量数据库进行高效的相似性搜索

9. **多模态代理** (`agent_concepts/multimodal`)
   - 深入了解处理文本、图像、音频和视频的多模态代理

10. **代理团队** (`teams`)
    - 学习如何构建和协调多个代理协同工作

## 实际应用示例

在 `cookbook/examples` 目录中，您可以找到各种实际应用的示例：

1. **金融分析代理** (`examples/agents/thinking_finance_agent.py`)
   - 使用实时数据提供全面市场洞察的金融分析师代理

2. **YouTube 内容分析代理** (`examples/agents/youtube_agent.py`)
   - 分析 YouTube 视频内容的专家代理

3. **学习伙伴代理** (`examples/agents/study_partner.py`)
   - 帮助用户查找资源、回答问题并提供各种主题解释的学习伙伴

## 运行示例

要运行任何示例，请使用以下命令格式：

```powershell
# Windows
python cookbook\路径\到\示例.py

# Linux/Mac
python cookbook/路径/到/示例.py
```

例如，要运行金融分析代理：

```powershell
# Windows
python cookbook\examples\agents\thinking_finance_agent.py

# Linux/Mac
python cookbook/examples/agents/thinking_finance_agent.py
```

## 自定义代理

创建自己的代理时，可以参考以下基本模板：

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.your_tool import YourTools  # 导入所需工具

# 创建代理
your_agent = Agent(
    model=OpenAIChat(id="gpt-4o"),  # 选择合适的模型
    tools=[YourTools()],  # 添加所需工具
    description="代理的描述",
    instructions=[
        "指令1",
        "指令2",
        # 更多指令...
    ],
    markdown=True,  # 启用 Markdown 格式输出
    show_tool_calls=True,  # 显示工具调用
)

# 使用代理
response = your_agent.print_response("您的提示或问题", stream=True)
```

## 资源和文档

- 官方文档：[docs.agno.com](https://docs.agno.com)
- 入门示例：[Getting Started Cookbook](https://github.com/agno-agi/agno/tree/main/cookbook/getting_started)
- 所有示例：[Cookbook](https://github.com/agno-agi/agno/tree/main/cookbook)
- 社区论坛：[community.agno.com](https://community.agno.com/)
- 聊天：[Discord](https://discord.gg/4MtYHHrgA8)

## 关闭遥测

Agno 会记录代理使用的模型，以便优先更新最受欢迎的提供商。您可以通过在环境中设置 `AGNO_TELEMETRY=false` 来禁用此功能。

## 中文输出设置

如果您希望代理使用中文回复，可以在代理的指令中明确指定：

```python
instructions=[
    "You MUST respond in Chinese language only. All analysis, insights, and information should be presented in Chinese.",
    # 其他指令...
]
```

或者在代理描述中指定：

```python
description="You are a Chinese assistant who always responds in Chinese."
```

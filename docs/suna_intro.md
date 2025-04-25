# Suna 学习指南


## 目录

- [Suna 简介](#suna-简介)
- [核心功能](#核心功能)
- [系统架构](#系统架构)
- [安装与部署](#安装与部署)
  - [前置要求](#前置要求)
  - [快速部署步骤](#快速部署步骤)
  - [常见问题排查](#常见问题排查)
- [使用指南](#使用指南)
  - [基本操作](#基本操作)
  - [高级功能](#高级功能)
  - [最佳实践](#最佳实践)
- [开发者指南](#开发者指南)
  - [代码结构](#代码结构)
  - [自定义工具开发](#自定义工具开发)
  - [贡献指南](#贡献指南)
- [资源与支持](#资源与支持)

## Suna 简介

Suna 是一个功能强大的开源 AI 助手，旨在帮助用户完成各种现实世界的任务。通过自然对话，Suna 成为您的数字伙伴，协助您进行研究、数据分析和日常挑战 — 结合强大的功能和直观的界面，理解您的需求并提供结果。

Suna 的核心理念是将 AI 能力与实际行动相结合，让 AI 不仅能够理解和回答问题，还能代表用户执行具体操作，实现真正的智能助手体验。

## 核心功能

Suna 提供了一系列强大的工具和功能：

1. **浏览器自动化**：无缝导航网页并提取数据
2. **文件管理**：创建和编辑文档
3. **网络爬取**：获取和处理网络数据
4. **扩展搜索**：深入研究特定主题
5. **命令行执行**：执行系统任务
6. **网站部署**：简化网站发布流程
7. **API 集成**：连接各种服务和平台

这些功能协同工作，使 Suna 能够通过简单的对话解决复杂问题并自动化工作流程。

## 系统架构

![架构图](docs/images/diagram.png)

Suna 由四个主要组件组成：

### 后端 API
基于 Python/FastAPI 的服务，处理 REST 端点、线程管理和通过 LiteLLM 与 OpenAI、Anthropic 等 LLM 的集成。

### 前端
基于 Next.js/React 的应用程序，提供响应式 UI，包括聊天界面、仪表板等。

### Agent Docker
为每个代理提供隔离的执行环境 - 包括浏览器自动化、代码解释器、文件系统访问、工具集成和安全功能。

### Supabase 数据库
处理数据持久化，包括身份验证、用户管理、对话历史、文件存储、代理状态、分析和实时订阅。

## 安装与部署

### 前置要求

在开始安装 Suna 之前，您需要准备以下组件：

1. **Supabase 项目**：
   - 在 [Supabase 控制台](https://supabase.com/dashboard/projects) 创建新项目
   - 保存项目的 API URL、anon key 和 service role key
   - 安装 [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

2. **Redis 数据库**：
   - 推荐使用 [Upstash Redis](https://upstash.com/)（云部署）
   - 或本地安装：
     - Mac: `brew install redis`
     - Linux: 按照发行版特定说明安装
     - Windows: 使用 WSL2 或 Docker

3. **Daytona**：
   - 在 [Daytona](https://app.daytona.io/) 创建账户
   - 在账户设置中生成 API 密钥
   - 进入 [Images](https://app.daytona.io/dashboard/images)
   - 点击 "Add Image"
   - 输入镜像名称：`adamcohenhillel/kortix-suna:0.0.20`
   - 设置入口点：`/usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf`

4. **LLM API 密钥**：
   - 获取 [OpenAI](https://platform.openai.com/) 或 [Anthropic](https://www.anthropic.com/) 的 API 密钥

5. **搜索 API 密钥**（可选）：
   - 获取 [Tavily API 密钥](https://tavily.com/) 以增强搜索功能

6. **RapidAPI 密钥**（可选）：
   - 用于启用 LinkedIn 等 API 服务

### 快速部署步骤

1. **克隆仓库**：
   ```bash
   git clone https://github.com/kortix-ai/suna.git
   cd suna
   ```

2. **配置后端环境**：
   ```bash
   cd backend
   cp .env.example .env  # 如果有示例文件，或使用以下模板
   ```

   编辑 `.env` 文件并填入您的凭据：
   ```
   NEXT_PUBLIC_URL="http://localhost:3000"

   # Supabase 凭据
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Redis 凭据
   REDIS_HOST=your_redis_host
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
   REDIS_SSL=True  # 本地 Redis 无 SSL 时设为 False

   # Daytona 凭据
   DAYTONA_API_KEY=your_daytona_api_key
   DAYTONA_SERVER_URL="https://app.daytona.io/api"
   DAYTONA_TARGET="us"

   # Anthropic 或 OpenAI: 
   # Anthropic
   ANTHROPIC_API_KEY=your_anthropic_api_key
   MODEL_TO_USE="anthropic/claude-3-7-sonnet-latest"

   # 或 OpenAI API:
   OPENAI_API_KEY=your_openai_api_key
   MODEL_TO_USE="gpt-4o"

   # 可选但推荐
   TAVILY_API_KEY=your_tavily_api_key
   RAPID_API_KEY=your_rapid_api_key
   ```

3. **设置 Supabase 数据库**：
   ```bash
   # 登录 Supabase CLI
   supabase login

   # 链接到您的项目（在 Supabase 控制台中找到项目参考 ID）
   supabase link --project-ref your_project_reference_id

   # 推送数据库迁移
   supabase db push
   ```

   然后，再次进入 Supabase 网页平台 -> 选择您的项目 -> Project Settings -> Data API -> 在 "Exposed Schema" 中添加 "basejump"（如果尚未添加）

4. **配置前端环境**：
   ```bash
   cd ../frontend
   cp .env.example .env.local  # 如果有示例文件，或使用以下模板
   ```

   编辑 `.env.local` 文件：
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_BACKEND_URL="http://localhost:8000/api"
   NEXT_PUBLIC_URL="http://localhost:3000"
   ```

5. **安装依赖**：
   ```bash
   # 安装前端依赖
   cd frontend
   npm install

   # 安装后端依赖
   cd ../backend
   pip install -r requirements.txt
   ```

6. **启动应用程序**：

   在一个终端中启动前端：
   ```bash
   cd frontend
   npm run dev
   ```

   在另一个终端中启动后端：
   ```bash
   cd backend
   python api.py
   ```

7. **访问 Suna**：
   - 在浏览器中打开 `http://localhost:3000`
   - 使用 Supabase 认证注册账户
   - 开始使用您的自托管 Suna 实例！

### 常见问题排查

1. **Supabase 连接问题**：
   - 确保 Supabase URL 和密钥正确无误
   - 检查 Supabase 项目是否处于活动状态
   - 确认 "basejump" schema 已在 Data API 中暴露

2. **Redis 连接问题**：
   - 验证 Redis 连接参数是否正确
   - 如果使用本地 Redis，确保服务正在运行
   - 对于 Upstash Redis，检查网络连接和防火墙设置

3. **Daytona 集成问题**：
   - 确认 API 密钥有效且具有足够权限
   - 验证镜像名称和入口点设置正确

4. **LLM API 问题**：
   - 检查 API 密钥是否有效
   - 确认账户余额充足
   - 验证模型名称格式正确

5. **前端无法连接后端**：
   - 确保后端服务正在运行
   - 检查 NEXT_PUBLIC_BACKEND_URL 是否正确配置
   - 验证网络端口是否开放

## 使用指南

### 基本操作

1. **创建新对话**：
   - 点击界面上的 "New Chat" 按钮
   - 输入您的问题或任务描述
   - Suna 将开始处理您的请求并提供响应

2. **管理对话**：
   - 所有对话会保存在左侧边栏中
   - 可以重命名、归档或删除对话
   - 使用搜索功能快速找到历史对话

3. **文件上传与处理**：
   - 使用界面中的上传按钮添加文件
   - Suna 可以分析和处理各种文件格式
   - 上传的文件可以在对话中引用和使用

### 高级功能

1. **浏览器自动化**：
   - 要求 Suna 访问特定网站并提取信息
   - 可以执行表单填写、点击和导航等操作
   - 支持数据抓取和内容分析

2. **代码执行**：
   - Suna 可以生成和执行代码
   - 支持多种编程语言
   - 可以创建数据分析脚本、自动化工具等

3. **文档生成**：
   - 要求 Suna 创建报告、摘要或分析
   - 支持多种格式输出
   - 可以基于网络研究或上传文件生成内容

### 最佳实践

1. **明确任务描述**：
   - 提供具体、清晰的指令
   - 包含所需的上下文和背景信息
   - 明确说明预期输出格式

2. **分步骤处理复杂任务**：
   - 将大型任务分解为小步骤
   - 在每个步骤后验证结果
   - 根据需要调整后续指令

3. **有效利用上下文**：
   - 在同一对话中保持相关任务
   - 引用之前的结果和发现
   - 使用对话历史来构建复杂工作流

## 开发者指南

### 代码结构

Suna 项目分为三个主要部分：

1. **后端 (`/backend`)**：
   - `api.py`：主要的 FastAPI 应用程序
   - `agent/`：代理实现和工具集成
   - `models/`：数据模型和架构
   - `services/`：外部服务集成

2. **前端 (`/frontend`)**：
   - `pages/`：Next.js 页面组件
   - `components/`：可重用 UI 组件
   - `hooks/`：React 钩子和状态管理
   - `styles/`：CSS 和主题文件

3. **文档 (`/docs`)**：
   - 项目文档和图表

### 自定义工具开发

要为 Suna 开发新工具，请按照以下步骤操作：

1. 在 `backend/agent/tools/` 目录中创建新的工具类
2. 实现必要的方法：
   - `__init__`：初始化工具
   - `execute`：执行工具功能
   - `get_schema`：定义工具参数和返回类型
3. 在 `backend/agent/tools/__init__.py` 中注册新工具
4. 更新相关文档和测试

示例工具结构：

```python
from typing import Dict, Any
from .base import BaseTool

class MyCustomTool(BaseTool):
    name = "my_custom_tool"
    description = "Description of what this tool does"
    
    def __init__(self, agent_state):
        super().__init__(agent_state)
        # 初始化代码
        
    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        # 实现工具功能
        result = {}  # 处理逻辑
        return {"result": result}
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    "param1": {"type": "string", "description": "Parameter description"},
                    # 其他参数...
                },
                "required": ["param1"]
            }
        }
```

### 贡献指南

我们欢迎社区贡献！以下是参与 Suna 项目开发的步骤：

1. **Fork 仓库**：在 GitHub 上 fork Suna 仓库
2. **创建分支**：为您的功能或修复创建新分支
3. **编写代码**：实现您的更改，确保遵循项目的代码风格
4. **添加测试**：为新功能添加测试用例
5. **提交 PR**：创建 Pull Request 并描述您的更改

贡献前请阅读项目的 [LICENSE](./LICENSE) 文件，了解项目的开源许可证条款。

## 资源与支持

- **GitHub 仓库**：[kortix-ai/suna](https://github.com/kortix-ai/suna)
- **Discord 社区**：[加入 Discord](https://discord.gg/Py6pCBUUPw)
- **Twitter**：[@kortixai](https://x.com/kortixai)
- **问题报告**：[GitHub Issues](https://github.com/kortix-ai/suna/labels/bug)


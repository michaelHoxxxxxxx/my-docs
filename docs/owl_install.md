# OWL 安装与配置

本文档将指导您如何安装和配置OWL（Optimized Workforce Learning）框架，以便开始使用这个强大的多智能体协作系统。

## 系统要求

OWL支持以下Python版本：
- Python 3.10
- Python 3.11
- Python 3.12

## 安装选项

### 选项1：使用 uv（推荐）

```bash
# 克隆 GitHub 仓库
git clone https://github.com/camel-ai/owl.git

# 进入项目目录
cd owl

# 如果你还没有安装 uv，请先安装
pip install uv

# 创建虚拟环境并安装依赖
# 我们支持使用 Python 3.10、3.11、3.12
uv venv .venv --python=3.10

# 激活虚拟环境
# 对于 macOS/Linux
source .venv/bin/activate
# 对于 Windows
.venv\Scripts\activate

# 安装 CAMEL 及其所有依赖
uv pip install -e .

# 完成后退出虚拟环境
deactivate
```

### 选项2：使用 venv 和 pip

```bash
# 克隆 GitHub 仓库
git clone https://github.com/camel-ai/owl.git

# 进入项目目录
cd owl

# 创建虚拟环境
# 对于 Python 3.10（也适用于 3.11、3.12）
python3.10 -m venv .venv

# 激活虚拟环境
# 对于 macOS/Linux
source .venv/bin/activate
# 对于 Windows
.venv\Scripts\activate

# 安装 CAMEL 及其所有依赖
pip install -e .

# 完成后退出虚拟环境
deactivate
```

## 使用Docker运行

OWL可以通过Docker轻松部署，Docker提供了跨不同平台的一致环境。

```bash
# 拉取最新的OWL Docker镜像
docker pull camelai/owl:latest

# 运行OWL容器
docker run -it --rm camelai/owl:latest
```

## 配置API密钥

OWL支持多种AI模型服务，您需要配置相应的API密钥才能使用这些服务。

### 方法1：使用.env文件（推荐）

在项目根目录创建一个`.env`文件，添加您的API密钥：

```
# OpenAI API密钥
OPENAI_API_KEY=your_openai_api_key

# Anthropic API密钥
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google API密钥
GOOGLE_API_KEY=your_google_api_key

# 其他服务的API密钥
SERPER_API_KEY=your_serper_api_key
SERPAPI_API_KEY=your_serpapi_api_key
```

### 方法2：通过环境变量设置

您也可以直接在终端中设置环境变量：

对于Linux/macOS：
```bash
export OPENAI_API_KEY=your_openai_api_key
export ANTHROPIC_API_KEY=your_anthropic_api_key
```

对于Windows：
```bash
set OPENAI_API_KEY=your_openai_api_key
set ANTHROPIC_API_KEY=your_anthropic_api_key
```

> **注意**：直接在终端中设置的环境变量仅在当前会话中有效。

## 安装可选依赖

根据您的使用需求，您可能需要安装一些可选依赖：

### 网页浏览功能

如果您需要使用OWL的网页浏览功能，需要安装Playwright：

```bash
# 安装Playwright
pip install playwright

# 安装必要的浏览器
playwright install
```

### 图像和视频处理

对于图像和视频处理功能：

```bash
pip install "camel-ai[vision]"
```

### 音频处理

对于音频处理功能：

```bash
pip install "camel-ai[audio]"
```

### 安装所有可选依赖

如果您想安装所有可选依赖：

```bash
pip install "camel-ai[all]"
```

## 验证安装

安装完成后，您可以运行一个简单的示例来验证OWL是否正确安装：

```python
from owl import Agent

# 创建一个基本的OWL Agent
agent = Agent()

# 测试Agent功能
response = agent.run("你好，请介绍一下OWL框架")
print(response)
```

## 启动网页界面

OWL提供了一个基于网页的用户界面，使系统交互变得更加简便：

```bash
# 激活虚拟环境
source .venv/bin/activate  # Linux/macOS
# 或
.venv\Scripts\activate  # Windows

# 启动网页界面
python -m owl.ui.app
```

启动后，您可以通过浏览器访问 `http://localhost:8000` 来使用OWL的网页界面。

## 常见问题

### API密钥问题

如果遇到API密钥相关错误：
- 确保您已正确设置API密钥
- 检查API密钥是否有效
- 确认您的账户有足够的API使用额度

### 依赖安装问题

如果遇到依赖安装问题：
- 尝试使用`pip install --upgrade pip`更新pip
- 确保您的Python版本兼容（3.10、3.11或3.12）
- 对于Windows用户，某些依赖可能需要安装Visual C++ Build Tools

### Playwright相关问题

如果浏览器工具包无法正常工作：
- 确保您已安装Playwright：`pip install playwright`
- 确保您已安装必要的浏览器：`playwright install`
- 如果在无头服务器上运行，可能需要安装额外的系统依赖

## 下一步

成功安装和配置OWL后，您可以继续阅读[OWL基础概念](docs/owl_basic-concepts.md)文档，了解如何使用OWL构建强大的多智能体应用。

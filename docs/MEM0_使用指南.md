# Mem0 安装与使用指南

Mem0（"mem-zero"）是一个为 AI 助手和代理提供智能记忆层的开源项目，它能够记住用户偏好、适应个人需求，并随着时间不断学习。本指南将帮助你在本地安装和使用 Mem0。

## 目录

- [环境准备](#环境准备)
- [安装步骤](#安装步骤)
- [基本使用](#基本使用)
- [高级应用场景](#高级应用场景)
- [常见问题解答](#常见问题解答)

## 环境准备

在安装 Mem0 之前，请确保你的系统满足以下要求：

- Python 3.9 或更高版本（但低于 4.0）
- Poetry（Python 依赖管理工具）

### 安装 Poetry

在 Windows 上安装 Poetry：

```powershell
# 使用官方安装脚本
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# 将 Poetry 添加到 PATH 环境变量
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Users\<用户名>\AppData\Roaming\Python\Scripts", "User")
```

安装完成后，重新启动 PowerShell 或命令提示符，然后验证安装：

```powershell
poetry --version
```

## 安装步骤

### 1. 克隆仓库（如果你还没有）

```bash
git clone https://github.com/mem0ai/mem0.git
cd mem0
```

### 2. 使用 Poetry 安装依赖

安装基本依赖：

```powershell
poetry install
```

如果你想安装所有可选依赖（包括各种 LLM 和向量存储支持）：

```powershell
# 如果你有 make 工具
make install_all

# 如果你没有 make 工具
poetry install
poetry run pip install ruff==0.6.9 groq together boto3 litellm ollama chromadb weaviate weaviate-client sentence_transformers vertexai google-generativeai elasticsearch opensearch-py vecs pinecone pinecone-text faiss-cpu langchain-community upstash-vector azure-search-documents langchain-memgraph
```

> **注意**：在 Windows 上，某些依赖项可能需要 Microsoft C++ 生成工具。如果遇到编译错误，请安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)。

### 3. 设置 API 密钥（如果使用 OpenAI）

Mem0 默认使用 OpenAI 的 `gpt-4o-mini` 模型。你需要设置 OpenAI API 密钥：

```powershell
# 在 PowerShell 中设置环境变量
$env:OPENAI_API_KEY = "your_openai_api_key"

# 或者在代码中设置
import os
os.environ["OPENAI_API_KEY"] = "your_openai_api_key"
```

## 基本使用

### 创建记忆实例

```python
from mem0 import Memory
from openai import OpenAI

# 初始化 OpenAI 客户端
openai_client = OpenAI()

# 初始化 Mem0 记忆系统
memory = Memory()
```

### 添加记忆

```python
# 添加对话记忆
memory.add([
    {"role": "user", "content": "我的名字是张三"},
    {"role": "assistant", "content": "你好，张三！很高兴认识你。"}
], user_id="user123")

# 添加自定义记忆
memory.add("张三喜欢打篮球", user_id="user123", tags=["爱好", "运动"])
```

### 检索记忆

```python
# 语义搜索记忆
results = memory.search(query="我的名字是什么？", user_id="user123", limit=3)
for entry in results["results"]:
    print(f"- {entry['memory']}")

# 按标签搜索记忆
hobby_results = memory.search(query="爱好", user_id="user123", tags=["爱好"], limit=5)
```

### 使用记忆生成回复

```python
query = "我的名字是什么？"
relevant_memories = memory.search(query=query, user_id="user123", limit=3)
memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])

system_prompt = f"""你是一个有帮助的AI助手。根据查询和记忆回答问题。
用户记忆:
{memories_str}"""

messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": query}
]

response = openai_client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages
)

print(f"回复: {response.choices[0].message.content}")
```

### 完整的聊天示例

```python
def chat_with_memories(message: str, user_id: str = "default_user") -> str:
    # 检索相关记忆
    relevant_memories = memory.search(query=message, user_id=user_id, limit=3)
    memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])

    # 生成助手回复
    system_prompt = f"You are a helpful AI. Answer the question based on query and memories.\nUser Memories:\n{memories_str}"
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]
    response = openai_client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    assistant_response = response.choices[0].message.content

    # 从对话中创建新记忆
    messages.append({"role": "assistant", "content": assistant_response})
    memory.add(messages, user_id=user_id)

    return assistant_response

def main():
    print("Chat with AI (type 'exit' to quit)")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == 'exit':
            print("Goodbye!")
            break
        print(f"AI: {chat_with_memories(user_input)}")

if __name__ == "__main__":
    main()
```

## 高级应用场景

### 1. 客户支持机器人

```python
def support_bot(customer_query, customer_id):
    # 检索该客户的历史记忆
    relevant_memories = memory.search(query=customer_query, user_id=customer_id, limit=5)
    
    # 构建包含历史记忆的提示
    memories_str = "\n".join([f"- 历史记录: {m['memory']}" for m in relevant_memories["results"]])
    
    system_prompt = f"""你是一个客户支持助手。使用以下客户历史记录来提供个性化帮助。
客户历史:
{memories_str}

请保持专业和友好的态度。如果历史记录中有客户偏好，请记住并使用它们。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": customer_query}
    ]
    
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini", 
        messages=messages
    )
    
    assistant_response = response.choices[0].message.content
    
    # 保存这次交互到记忆中
    memory.add([
        {"role": "user", "content": customer_query},
        {"role": "assistant", "content": assistant_response}
    ], user_id=customer_id)
    
    return assistant_response
```

### 2. 个人助理应用

```python
def personal_assistant(user_query, user_id):
    # 检索用户的相关记忆
    relevant_memories = memory.search(query=user_query, user_id=user_id, limit=5)
    
    # 构建提示
    memories_str = "\n".join([f"- {m['memory']}" for m in relevant_memories["results"]])
    
    system_prompt = f"""你是一个个人助理。使用以下用户历史记录来提供个性化帮助。
用户历史:
{memories_str}

如果用户询问他们之前提到的任务、约会或偏好，请参考历史记录回答。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]
    
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini", 
        messages=messages
    )
    
    assistant_response = response.choices[0].message.content
    
    # 保存这次交互到记忆中
    memory.add([
        {"role": "user", "content": user_query},
        {"role": "assistant", "content": assistant_response}
    ], user_id=user_id)
    
    return assistant_response
```

### 3. 使用不同的 LLM

Mem0 支持多种 LLM，以下是使用 Anthropic Claude 的示例：

```python
from mem0 import Memory
from mem0.llms import Claude

# 初始化 Claude LLM
claude_llm = Claude(api_key="your_anthropic_api_key")

# 初始化 Mem0 记忆系统，使用 Claude
memory = Memory(llm=claude_llm)
```

### 4. 使用不同的向量存储

Mem0 支持多种向量存储，以下是使用 Qdrant 的示例：

```python
from mem0 import Memory
from mem0.vector_stores import QdrantVectorStore

# 初始化 Qdrant 向量存储
vector_store = QdrantVectorStore(url="http://localhost:6333")

# 初始化 Mem0 记忆系统，使用 Qdrant
memory = Memory(vector_store=vector_store)
```

## 常见问题解答

### 1. 如何处理依赖安装问题？

如果在安装依赖时遇到问题，特别是在 Windows 上，可以尝试以下解决方案：

- 使用 `--prefer-binary` 选项安装预编译的二进制包：
  ```powershell
  poetry run pip install numpy --prefer-binary
  ```

- 安装特定版本的依赖：
  ```powershell
  poetry run pip install numpy==1.24.3
  ```

- 确保已安装 Microsoft C++ 生成工具

### 2. 如何在生产环境中使用 Mem0？

对于生产环境，建议：

- 使用持久化的向量存储（如 Qdrant、Pinecone 等）
- 设置适当的记忆过期策略
- 实现用户认证和授权
- 考虑使用 Mem0 的托管平台版本

### 3. Mem0 支持哪些 LLM？

Mem0 支持多种 LLM，包括但不限于：

- OpenAI（GPT-4、GPT-4o、GPT-3.5 等）
- Anthropic Claude
- Google Gemini
- Mistral AI
- Llama 2 和 Llama 3
- 本地模型（通过 Ollama）

详细信息请参考 [Mem0 LLM 文档](https://docs.mem0.ai/components/llms/overview)。

### 4. 如何优化记忆检索？

- 调整 `limit` 参数控制检索的记忆数量
- 使用 `tags` 参数过滤特定类型的记忆
- 调整相似度阈值以控制检索的精确度
- 考虑使用不同的嵌入模型以提高语义理解

## 更多资源

- [Mem0 官方文档](https://docs.mem0.ai)
- [Mem0 GitHub 仓库](https://github.com/mem0ai/mem0)
- [Mem0 Discord 社区](https://mem0.dev/DiG)

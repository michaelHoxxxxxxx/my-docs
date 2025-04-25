# HawkinsDB 使用指南

## 简介

HawkinsDB 是一个受神经科学启发的内存层，专为大型语言模型(LLM)应用程序设计。基于Jeff Hawkins的"千脑理论"(Thousand Brains Theory)，它以更类人的方式存储和检索信息，帮助AI模型以更强大和直观的方式管理复杂信息。

## 核心概念

HawkinsDB 通过三个核心概念管理信息：

### 1. 参考框架 (Reference Frames)

智能信息容器，捕获事物的本质、属性、关系和上下文。这使得系统能够自然地处理复杂查询，如"查找与咖啡冲泡相关的厨房物品"。

### 2. 皮质柱 (Cortical Columns)

就像人脑从多个角度（视觉、触觉、概念）处理信息一样，HawkinsDB系统从不同的"列"存储知识。这意味着一个对象不仅仅存储为单一定义，而是从多个角度理解。

### 3. 记忆类型 (Memory Types)

HawkinsDB支持三种关键类型的记忆：

- **语义记忆 (Semantic Memory)**: 存储事实、概念和一般知识
- **情景记忆 (Episodic Memory)**: 跟踪事件和经历
- **程序记忆 (Procedural Memory)**: 捕获步骤流程和工作流

## 安装

### 系统要求

- Python 3.10 或更高版本
- OpenAI API 密钥（用于LLM操作）
- SQLite 或 JSON 存储后端

### 安装命令

```bash
# 基本安装
pip install hawkinsdb

# 推荐安装（包含所有功能）
pip install hawkinsdb[all]

# 安装特定功能
pip install hawkinsdb[conceptnet]  # ConceptNet工具
```

## 基本使用

### 初始化数据库

```python
from hawkinsdb import HawkinsDB

# 使用默认设置初始化（内存中JSON存储）
db = HawkinsDB()

# 使用JSON文件存储
db = HawkinsDB(db_path="my_database.json", storage_type="json")

# 使用SQLite存储
db = HawkinsDB(db_path="my_database.db", storage_type="sqlite")
```

### 添加语义记忆

```python
db.add_entity({
    "name": "Cat",
    "column": "Semantic",
    "properties": {
        "type": "Animal",
        "features": ["fur", "whiskers", "tail"],
        "diet": "carnivore"
    },
    "relationships": {
        "preys_on": ["mice", "birds"],
        "related_to": ["tiger", "lion"]
    }
})
```

### 添加情景记忆

```python
import time

db.add_entity({
    "name": "First Pet",
    "column": "Episodic",
    "properties": {
        "timestamp": str(time.time()),
        "action": "Got my first cat",
        "location": "Pet Store",
        "emotion": "happy",
        "participants": ["family", "pet store staff"]
    }
})
```

### 添加程序记忆

```python
db.add_entity({
    "name": "Feed Cat",
    "column": "Procedural",
    "properties": {
        "steps": [
            "Get cat food from cabinet",
            "Fill bowl with appropriate amount",
            "Add fresh water to water bowl",
            "Call cat for feeding"
        ],
        "frequency": "twice daily",
        "importance": "high"
    }
})
```

### 查询记忆

```python
# 查询特定实体的所有记忆框架
cat_memories = db.query_frames("Cat")
print(f"Cat-related memories: {cat_memories}")

# 查询特定程序
feeding_memories = db.query_frames("Feed Cat")
print(f"Feeding procedure: {feeding_memories}")

# 列出所有实体
all_entities = db.list_entities()
print(f"Entities: {all_entities}")
```

### 清理资源

```python
# 完成后清理
db.cleanup()
```

## 与LLM集成

HawkinsDB可以与大型语言模型(LLM)无缝集成，实现自然语言查询和响应：

```python
from hawkinsdb import HawkinsDB, LLMInterface

# 初始化
db = HawkinsDB()
llm = LLMInterface(db)

# 存储知识
db.add_entity({
    "column": "Semantic",
    "name": "Coffee Cup",
    "properties": {
        "type": "Container",
        "material": "Ceramic",
        "capacity": "350ml"
    },
    "relationships": {
        "used_for": ["Drinking Coffee", "Hot Beverages"],
        "found_in": ["Kitchen", "Coffee Shop"]
    }
})

# 使用自然语言查询
response = llm.query("What can you tell me about the coffee cup?")
print(response)
```

## 存储选项

### JSON存储

适合原型设计和快速测试：

```python
db = HawkinsDB(db_path="my_database.json", storage_type="json")
```

### SQLite存储

适合生产系统：

```python
db = HawkinsDB(db_path="my_database.db", storage_type="sqlite")
```

## 高级功能

### ConceptNet集成

启用ConceptNet集成可以自动丰富知识并发现关系：

```python
# 安装ConceptNet支持
# pip install hawkinsdb[conceptnet]

from hawkinsdb import HawkinsDB
from hawkinsdb.enrichment import ConceptNetEnricher

db = HawkinsDB()
enricher = ConceptNetEnricher()

# 添加实体
entity_id = db.add_entity({
    "name": "Apple",
    "column": "Semantic",
    "properties": {
        "color": "red",
        "taste": "sweet"
    }
})

# 使用ConceptNet丰富实体
enriched_data = enricher.enrich_entity("Apple")
db.update_entity(entity_id, enriched_data)
```

### 检索增强生成 (RAG)

如果您需要实现检索增强生成(RAG)，可以考虑使用HawkinsRAG包：

```bash
pip install hawkins-rag
```

详细信息请参考[HawkinsRAG文档](https://github.com/harishsg993010/HawkinsRAG/tree/main/docs)。

## 示例应用场景

### 客户支持AI

```python
# 初始化数据库
db = HawkinsDB(db_path="customer_support.db", storage_type="sqlite")

# 添加产品知识（语义记忆）
db.add_entity({
    "name": "ProductX",
    "column": "Semantic",
    "properties": {
        "type": "Software",
        "version": "2.0",
        "features": ["feature1", "feature2", "feature3"]
    }
})

# 添加常见问题解决步骤（程序记忆）
db.add_entity({
    "name": "Troubleshoot_Login",
    "column": "Procedural",
    "properties": {
        "steps": [
            "Check username and password",
            "Verify internet connection",
            "Clear browser cache",
            "Try incognito mode"
        ]
    },
    "relationships": {
        "applies_to": ["ProductX"]
    }
})

# 添加客户互动历史（情景记忆）
db.add_entity({
    "name": "Customer_Interaction_12345",
    "column": "Episodic",
    "properties": {
        "timestamp": "2024-04-20T14:30:00",
        "customer_id": "C12345",
        "issue": "login problem",
        "resolution": "cleared cache"
    },
    "relationships": {
        "involves": ["ProductX", "Troubleshoot_Login"]
    }
})

# 使用LLM接口回答客户问题
llm = LLMInterface(db)
response = llm.query("Customer C12345 is having login issues again. What should I recommend?")
print(response)
```

### 个人助手

```python
# 初始化个人助手数据库
db = HawkinsDB(db_path="personal_assistant.db", storage_type="sqlite")

# 添加用户偏好（语义记忆）
db.add_entity({
    "name": "UserPreferences",
    "column": "Semantic",
    "properties": {
        "favorite_cuisine": "Italian",
        "dietary_restrictions": ["gluten-free"],
        "preferred_workout_time": "morning"
    }
})

# 添加日常例行程序（程序记忆）
db.add_entity({
    "name": "MorningRoutine",
    "column": "Procedural",
    "properties": {
        "steps": [
            "Wake up at 6:30 AM",
            "Drink water",
            "30-minute workout",
            "Shower",
            "Breakfast",
            "Check emails"
        ],
        "duration": "90 minutes"
    }
})

# 添加重要事件（情景记忆）
db.add_entity({
    "name": "DoctorAppointment",
    "column": "Episodic",
    "properties": {
        "timestamp": "2024-04-30T10:00:00",
        "location": "City Medical Center",
        "doctor": "Dr. Smith",
        "purpose": "Annual checkup"
    }
})

# 使用LLM接口回答问题
llm = LLMInterface(db)
response = llm.query("What's on my schedule for next week and should I prepare anything special for breakfast?")
print(response)
```

## 故障排除

### 常见问题

1. **安装错误**：确保您使用的是Python 3.10或更高版本。
   ```bash
   python --version
   ```

2. **LLM操作失败**：检查您的OpenAI API密钥是否正确设置。
   ```python
   import os
   os.environ["OPENAI_API_KEY"] = "your-api-key"
   ```

3. **存储错误**：确保您有权限写入指定的数据库路径。

### 获取帮助

如果您遇到问题，可以：

1. 查看项目[GitHub仓库](https://github.com/harishsg993010/HawkinsDB)
2. 检查[示例目录](https://github.com/harishsg993010/HawkinsDB/tree/main/examples)中的示例代码
3. 提交[Issue](https://github.com/harishsg993010/HawkinsDB/issues)

## 结语

HawkinsDB提供了一种更加类人的方式来存储和检索信息，使AI应用程序能够更好地理解和处理复杂数据。通过结合语义、情景和程序记忆，它为构建更智能的AI系统提供了坚实的基础。

无论您是构建聊天机器人、个人助手、知识管理系统还是其他AI应用，HawkinsDB都能帮助您实现更自然、更有效的信息处理。



# NodeRAG: 综合指南

## 简介

NodeRAG是一个基于异构图的检索增强生成(RAG)系统，它通过将信息构建为图中的互连节点来增强传统的RAG方法。本指南提供了NodeRAG的架构、特性和使用说明的概述。

## 目录

1. [什么是NodeRAG?](#什么是noderag)
2. [核心特性](#核心特性)
3. [架构概述](#架构概述)
4. [安装指南](#安装指南)
5. [使用指南](#使用指南)
   - [配置](#配置)
   - [构建知识图谱](#构建知识图谱)
   - [查询系统](#查询系统)
6. [高级功能](#高级功能)
7. [性能基准](#性能基准)
8. [故障排除](#故障排除)
9. [其他资源](#其他资源)

## 什么是NodeRAG?

NodeRAG是一个以图为中心的框架，它引入异构图结构，实现了基于图的方法与RAG工作流的无缝集成。与传统的RAG系统将提取的见解和原始数据视为独立层不同，NodeRAG将它们作为互连节点整合在一起，创建了一个统一且适应性强的检索系统。

该系统利用异构图(HeteroGraphs)实现功能不同的节点，确保精确和上下文感知的检索，同时提高可解释性。这种方法允许细粒度检索和更好地处理复杂的信息关系。

## 核心特性

### 🔗 增强RAG的图结构
NodeRAG引入了异构图结构，强化了基于图的检索增强生成(RAG)的基础。

### 🔍 细粒度和可解释的检索
NodeRAG利用异构图实现功能不同的节点，确保精确和上下文感知的检索，同时提高可解释性。

### 🧱 统一的信息检索
NodeRAG不再将提取的见解和原始数据视为独立层，而是将它们作为互连节点整合在一起，创建了一个无缝且适应性强的检索系统。

### ⚡ 优化的性能和速度
NodeRAG通过统一算法和优化实现，实现了更快的图构建和检索速度。

### 🔄 增量图更新
NodeRAG通过图连接机制支持异构图内的增量更新。

### 📊 可视化和用户界面
NodeRAG提供了用户友好的可视化系统。结合全面开发的Web UI，用户可以轻松探索、分析和管理图结构。

## 架构概述

NodeRAG的架构由几个关键组件组成：

### 节点类型

1. **实体节点(Entity Nodes)**: 表示从文档中提取的关键实体
2. **关系节点(Relationship Nodes)**: 捕获实体之间的关系
3. **属性节点(Attribute Nodes)**: 存储实体的属性和特征
4. **高级元素节点(High-Level Element Nodes)**: 表示更高层次的概念和摘要

### 处理管道阶段

NodeRAG通过一系列管道阶段处理信息：

1. **文档管道(Document Pipeline)**: 处理输入文档并为文本提取做准备
2. **文本管道(Text Pipeline)**: 从文档中提取和处理文本
3. **图谱管道(Graph Pipeline)**: 构建初始图结构
4. **属性管道(Attribute Pipeline)**: 为实体生成属性
5. **嵌入管道(Embedding Pipeline)**: 为节点创建嵌入向量
6. **摘要管道(Summary Pipeline)**: 为高级元素生成摘要
7. **插入文本管道(Insert Text Pipeline)**: 将文本插入图结构
8. **HNSW管道(HNSW Pipeline)**: 构建层次可导航小世界索引，用于高效的相似性搜索

### 搜索和检索

NodeRAG中的搜索过程结合了：

1. **向量相似性搜索**: 使用HNSW进行高效的最近邻搜索
2. **实体匹配**: 对查询中提到的实体进行精确搜索
3. **基于图的排名**: 使用个性化PageRank找到相关节点
4. **后处理**: 在最终结果中平衡不同类型的节点

## 安装指南

### 前提条件

- Python 3.10或更高版本
- Conda (推荐用于环境管理)

### 设置环境

```bash
# 创建并激活虚拟环境
conda create -n NodeRAG python=3.10
conda activate NodeRAG
```

### 安装uv (可选)

用于更快的包安装：

```bash
pip install uv
```

### 安装NodeRAG

```bash
uv pip install NodeRAG
```

或使用常规pip：

```bash
pip install NodeRAG
```

## 使用指南

### 配置

NodeRAG使用YAML配置文件(`Node_config.yaml`)控制其行为。关键配置部分包括：

#### AI模型配置

```yaml
model_config:
  service_provider: openai            # AI服务提供商(例如openai, gemini)
  model_name: gpt-4o-mini            # 文本生成模型名称
  api_keys: YOUR_API_KEY
  temperature: 0                      # 文本生成的温度参数
  max_tokens: 10000                   # 生成的最大令牌数
  rate_limit: 40                      # API速率限制(每秒请求数)

embedding_config:
  service_provider: openai_embedding  # 嵌入服务提供商
  embedding_model_name: text-embedding-3-small  # 文本嵌入模型名称
  api_keys: YOUR_API_KEY
  rate_limit: 20                      # 嵌入请求的速率限制
```

#### 文档处理配置

```yaml
config:
  # 基本设置
  main_folder: .                     # 文档处理的根文件夹
  language: English                  # 文档处理语言
  docu_type: mixed                   # 文档类型(mixed, pdf, txt等)
  
  # 分块设置
  chunk_size: 1048                   # 处理的文本块大小
  embedding_batch_size: 50           # 嵌入处理的批量大小
  
  # HNSW索引设置
  space: l2                          # HNSW的距离度量(l2, cosine)
  dim: 1536                          # 嵌入维度
  m: 50                              # HNSW中每层的连接数
  ef: 200                            # HNSW中动态候选列表的大小
  
  # 搜索设置
  url: '127.0.0.1'                   # 搜索服务的服务器URL
  port: 5000                         # 服务器端口号
  unbalance_adjust: true             # 启用不平衡数据调整
  cross_node: 10                     # 返回的交叉节点数
  Enode: 10                          # 返回的实体节点数
  Rnode: 30                          # 返回的关系节点数
  Hnode: 10                          # 返回的高级节点数
```

### 构建知识图谱

NodeRAG系统通过一系列管道阶段构建知识图谱。主类`NodeRag`协调这个过程：

```python
from NodeRAG.config import NodeConfig
from NodeRAG.build import NodeRag

# 加载配置
config = NodeConfig('path/to/Node_config.yaml')

# 创建NodeRag实例
node_rag = NodeRag(config)

# 运行管道
node_rag.run()
```

该管道将处理文档、提取文本、构建图结构、生成属性、创建嵌入、生成摘要并构建HNSW索引。

### 查询系统

一旦构建了知识图谱，您可以使用`NodeSearch`类查询它：

```python
from NodeRAG.config import NodeConfig
from NodeRAG.search import NodeSearch

# 加载配置
config = NodeConfig('path/to/Node_config.yaml')

# 创建NodeSearch实例
search = NodeSearch(config)

# 搜索信息
result = search.search("您的查询")

# 获取答案
answer = search.answer("您的问题")
print(answer.response)
```

您也可以使用命令行界面：

```bash
python -m NodeRAG -q "您的问题" -f /path/to/project/folder -a -r
```

其中：
- `-q`或`--question`: 要提问的问题
- `-f`或`--folder`: 项目的主文件夹
- `-a`或`--answer`: 是否返回答案
- `-r`或`--retrieval`: 是否返回检索结果

## 高级功能

### 增量更新

NodeRAG支持知识图谱的增量更新，允许您添加新文档而无需重建整个图：

```python
# 系统自动检测新文档并处理它们
node_rag.run()  # 将检测增量文件并更新图
```

### 可视化

NodeRAG包含可视化工具，用于探索图结构：

```python
from NodeRAG.Vis import GraphVisualizer

visualizer = GraphVisualizer(config)
visualizer.visualize()  # 创建交互式可视化
```

### Web用户界面

NodeRAG提供了基于Web的用户界面，用于与系统交互：

```python
from NodeRAG.WebUI import app

# 启动Web UI
app.run(host='0.0.0.0', port=8080)
```

## 性能基准

NodeRAG在多个基准任务中表现出色：

- **检索质量**: 在信息检索任务中具有高精度和召回率
- **速度**: 即使在大型数据集上也能快速索引和查询响应
- **可扩展性**: 高效处理大型文档集合

## 故障排除

### 常见问题

1. **缺少缓存文件**:
   ```
   Exception: [path] not found, Please check cache integrity. You may need to rebuild the database due to the loss of cache files.
   ```
   解决方案: 再次运行完整管道以重建缓存。

2. **API速率限制**:
   ```
   Exception: API rate limit exceeded
   ```
   解决方案: 调整配置文件中的rate_limit参数。

3. **内存问题**:
   ```
   MemoryError: ...
   ```
   解决方案: 减少配置中的批量大小或块大小。

## 其他资源

- **官方网站**: [NodeRAG_web](https://terry-xu-666.github.io/NodeRAG_web/)
- **文档**: [综合文档](https://terry-xu-666.github.io/NodeRAG_web/docs/)
- **教程**: 
  - [索引指南](https://terry-xu-666.github.io/NodeRAG_web/docs/indexing/)
  - [回答指南](https://terry-xu-666.github.io/NodeRAG_web/docs/answer/)
- **博客文章**: [NodeRAG博客](https://terry-xu-666.github.io/NodeRAG_web/blog/)
- **GitHub仓库**: [GitHub上的NodeRAG](https://github.com/Terry-Xu-666/NodeRAG)

---

*本指南生成于2025年4月25日。有关最新信息，请参阅官方文档。*

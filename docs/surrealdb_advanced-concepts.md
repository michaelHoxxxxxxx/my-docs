```md
## 1. UUID（通用唯一识别码）

UUID 在 SurrealDB 中常用于唯一标识数据库中的记录，确保不同记录之间不会发生冲突。

### **生成 UUID**
SurrealDB 提供了 `uuid()` 函数来生成 UUID，例如：
```sql
SELECT uuid();
```
示例返回：
```json
[
  {
    "uuid": "8f7280f2-bc03-49b5-b21e-38f56a59ad1e"
  }
]
```

### **使用 UUID 作为主键**
在 SurrealDB 中，通常使用 `id` 作为主键，可以手动指定 UUID：
```sql
CREATE user SET id = uuid(), name = "Alice", email = "alice@example.com";
```
或者使用 SurrealQL 自动生成 UUID：
```sql
CREATE user SET name = "Bob", email = "bob@example.com";
```
SurrealDB 会自动为 `id` 生成 UUID。

### **查询 UUID 记录**
```sql
SELECT * FROM user WHERE id = "8f7280f2-bc03-49b5-b21e-38f56a59ad1e";
```

---

## 2. 向量查询（Vector Search）

SurrealDB 允许存储和检索向量数据，适用于相似度搜索（例如推荐系统、图像搜索等）。

### **存储向量数据**
```sql
CREATE article SET id = uuid(), title = "AI in 2025", content = "Future of AI", embedding = [0.12, 0.56, 0.98];
CREATE article SET id = uuid(), title = "Machine Learning", content = "Deep Learning trends", embedding = [0.14, 0.58, 0.99];
```

### **向量相似度搜索**
使用 `vector::cosine()` 计算余弦相似度：
```sql
SELECT *, vector::cosine(embedding, [0.13, 0.57, 0.98]) AS similarity
FROM article
ORDER BY similarity DESC
LIMIT 5;
```
这个查询会返回最相似的文章，按照相似度排序。

---

## 3. 图谱查询（Graph Query）

SurrealDB 内置了图数据库的能力，可以存储和查询节点（记录）与边（关系）。

### **创建关系数据**
```sql
CREATE person:alice SET name = "Alice";
CREATE person:bob SET name = "Bob";
CREATE person:charlie SET name = "Charlie";

RELATE person:alice->knows->person:bob SET since = "2023-01-01";
RELATE person:bob->knows->person:charlie SET since = "2023-06-01";
```

### **查询图关系**
查询 Alice 认识的所有人：
```sql
SELECT ->knows.* FROM person:alice;
```
返回：
```json
[
  {
    "id": "person:bob",
    "since": "2023-01-01"
  }
]
```

查询 Bob 间接认识的人：
```sql
SELECT ->knows->knows.* FROM person:bob;
```

---

## 4. 时序查询（Time Series Query）

SurrealDB 支持存储时间序列数据，并可以按时间查询数据。

### **存储时序数据**
```sql
CREATE sensor:1 SET timestamp = time::now(), temperature = 22.5;
CREATE sensor:1 SET timestamp = time::now(), temperature = 23.1;
```

### **查询一段时间的数据**
查询最近 24 小时的数据：
```sql
SELECT * FROM sensor WHERE timestamp > time::now() - 1d;
```

### **按时间排序**
```sql
SELECT * FROM sensor ORDER BY timestamp DESC LIMIT 10;
```

---

SurrealDB 提供了丰富的数据查询能力，包括 UUID、向量搜索、图查询和时序数据处理。你可以利用这些功能来构建复杂的应用，例如推荐系统、社交网络分析、时间序列数据监控等。
```


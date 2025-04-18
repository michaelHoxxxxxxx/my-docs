# n8n 节点介绍

n8n 是一个强大的开源工作流自动化工具，它使用 **节点（Nodes）** 来连接不同的应用和服务，实现数据处理和自动化任务。

---

## 📌 什么是 n8n 的节点？
在 n8n 中，**节点（Node）** 是工作流的基本构建块。每个节点代表一个操作，比如：  
- 触发某个事件（Webhook、定时器等）
- 获取数据（API 请求、数据库查询等）
- 处理数据（格式转换、计算、合并等）
- 发送数据（邮件、消息推送、写入数据库等）

---

## 🌟 n8n 节点的类型
n8n 有 **多种类型** 的节点，主要包括以下几类：

### 1️⃣ 触发节点（Trigger Nodes）
- 这些节点是 **工作流的起点**，会在特定事件发生时触发工作流。
- **常见的触发节点：**
  - **Webhook Trigger**（监听 HTTP 请求）
  - **Cron Trigger**（定时触发）
  - **Email Trigger**（监听邮件）
  - **Database Trigger**（监听数据库的变化）

---

### 2️⃣ API & 服务集成节点
- 这些节点用于 **连接外部 API**，获取或发送数据。
- **常见的 API 节点：**
  - **HTTP Request**（自定义 API 请求）
  - **Google Sheets**（读写 Google 表格）
  - **Slack**（发送 Slack 消息）
  - **Telegram**（发送 Telegram 消息）
  - **Airtable**（读写 Airtable 数据）

---

### 3️⃣ 数据处理节点
- 用于对数据进行 **转换、筛选、处理**。
- **常见的数据处理节点：**
  - **Function**（自定义 JavaScript 代码处理数据）
  - **Merge**（合并不同节点的数据流）
  - **Set**（手动设置数据字段）
  - **Split In Batches**（批量处理数据）

---

### 4️⃣ 逻辑控制节点
- 这些节点控制工作流的逻辑 **条件、循环、分支**。
- **常见的逻辑节点：**
  - **IF**（条件判断，类似于 `if-else`）
  - **Switch**（多条件分支，类似于 `switch-case`）
  - **Wait**（延迟执行）
  - **Loop**（循环执行）

---

### 5️⃣ 数据存储节点
- 这些节点用于 **读写数据库或文件**。
- **常见的存储节点：**
  - **MySQL**（操作 MySQL 数据库）
  - **PostgreSQL**（操作 PostgreSQL）
  - **Redis**（操作 Redis 缓存）
  - **Google Drive**（上传/下载文件）

---

### 6️⃣ AI & 机器学习节点
- 这些节点用于 **调用 AI 或 NLP 服务**。
- **常见的 AI 节点：**
  - **OpenAI GPT-4**（生成文本、分析数据）
  - **Google Vision**（图片识别）
  - **Hugging Face**（NLP 任务）

---

## 🚀 如何使用 n8n 节点？
1. **打开 n8n 编辑器**（本地或云端）
2. **添加一个节点**（点击 `+` 或 `Add Node`）
3. **配置节点**（根据需要填写 API Key、URL、条件等）
4. **连接多个节点**（形成一个自动化流程）
5. **运行 & 测试工作流**

---

## 💡 示例：使用 n8n 发送 Slack 消息
📍 场景：当有新用户注册时，自动在 Slack 发送通知。

```bash
1️⃣ Webhook Trigger → 监听新用户注册事件
2️⃣ Set → 提取用户数据（如姓名、邮箱）
3️⃣ Slack → 发送欢迎消息到 Slack
```

这样，每当有新用户注册时，Slack 就会收到消息 ✅

---

## 📌 结论
- **n8n 的节点是工作流的核心**，可以连接 API、处理数据、执行逻辑控制等。
- **不同类型的节点**（触发、API、数据处理、存储等）可以组合使用，实现强大的自动化功能。
- **可以使用 n8n GUI 轻松拖拽节点**，也可以通过 `Function` 节点编写自定义 JavaScript 代码。



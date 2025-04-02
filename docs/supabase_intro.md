# Supabase 简介

## 什么是 Supabase？
Supabase 是一个开源的 Firebase 替代方案，它基于 PostgreSQL 构建，并提供了一系列强大的功能，使开发者能够轻松搭建后端服务。Supabase 主要关注数据库、认证、存储和实时功能，旨在为开发者提供即用即开的后端解决方案。

## 核心特性

### 1. **PostgreSQL 数据库**
Supabase 以 PostgreSQL 作为核心数据库，支持完整的 SQL 查询，提供强大的数据处理能力。用户可以通过 Supabase 轻松管理数据库，并利用 PostgreSQL 的高级特性，如：
   - JSONB 支持
   - 行级安全策略（RLS）
   - 存储过程和触发器
   - 索引优化
   
### 2. **实时数据库（Realtime）**
Supabase 允许用户订阅数据库的变化，并实时同步数据。其 Realtime API 基于 PostgreSQL 的 `LISTEN` / `NOTIFY` 机制，实现了高效的 WebSocket 推送功能。

### 3. **用户认证（Auth）**
Supabase 提供了完整的用户认证和授权方案，包括：
   - 邮箱和密码登录
   - 第三方 OAuth（Google、GitHub、Apple 等）
   - Magic Link（无密码登录）
   - 自定义 JWT 支持
   - 行级安全策略（RLS）集成，确保数据访问安全

### 4. **云存储（Storage）**
Supabase 提供对象存储，支持：
   - 上传、下载和删除文件
   - 访问控制策略
   - 公有和私有文件权限
   - 直接与数据库和 RLS 集成

### 5. **自动生成 API**
Supabase 使用 PostgREST 自动为数据库生成 RESTful API，无需手动编写后端代码。API 支持：
   - RESTful 查询
   - 过滤、分页和排序
   - 行级安全策略（RLS）
   
### 6. **Edge Functions**
Supabase 允许开发者使用 JavaScript/TypeScript 编写边缘函数（Edge Functions），可以用于服务器端逻辑、Webhook 处理等。

### 7. **扩展插件支持**
Supabase 提供多个 PostgreSQL 扩展，如：
   - `pgvector`（支持 AI/机器学习的向量搜索）
   - `postgis`（地理空间数据库支持）
   - `pgcrypto`（加密功能）

## 与 Firebase 对比
| 特性            | Supabase                     | Firebase                      |
|----------------|-----------------------------|------------------------------|
| 数据库         | PostgreSQL                   | Firestore / Realtime Database |
| API           | 自动生成 RESTful API        | 需要手动创建 Cloud Functions |
| 认证          | 内置 Auth + RLS 支持        | Firebase Authentication       |
| 存储          | 对象存储                     | Firebase Storage              |
| 扩展性        | 支持 PostgreSQL 扩展        | 受 Firebase 限制              |
| 开源          | 是（MIT 许可）               | 否                             |

## 适用场景
Supabase 适用于以下应用场景：
- SaaS 应用
- 移动应用和 Web 应用后端
- 数据密集型应用
- AI/机器学习应用（支持 `pgvector`）
- 需要实时数据同步的应用

## 如何开始使用？
### 1. **创建项目**
在 [Supabase 官网](https://supabase.com/) 注册并创建新项目。

### 2. **连接数据库**
使用 Supabase 提供的 SQL 编辑器，创建表并添加数据。

### 3. **使用 Supabase API**
在前端应用中集成 Supabase SDK，例如：
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// 读取数据
const { data, error } = await supabase.from('users').select('*');
console.log(data, error);
```

### 4. **配置认证**
启用 Supabase Auth 并使用如下代码进行用户登录：
```javascript
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
console.log(user, error);
```

🔗 官方网站：[https://supabase.com/](https://supabase.com/)
🔗 GitHub：[https://github.com/supabase/supabase](https://github.com/supabase/supabase)


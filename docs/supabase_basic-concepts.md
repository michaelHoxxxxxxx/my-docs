# Supabase 基础概念

Supabase 是一个开源的后端即服务（BaaS）平台，提供数据库、认证、存储和实时数据功能。它基于 PostgreSQL 构建，旨在成为 Firebase 的开源替代方案。

本指南将详细介绍 Supabase 的核心概念，帮助你更好地理解它的工作原理。

---

## 1. 数据库（Database）

Supabase 使用 **PostgreSQL** 作为核心数据库，提供强大的 SQL 查询能力和数据管理功能。

### **1.1 表（Tables）**
表是数据库的基本存储单元，数据以行（Rows）和列（Columns）的形式存储。例如，一个 `users` 表可能包含以下字段：

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```

### **1.2 行级安全（RLS, Row Level Security）**
行级安全允许你基于用户身份控制数据访问权限。

启用 RLS：
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

示例策略：
```sql
CREATE POLICY "Enable user access" ON users
FOR SELECT USING (auth.uid() = id);
```

---

## 2. 认证（Auth）

Supabase Auth 提供完整的用户认证和授权机制，支持邮箱登录、OAuth（Google、GitHub）、Magic Link 等。

### **2.1 用户注册**
```javascript
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});
```

### **2.2 用户登录**
```javascript
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### **2.3 获取当前用户**
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log(user);
```

### **2.4 退出登录**
```javascript
await supabase.auth.signOut();
```

---

## 3. 存储（Storage）

Supabase Storage 允许你存储和管理文件，如用户头像、文档等。

### **3.1 创建存储桶**
在 Supabase Dashboard 创建存储桶（Public 或 Private）。

### **3.2 上传文件**
```javascript
const { data, error } = await supabase.storage.from('avatars').upload('user1.png', file);
```

### **3.3 获取文件 URL**
```javascript
const { data } = supabase.storage.from('avatars').getPublicUrl('user1.png');
console.log(data.publicURL);
```

---

## 4. 自动生成 API

Supabase 使用 **PostgREST** 自动为数据库生成 RESTful API。

### **4.1 查询数据**
```javascript
const { data, error } = await supabase.from('users').select('*');
```

### **4.2 过滤数据**
```javascript
const { data, error } = await supabase.from('users').select('*').eq('id', '123');
```

### **4.3 插入数据**
```javascript
const { data, error } = await supabase.from('users').insert([
  { name: 'Alice', email: 'alice@example.com' }
]);
```

---

## 5. 实时数据（Realtime）

Supabase 允许监听数据库表的变更，实现数据的实时更新。

### **5.1 订阅数据变化**
```javascript
const channel = supabase
  .channel('public:users')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

---

## 6. 边缘函数（Edge Functions）

Supabase 允许运行自定义的服务器端逻辑。

### **6.1 创建边缘函数**
```sh
supabase functions new hello-world
```

### **6.2 部署边缘函数**
```sh
supabase functions deploy hello-world
```

### **6.3 调用边缘函数**
```javascript
const { data, error } = await supabase.functions.invoke('hello-world');
console.log(data, error);
```

---

## 7. PostgreSQL 扩展（Extensions）

Supabase 允许启用 PostgreSQL 扩展，如 `pgvector`（AI 向量搜索）、`postgis`（地理空间支持）。

### **7.1 启用扩展**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

🔗 官方网站：[https://supabase.com/](https://supabase.com/)


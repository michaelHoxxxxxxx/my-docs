# SurrealDB基础概念

SurrealDB是一个创新的多模型数据库系统，它结合了关系型、文档型和图数据库的特点。本文档将介绍SurrealDB的基础概念，帮助您快速入门。

## 核心概念

### 命名空间（Namespace）

命名空间是SurrealDB中最高级别的组织单位，用于隔离不同的项目或应用程序。

```surql
USE NAMESPACE test;
```

### 数据库（Database）

数据库位于命名空间内，用于组织相关的表和数据。

```surql
USE NS test DB example;
```

### 表（Table）

表用于存储记录集合。在SurrealDB中，表名通常使用复数形式。

```surql
CREATE TABLE users;
```

### 记录（Record）

记录是存储在表中的数据项。每个记录都有一个唯一的ID，格式为`表名:ID`。

```surql
CREATE users:john CONTENT {
    name: "John Doe",
    email: "john@example.com",
    age: 30
};
```

### 记录ID

SurrealDB支持多种ID生成方式：

- **自定义ID**：`users:john`
- **UUID**：`users:⟨uuid⟩`
- **ULID**：`users:⟨ulid⟩`
- **自动递增**：`users:⟨1⟩, users:⟨2⟩, ...`

## 数据模型

### 字段类型

SurrealDB支持多种数据类型：

- **基本类型**：string, number, boolean, datetime, duration
- **结构化类型**：object, array
- **特殊类型**：record, geometry

### 嵌套数据

SurrealDB允许在记录中嵌套复杂的数据结构：

```surql
CREATE users:mary CONTENT {
    name: "Mary Smith",
    contact: {
        email: "mary@example.com",
        phone: "+1234567890"
    },
    interests: ["reading", "hiking", "photography"]
};
```

## 查询语言

SurrealDB使用SurrealQL作为查询语言，它结合了SQL的熟悉语法和NoSQL的灵活性。

### 基本操作

#### 创建记录

```surql
CREATE users CONTENT {
    name: "Alice Brown",
    age: 25
};
```

#### 查询记录

```surql
SELECT * FROM users WHERE age > 20;
```

#### 更新记录

```surql
UPDATE users:alice SET age = 26;
```

#### 删除记录

```surql
DELETE FROM users WHERE name = "Alice Brown";
```

### 高级查询功能

#### 子查询

```surql
SELECT *,
    (SELECT * FROM posts WHERE author = users.id) AS user_posts
FROM users;
```

#### 数组操作

```surql
SELECT * FROM users WHERE "hiking" IN interests;
```

#### 数学和统计函数

```surql
SELECT math::mean(age) AS average_age FROM users;
```

## 关系和图功能

SurrealDB的一个强大特性是其内置的图数据库功能。

### 定义关系

```surql
CREATE users:john CONTENT {
    name: "John Doe",
    friends: [->friendship->users:mary, ->friendship->users:alice]
};
```

### 图遍历

```surql
SELECT ->friendship->users FROM users:john;
```

### 递归查询

```surql
SELECT ->friendship->users->friendship->users AS friends_of_friends 
FROM users:john;
```

## 安全模型

### 用户和权限

SurrealDB提供细粒度的访问控制：

```surql
DEFINE USER admin ON DATABASE 
    PASSWORD "secure_password" 
    ROLES OWNER;
```

### 范围（Scope）

范围定义了特定类型用户可以执行的操作：

```surql
DEFINE SCOPE user_scope
    SESSION 24h
    SIGNUP (CREATE users SET email = $email, password = crypto::argon2::generate($password))
    SIGNIN (SELECT * FROM users WHERE email = $email AND crypto::argon2::compare(password, $password));
```

## 部署选项

SurrealDB提供多种部署选项：

### 内存模式

适用于开发和测试：

```bash
surreal start memory
```

### 文件模式

适用于单机部署：

```bash
surreal start file:/path/to/database
```

### 分布式模式

适用于生产环境：

```bash
surreal start --user root --pass root tikv://localhost:2379
```

## 事件和实时功能

SurrealDB支持实时数据更新和事件订阅：

```surql
LIVE SELECT * FROM users;
```


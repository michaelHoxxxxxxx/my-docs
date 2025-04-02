
## 安装指南

### 1. 通过 Docker 安装

```bash
docker run --rm -p 8000:8000 surrealdb/surrealdb start --log debug
```

### 2. 通过二进制文件安装

从官方 GitHub 下载最新版本的二进制文件，并赋予执行权限：

```bash
curl -L https://download.surrealdb.com | sh
chmod +x surreal
./surreal start --log debug
```

### 3. 通过 Homebrew 安装（Mac 用户）

```bash
brew install surrealdb/tap/surreal
```

## 快速开始

### 1. 连接数据库

```bash
surreal sql --conn http://localhost:8000
```

### 2. 创建数据库和表

```sql
USE NAMESPACE test_namespace DATABASE test_db;
CREATE TABLE users;
```

### 3. 插入数据

```sql
INSERT INTO users (id, name, age) VALUES ('user1', 'Alice', 30);
```

### 4. 查询数据

```sql
SELECT * FROM users;
```

### 5. 订阅数据变更

```javascript
const ws = new WebSocket('ws://localhost:8000/rpc');
ws.onmessage = (event) => {
  console.log('Data updated:', event.data);
};
```

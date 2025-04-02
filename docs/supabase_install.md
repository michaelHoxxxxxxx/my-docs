# 如何安装和配置 Supabase

Supabase 提供了一种简单易用的方式来管理后端服务。你可以选择直接使用 Supabase 云服务，也可以在本地运行 Supabase。下面是详细的安装和配置指南。

## 1. 使用 Supabase 云服务（推荐）

### **1.1 创建 Supabase 账户**

1. 打开 [Supabase 官网](https://supabase.com/) 。
2. 点击 **“Start your project”** 按钮。
3. 使用 GitHub 账号登录。
4. 创建一个新的项目，选择一个数据库区域（建议选择离你最近的区域）。
5. 记录下 `API URL` 和 `anon/public key`，后续会用到。

### **1.2 配置数据库**

1. 进入 **“Database”** 选项卡。
2. 使用 **“Table Editor”** 创建表，或直接运行 SQL 语句。
3. 你可以使用 SQL 编辑器执行以下示例命令，创建一个 `users` 表：
   
   ```sql
   CREATE TABLE users (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name TEXT NOT NULL,
       email TEXT UNIQUE NOT NULL,
       created_at TIMESTAMP DEFAULT now()
   );
   ```

4. 启用 **行级安全（RLS）** 以确保数据安全。

### **1.3 连接到你的应用**

在前端或后端应用中，你可以使用 Supabase SDK 连接数据库。

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// 读取数据
const { data, error } = await supabase.from('users').select('*');
console.log(data, error);
```

---

## 2. 在本地安装 Supabase（适用于本地开发）

如果你想在本地运行 Supabase，可以使用 Docker 进行安装。

### **2.1 安装 Docker 和 Supabase CLI**

#### **安装 Docker**（如果尚未安装）：
- [Windows 下载地址](https://www.docker.com/products/docker-desktop/)
- [macOS 下载地址](https://www.docker.com/products/docker-desktop/)
- Linux 用户可以使用 `apt` 或 `yum` 进行安装。

#### **安装 Supabase CLI**
在 macOS（Homebrew）：
```sh
brew install supabase/tap/supabase-cli
```

在 Linux 或 Windows（使用 npm）：
```sh
npm install -g supabase-cli
```

### **2.2 启动 Supabase 本地实例**

1. **初始化 Supabase 项目**
   ```sh
   supabase init
   ```
   这将在当前目录创建一个 `.supabase` 文件夹。

2. **启动 Supabase 本地服务**
   ```sh
   supabase start
   ```
   这将启动 PostgreSQL、Auth、Storage 和其他 Supabase 组件。

3. **检查运行状态**
   你可以通过访问 `http://localhost:54321` 来访问 Supabase API。

### **2.3 连接本地 Supabase**

你可以使用本地的 API 连接数据库：

```javascript
const supabase = createClient('http://localhost:54321', 'your-local-api-key');
```

---

## 3. 配置 Supabase 认证（Auth）

Supabase 允许使用邮件、OAuth（Google、GitHub 等）和 Magic Link 进行用户认证。

### **3.1 启用认证提供商**

1. 进入 Supabase Dashboard。
2. 选择 **“Authentication”** → **“Providers”**。
3. 启用所需的认证方式（例如 Google、GitHub）。
4. 配置 OAuth 回调 URL，例如：
   ```
   https://your-app-url.com/auth/callback
   ```

### **3.2 在前端应用中实现用户登录**

```javascript
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
console.log(user, error);
```

### **3.3 Magic Link 登录（无密码登录）**

```javascript
const { data, error } = await supabase.auth.signInWithOtp({ email: 'user@example.com' });
console.log(data, error);
```

---

## 4. 配置存储（Storage）

Supabase 允许你存储文件并设置访问权限。

### **4.1 创建存储桶**

1. 进入 **Storage** → **Create a new bucket**。
2. 选择 **Public** 或 **Private**（是否允许公开访问）。

### **4.2 上传文件**

```javascript
const { data, error } = await supabase.storage.from('avatars').upload('user1.png', file);
console.log(data, error);
```

### **4.3 获取文件 URL**

```javascript
const { data } = supabase.storage.from('avatars').getPublicUrl('user1.png');
console.log(data.publicURL);
```

---

## 5. 其他高级配置

### **5.1 配置 Realtime 数据库**

Supabase 允许订阅数据库表的变化。

```javascript
const channel = supabase
  .channel('public:users')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

### **5.2 配置 Edge Functions**

Supabase 允许在边缘服务器运行自定义逻辑。

1. **创建函数**
   ```sh
   supabase functions new hello-world
   ```

2. **编写 `functions/hello-world/index.ts`**
   ```typescript
   export default async function handler(req, res) {
     return res.status(200).json({ message: 'Hello, Supabase!' });
   }
   ```

3. **部署函数**
   ```sh
   supabase functions deploy hello-world
   ```

4. **调用函数**
   ```javascript
   const { data, error } = await supabase.functions.invoke('hello-world');
   console.log(data, error);
   ```

---



🔗 官方网站：[https://supabase.com/](https://supabase.com/)


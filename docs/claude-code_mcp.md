# Claude Code MCP 配置与使用

MCP (Model Context Protocol) 是 Claude Code 的核心功能之一，它允许 Claude 连接外部工具和数据源，大大扩展了 AI 助手的能力范围。

## MCP 简介

### 什么是 MCP？
MCP 是一个开放协议，让 Claude 能够：
- 连接数据库进行查询
- 访问 GitHub 仓库和 API
- 读写本地文件系统
- 调用第三方 API 服务

### 架构模式
```
Claude Code (客户端) ←→ MCP 服务器 ←→ 外部资源
```

## 基础配置

### 查看 MCP 选项
```bash
# 显示所有 MCP 命令
claude mcp

# 列出已配置的服务器
claude mcp list

# 查看特定服务器详情
claude mcp get <服务器名称>
```

### 添加 MCP 服务器
```bash
# 基础语法
claude mcp add <名称> <命令或URL> [参数...]

# 示例：添加文件系统服务器
claude mcp add filesystem npx @modelcontextprotocol/server-filesystem /path/to/directory

# 示例：添加数据库服务器
claude mcp add postgres npx @modelcontextprotocol/server-postgres postgresql://localhost/mydb
```

## GitHub MCP 配置

### 方法 1: 使用 Personal Access Token（推荐）

#### 步骤 1: 创建 GitHub Token
1. 访问 https://github.com/settings/tokens/new
2. 设置 Token 名称（如：Claude Code MCP）
3. 选择过期时间
4. 勾选权限：
   - `repo` (完整仓库访问)
   - `read:org` (读取组织信息)
   - `read:user` (读取用户信息)

#### 步骤 2: 配置 MCP
```bash
claude mcp add github npx @modelcontextprotocol/server-github --env GITHUB_TOKEN=your_token_here
```

### 方法 2: 使用 SSH Key

#### 步骤 1: 配置 SSH Config
```bash
# 编辑 ~/.ssh/config
Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_work

Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_personal
```

#### 步骤 2: 配置 MCP 使用特定 SSH Key
```bash
claude mcp add github-work npx @modelcontextprotocol/server-github --env GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_work"
```

#### 步骤 3: 验证连接
```bash
# 测试 SSH 连接
ssh -T git@github.com -i ~/.ssh/id_rsa_work

# 验证 MCP 状态
claude mcp list
```

## Git 多用户配置

### 条件包含配置（推荐）
```bash
# 在 ~/.gitconfig 中添加
[includeIf "gitdir:~/work-projects/"]
    path = ~/.gitconfig-work

[includeIf "gitdir:~/personal-projects/"]
    path = ~/.gitconfig-personal
```

### 创建专用配置文件
```bash
# ~/.gitconfig-work
[user]
    name = WorkUsername
    email = work@company.com

# ~/.gitconfig-personal  
[user]
    name = PersonalUsername
    email = personal@example.com
```

### 项目本地配置
```bash
# 在特定项目中设置
cd /path/to/project
git config --local user.name "ProjectSpecificName"
git config --local user.email "project@example.com"
```

## 常用 MCP 服务器

### 1. 文件系统服务器
```bash
# 访问本地文件
claude mcp add filesystem npx @modelcontextprotocol/server-filesystem ~/Documents

# 使用示例
"帮我读取 ~/Documents/config.json 文件内容"
```

### 2. PostgreSQL 数据库
```bash
# 连接数据库
claude mcp add postgres npx @modelcontextprotocol/server-postgres postgresql://localhost:5432/mydb

# 使用示例
"查询过去30天内的活跃用户数量"
"分析销售数据的趋势"
```

### 3. HTTP API 服务器
```bash
# 连接 REST API
claude mcp add api npx @modelcontextprotocol/server-http https://api.example.com

# 使用示例
"获取最新的汇率信息"
"查询天气预报"
```

## 配置作用域

### 三种作用域级别

1. **Local（默认）**: 仅当前项目
```bash
claude mcp add myserver command --scope local
```

2. **Project**: 团队共享（通过 .mcp.json）
```bash
claude mcp add myserver command --scope project
```

3. **User**: 所有项目可用
```bash
claude mcp add myserver command --scope global
```

### .mcp.json 配置文件
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "github": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## 实际使用示例

### GitHub 操作
```bash
# 查看仓库列表
"显示我的 GitHub 仓库列表"

# 分析代码提交
"分析我最近一周的提交记录"

# 创建 Issue
"在 my-project 仓库创建一个关于性能优化的 issue"
```

### 数据库查询
```bash
# 数据分析
"统计用户注册趋势"

# 性能分析
"找出执行最慢的 SQL 查询"

# 数据清理
"查找重复的用户记录"
```

### 文件操作
```bash
# 配置分析
"分析项目的 package.json 依赖"

# 日志分析
"查看最近的错误日志"

# 代码搜索
"在项目中搜索所有 TODO 注释"
```

## 故障排除

### 常见问题

#### 1. SSH 连接失败
```bash
# 检查 SSH key 权限
chmod 600 ~/.ssh/id_rsa_*
ssh-add ~/.ssh/id_rsa_work

# 测试连接
ssh -T git@github.com -i ~/.ssh/id_rsa_work
```

#### 2. MCP 服务器连接失败
```bash
# 检查服务器状态
claude mcp list

# 重新启动服务器
claude mcp remove problematic-server
claude mcp add problematic-server npx @modelcontextprotocol/server-xyz
```

#### 3. 权限问题
```bash
# 检查环境变量
echo $GITHUB_TOKEN
echo $DATABASE_URL

# 验证 Token 权限
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

#### 4. Git 用户身份错误
```bash
# 检查当前配置
git config --list --show-origin

# 验证条件包含
git config --show-origin user.name
git config --show-origin user.email
```

## 安全最佳实践

### 1. Token 管理
- 定期轮换 API Token
- 使用最小权限原则
- 不要在代码中硬编码 Token

### 2. SSH Key 管理
- 为不同用途使用不同的 SSH Key
- 定期更新 SSH Key
- 使用强密码保护私钥

### 3. 环境变量
```bash
# 使用 .env 文件（不要提交到版本控制）
echo "GITHUB_TOKEN=your_token" >> .env
echo "DATABASE_URL=postgresql://..." >> .env

# 加载环境变量
source .env
```

## 性能优化

### 1. 缓存配置
```bash
# 启用缓存
claude config set cache.enabled true
claude config set cache.ttl 3600

# 清理缓存
claude cache clear
```

### 2. 连接池
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "POOL_SIZE": "10",
        "POOL_TIMEOUT": "30000"
      }
    }
  }
}
```

## 下一步

MCP 配置完成后，你可以：
- [创建和使用专业化 Agent](claude-code_agents.md)
- [探索高级工作流](claude-code_advanced.md)
- [集成到 CI/CD 流程](claude-code_cicd.md)
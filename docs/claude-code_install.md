# Claude Code 安装与配置

本文档详细介绍了 Claude Code 的安装过程和基础配置方法。

## 系统要求

- **操作系统**: macOS, Linux, Windows
- **Node.js**: 版本 16 或更高
- **终端**: 支持现代终端功能
- **网络**: 需要互联网连接

## 安装方式

### 方式 1: npm 安装（推荐）
```bash
# 全局安装
npm install -g @anthropic/claude-code

# 验证安装
claude --version
```

### 方式 2: Homebrew（macOS）
```bash
# 添加 tap
brew tap anthropic/claude-code

# 安装
brew install claude-code
```

### 方式 3: 直接下载
```bash
# 下载最新版本
curl -L https://github.com/anthropics/claude-code/releases/latest/download/claude-code-macos -o claude-code

# 添加执行权限
chmod +x claude-code

# 移动到 PATH
sudo mv claude-code /usr/local/bin/
```

## 初始配置

### 1. 设置 API Key
```bash
# 设置 Anthropic API Key
export ANTHROPIC_API_KEY="your-api-key-here"

# 或者通过配置文件
claude config set api-key your-api-key-here
```

### 2. 基础配置
```bash
# 初始化配置
claude init

# 查看配置
claude config list

# 设置默认模型
claude config set default-model claude-3-sonnet
```

### 3. 验证安装
```bash
# 测试连接
claude --help

# 简单测试
claude "Hello, Claude!"
```

## 配置文件位置

### macOS
```
~/.claude/config.json
~/.claude/settings.json
```

### Linux
```
~/.config/claude/config.json
~/.config/claude/settings.json
```

### Windows
```
%APPDATA%\claude\config.json
%APPDATA%\claude\settings.json
```

## 环境变量

```bash
# API 配置
export ANTHROPIC_API_KEY="your-key"
export ANTHROPIC_BASE_URL="https://api.anthropic.com"

# Claude Code 配置
export CLAUDE_CONFIG_DIR="~/.claude"
export CLAUDE_CACHE_DIR="~/.claude/cache"
```

## 常见问题

### 权限问题
```bash
# 如果遇到权限错误
sudo chown -R $(whoami) ~/.claude
chmod 755 ~/.claude
```

### 代理配置
```bash
# 设置代理
claude config set proxy http://proxy.company.com:8080

# 设置认证代理
claude config set proxy http://user:pass@proxy.company.com:8080
```

### 清理缓存
```bash
# 清理所有缓存
claude cache clear

# 清理特定缓存
claude cache clear --type sessions
```

## 升级

### npm 升级
```bash
npm update -g @anthropic/claude-code
```

### Homebrew 升级
```bash
brew upgrade claude-code
```

### 手动升级
```bash
# 下载新版本并替换
curl -L https://github.com/anthropics/claude-code/releases/latest/download/claude-code-macos -o /usr/local/bin/claude-code
chmod +x /usr/local/bin/claude-code
```

## 配置验证

### 检查配置状态
```bash
# 运行诊断
claude doctor

# 检查连接
claude test-connection

# 验证权限
claude test-permissions
```

### 配置示例
```json
{
  "api_key": "your-api-key",
  "default_model": "claude-3-sonnet-20240229",
  "max_tokens": 4096,
  "temperature": 0.7,
  "timeout": 30000,
  "cache_enabled": true,
  "auto_save": true
}
```

## 下一步

配置完成后，你可以：
- [配置 MCP 连接外部服务](claude-code_mcp.md)
- [创建和使用 Agent](claude-code_agents.md)
- [探索高级功能](claude-code_advanced.md)
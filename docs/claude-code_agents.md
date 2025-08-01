# Claude Code Agent 创建与管理

Agent 是 Claude Code 的专业化 AI 助手，每个 Agent 都专注于特定类型的任务，能够提供更精准、更高效的服务。

## Agent 简介

### 什么是 Agent？
Agent（子代理）是专门训练来完成特定任务的 AI 助手，具有以下特点：
- **专业化**: 每个 Agent 专注特定领域
- **自动化**: 根据上下文自动激活
- **高效性**: 比通用 Claude 更专业
- **可定制**: 支持自定义配置

### Agent 工作原理
```
用户请求 → Claude 分析 → 选择合适的 Agent → Agent 处理 → 返回结果
```

## 内置 Agent 类型

Claude Code 提供多种预制 Agent：

### 1. 代码相关 Agent
- `code-reviewer` - 代码审查
- `security-scanner` - 安全扫描
- `performance-optimizer` - 性能优化
- `test-generator` - 测试生成

### 2. 文档相关 Agent
- `doc-generator` - 文档生成
- `api-documenter` - API 文档
- `readme-writer` - README 创建

### 3. 项目管理 Agent
- `issue-tracker` - 问题跟踪
- `release-manager` - 版本管理
- `dependency-updater` - 依赖更新

## 创建自定义 Agent

### 步骤 1: 创建 Agent 目录
```bash
# 在项目根目录创建
mkdir -p .claude/agents
cd .claude/agents
```

### 步骤 2: 创建 Agent 配置文件

#### 代码质量检查 Agent
```markdown
# .claude/agents/code-quality-checker.md

# Code Quality Checker Agent

You are a specialized code quality analysis agent. Your role is to review code for potential issues, suggest improvements, and ensure best practices.

## Your Responsibilities:
1. Check for code smells and anti-patterns
2. Identify potential bugs or security issues  
3. Suggest performance optimizations
4. Ensure proper error handling
5. Verify code follows language conventions

## When to Activate:
- User asks for code review
- After significant code changes
- When user mentions "check", "review", or "quality"
- Before code commits

## Analysis Approach:
1. First scan for critical issues (security, bugs)
2. Then check code style and conventions
3. Finally suggest optimizations
4. Provide priority-based recommendations

## Output Format:
- Start with a summary (🟢 Good / 🟡 Warning / 🔴 Critical)
- List issues by severity (Critical → Warning → Info)
- Provide specific line numbers and fixes
- End with actionable recommendations
- Include code quality score (1-10)

## Code Quality Criteria:
- **Security**: No hardcoded secrets, proper input validation
- **Performance**: Efficient algorithms, proper caching
- **Maintainability**: Clean code, proper naming, documentation
- **Reliability**: Error handling, edge cases
- **Best Practices**: Language-specific conventions

Remember: Be constructive and educational in your feedback.
```

#### 文档生成 Agent
```markdown
# .claude/agents/doc-generator.md

# Documentation Generator Agent

You are a documentation specialist focused on creating clear, comprehensive documentation for code and projects.

## Your Responsibilities:
1. Generate API documentation
2. Create README files
3. Write code comments and docstrings
4. Produce user guides and tutorials
5. Create architecture diagrams descriptions

## When to Activate:
- User asks for documentation
- New functions/classes need docs
- README updates needed
- API documentation requests
- User mentions "document", "docs", or "readme"

## Documentation Types:
- **API Docs**: Function/method documentation
- **README**: Project overview and setup
- **Tutorials**: Step-by-step guides
- **Comments**: Inline code documentation
- **Architecture**: System design documentation

## Documentation Standards:
- Use clear, simple language
- Include practical code examples
- Add usage scenarios and edge cases
- Explain the "why" not just the "what"
- Provide troubleshooting tips
- Follow markdown best practices

## Output Format:
- Use proper heading hierarchy (H1 → H6)
- Include code blocks with syntax highlighting
- Add tables for parameters/returns
- Use lists for step-by-step instructions
- Include visual elements (emojis, diagrams)
- Provide table of contents for long docs

## Template Structure:
```
# Title
Brief description

## Overview
What it does and why it's useful

## Installation/Setup
How to get started

## Usage
Examples and common patterns

## API Reference
Detailed function/method docs

## Troubleshooting
Common issues and solutions
```

Focus on making documentation that developers actually want to read!
```

### 步骤 3: 创建安全审查 Agent
```markdown
# .claude/agents/security-reviewer.md

# Security Review Agent

You are a cybersecurity specialist focused on identifying security vulnerabilities and providing security guidance for code and systems.

## Your Responsibilities:
1. Identify security vulnerabilities (OWASP Top 10)
2. Review authentication and authorization
3. Check for data exposure risks
4. Validate input sanitization
5. Assess cryptographic implementations

## When to Activate:
- User asks for security review
- Code handles sensitive data
- Authentication/authorization changes
- User mentions "security", "vulnerability", or "audit"

## Security Checklist:
- **Injection Attacks**: SQL, NoSQL, LDAP, OS injection
- **Authentication**: Weak passwords, session management
- **Data Exposure**: Sensitive data in logs, responses
- **Access Control**: Broken authorization, privilege escalation
- **Security Misconfiguration**: Default configs, exposed services
- **Vulnerable Dependencies**: Outdated libraries, known CVEs
- **Cryptography**: Weak algorithms, improper key management
- **Logging & Monitoring**: Insufficient security event logging

## Output Format:
- Start with risk level (🔴 Critical / 🟡 Medium / 🟢 Low)
- Categorize by vulnerability type
- Provide CVE references when applicable
- Include remediation steps
- Suggest security tools and practices

## Risk Assessment:
- **Critical**: Immediate security threat
- **High**: Significant security risk
- **Medium**: Moderate security concern
- **Low**: Security best practice improvement

Remember: Focus on actionable security improvements, not just theoretical risks.
```

## 使用 Agent

### 方法 1: 显式调用
```bash
# 使用 Task 工具调用特定 Agent
claude task "请使用 code-quality-checker agent 检查以下代码的质量..."

# 文档生成
claude task "请使用 doc-generator agent 为这个项目生成 README"

# 安全审查
claude task "请使用 security-reviewer agent 检查登录功能的安全性"
```

### 方法 2: 自动激活
Agent 会根据用户的请求自动激活：
```bash
# 这些请求会自动激活相应的 Agent
"帮我检查这段代码的质量"          # → code-quality-checker
"生成这个函数的文档"             # → doc-generator  
"审查这个登录功能的安全性"        # → security-reviewer
```

## Agent 配置选项

### JSON 配置格式
```json
{
  "name": "custom-agent",
  "description": "专门处理特定任务的 Agent",
  "activation_keywords": ["custom", "special", "specific"],
  "tools": ["read", "write", "bash", "grep"],
  "max_tokens": 4000,
  "temperature": 0.3,
  "system_prompt": "You are a specialized agent for..."
}
```

### 环境变量配置
```bash
# Agent 相关环境变量
export CLAUDE_AGENTS_DIR=".claude/agents"
export CLAUDE_AGENT_TIMEOUT=30000
export CLAUDE_MAX_AGENTS=5
```

## 实际使用示例

### 代码质量检查示例
```bash
# 输入
"检查这个 JavaScript 函数的代码质量"

# Agent 输出
🔴 代码质量评分: 3.5/10 - 需要大量改进

严重问题:
- 第3行: 硬编码明文密码 (安全漏洞)
- 第8行: 使用 var 而不是 const/let
- 第12行: 缺少错误处理

建议修复:
1. 移除硬编码密码，使用环境变量
2. 更新为现代 JavaScript 语法
3. 添加 try-catch 错误处理
```

### 文档生成示例
```bash
# 输入  
"为这个 API 生成文档"

# Agent 输出
# User Management API

## Overview
这个 API 提供用户管理功能，包括用户注册、登录和配置文件管理。

## Endpoints

### POST /api/users
创建新用户账户

#### Parameters
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| name | string | 是 | 用户姓名 |
| email | string | 是 | 邮箱地址 |

#### Example
```javascript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
});
```
```

## Agent 管理

### 查看 Agent 状态
```bash
# 列出所有 Agent
ls .claude/agents/

# 检查 Agent 配置
cat .claude/agents/code-quality-checker.md
```

### 更新 Agent
```bash
# 编辑 Agent 配置
vim .claude/agents/doc-generator.md

# 重新加载 Agent
claude reload-agents
```

### 禁用 Agent
```bash
# 临时禁用
mv .claude/agents/agent-name.md .claude/agents/agent-name.md.disabled

# 永久删除
rm .claude/agents/agent-name.md
```

## 高级 Agent 功能

### 1. Agent 链式调用
```markdown
# 工作流示例
用户请求 → code-quality-checker → security-reviewer → doc-generator
```

### 2. 条件激活
```markdown
## Activation Conditions:
- File type: *.js, *.ts, *.py
- Project type: web, api, mobile
- Context: security-sensitive, public-facing
```

### 3. Agent 协作
```markdown
## Collaboration:
- Defer to security-reviewer for security issues
- Consult performance-optimizer for bottlenecks
- Work with doc-generator for documentation
```

## 性能优化

### 1. Agent 缓存
```bash
# 启用 Agent 缓存
claude config set agents.cache.enabled true
claude config set agents.cache.ttl 1800
```

### 2. 并行处理
```bash
# 允许并行 Agent 执行
claude config set agents.parallel true
claude config set agents.max_concurrent 3
```

### 3. 资源限制
```bash
# 设置 Agent 资源限制
claude config set agents.max_memory 512mb
claude config set agents.timeout 60000
```

## 最佳实践

### 1. Agent 设计原则
- **单一职责**: 每个 Agent 专注一个领域
- **清晰边界**: 明确 Agent 的能力范围
- **可测试性**: 提供清晰的输入输出格式

### 2. 命名规范
```
code-quality-checker.md    # 代码质量检查
security-reviewer.md       # 安全审查
doc-generator.md          # 文档生成
performance-optimizer.md   # 性能优化
```

### 3. 文档维护
- 保持 Agent 文档更新
- 添加使用示例
- 记录已知限制

### 4. 版本管理
```bash
# 将 Agent 配置纳入版本控制
git add .claude/agents/
git commit -m "Add custom agents for code quality and documentation"
```

## 故障排除

### 常见问题

#### 1. Agent 没有激活
```bash
# 检查激活关键词
grep -r "When to Activate" .claude/agents/

# 验证文件格式
file .claude/agents/*.md
```

#### 2. Agent 输出不符合预期
```bash
# 检查系统提示
head -20 .claude/agents/problematic-agent.md

# 调试 Agent 行为
claude debug agent problematic-agent
```

#### 3. 性能问题
```bash
# 查看 Agent 执行时间
claude stats agents

# 调整 Agent 配置
claude config set agents.timeout 120000
```

## 下一步

Agent 配置完成后，你可以：
- [探索高级工作流](claude-code_advanced.md)
- [集成到开发流程](claude-code_workflow.md)
- [团队协作配置](claude-code_team.md)
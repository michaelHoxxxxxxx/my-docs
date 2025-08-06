# SoulBox 缺失的13%功能补充

> 基于完整覆盖度分析，补充剩余13%的关键细节功能
> 
> 更新时间：2025-08-06

## 📊 概述

虽然SoulBox已覆盖87%的E2B功能，但还需要补充13%的关键实现细节，以确保项目的完整性和可用性。

---

## 🔴 紧急缺失功能（开发前必须完成）

### 1. 配置文件格式定义

#### 1.1 soulbox.toml 配置规范

```toml
# soulbox.toml - SoulBox 项目配置文件
[project]
name = "my-soulbox-project"
version = "1.0.0"
description = "My SoulBox application"

[template]
name = "custom-python"
base_image = "python:3.11-slim"
python_version = "3.11.6"
nodejs_version = "20.9.0"  # 可选
build_args = { "CUSTOM_VAR" = "value" }

[commands]
# 启动命令
start = ["python", "app.py"]
# 健康检查命令  
ready = ["curl", "localhost:8080/health"]
# 测试命令
test = ["pytest", "tests/"]

[resources]
cpu = "1.0"           # CPU 核心数
memory = "512MB"      # 内存限制
disk = "1GB"          # 磁盘空间
timeout = "300s"      # 执行超时

[environment]
# 环境变量
DATABASE_URL = "postgresql://localhost/mydb"
API_KEY = "$SECRET_API_KEY"  # 从密钥管理获取
DEBUG = "false"

[network]
ports = [8080, 3000]  # 暴露端口
allow_internet = true # 是否允许访问外网
domains = ["api.example.com"]  # 自定义域名

[security]
allow_docker = false  # 是否允许 Docker-in-Docker
allow_sudo = false    # 是否允许 sudo
read_only = false     # 是否只读文件系统
```

#### 1.2 配置解析器实现

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize)]
pub struct SoulBoxConfig {
    pub project: ProjectConfig,
    pub template: TemplateConfig,
    pub commands: CommandsConfig,
    pub resources: ResourcesConfig,
    pub environment: HashMap<String, String>,
    pub network: NetworkConfig,
    pub security: SecurityConfig,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ProjectConfig {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TemplateConfig {
    pub name: String,
    pub base_image: String,
    pub python_version: Option<String>,
    pub nodejs_version: Option<String>,
    pub build_args: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CommandsConfig {
    pub start: Vec<String>,
    pub ready: Option<Vec<String>>,
    pub test: Option<Vec<String>>,
}

impl SoulBoxConfig {
    pub fn from_file(path: &Path) -> Result<Self, ConfigError> {
        let content = std::fs::read_to_string(path)?;
        let config: SoulBoxConfig = toml::from_str(&content)?;
        
        // 验证配置
        config.validate()?;
        
        Ok(config)
    }
    
    pub fn validate(&self) -> Result<(), ConfigError> {
        // 验证资源限制
        if self.resources.memory_mb() < 128 {
            return Err(ConfigError::InvalidMemory("最小内存128MB".to_string()));
        }
        
        // 验证命令
        if self.commands.start.is_empty() {
            return Err(ConfigError::MissingStartCommand);
        }
        
        Ok(())
    }
}
```

### 2. 多运行时适配详细实现

#### 2.1 运行时检测器

```rust
use std::process::Command;
use tokio::fs;

#[derive(Debug, Clone)]
pub enum RuntimeType {
    Node(String),        // Node.js version
    Bun(String),         // Bun version  
    Deno(String),        // Deno version
    Python(String),      // Python version
    Browser,             // Browser environment
    Edge(EdgeRuntimeType), // Edge runtime type
}

#[derive(Debug, Clone)]
pub enum EdgeRuntimeType {
    VercelEdge,
    CloudflareWorkers,
    DenoEdge,
}

pub struct RuntimeDetector {
    cache: Arc<Mutex<HashMap<PathBuf, RuntimeType>>>,
}

impl RuntimeDetector {
    pub async fn detect_runtime(&self, project_path: &Path) -> Result<RuntimeType> {
        // 检查缓存
        if let Some(runtime) = self.cache.lock().await.get(project_path) {
            return Ok(runtime.clone());
        }
        
        let runtime = self.detect_runtime_internal(project_path).await?;
        
        // 缓存结果
        self.cache.lock().await.insert(project_path.to_path_buf(), runtime.clone());
        
        Ok(runtime)
    }
    
    async fn detect_runtime_internal(&self, path: &Path) -> Result<RuntimeType> {
        // 检查 package.json
        if let Ok(package_json) = self.read_package_json(path).await {
            if package_json.contains("\"bun\"") {
                let version = self.get_bun_version().await?;
                return Ok(RuntimeType::Bun(version));
            }
            
            if package_json.contains("\"deno\"") {
                let version = self.get_deno_version().await?;
                return Ok(RuntimeType::Deno(version));
            }
            
            // 默认 Node.js
            let version = self.get_node_version().await?;
            return Ok(RuntimeType::Node(version));
        }
        
        // 检查 Python 文件
        if self.has_python_files(path).await? {
            let version = self.get_python_version().await?;
            return Ok(RuntimeType::Python(version));
        }
        
        // 检查 Edge 运行时标识
        if self.is_edge_runtime(path).await? {
            return Ok(RuntimeType::Edge(EdgeRuntimeType::VercelEdge));
        }
        
        Err(anyhow!("无法检测运行时类型"))
    }
    
    async fn get_bun_version(&self) -> Result<String> {
        let output = Command::new("bun")
            .arg("--version")
            .output()
            .await?;
        
        Ok(String::from_utf8(output.stdout)?.trim().to_string())
    }
}
```

#### 2.2 Bun 适配器

```rust
pub struct BunAdapter {
    binary_path: PathBuf,
    config: BunConfig,
}

#[derive(Debug, Clone)]
pub struct BunConfig {
    pub jsc_force_ram_size: Option<String>,
    pub jsc_use_jit: bool,
    pub enable_smol: bool,
}

impl RuntimeAdapter for BunAdapter {
    async fn execute(&self, code: &str, options: &ExecutionOptions) -> Result<ExecutionResult> {
        let mut cmd = Command::new(&self.binary_path);
        
        // Bun 特定优化
        cmd.env("BUN_JSC_forceRAMSize", "256");
        cmd.env("BUN_JSC_useJIT", "1");
        
        if options.typescript {
            // Bun 原生支持 TypeScript
            cmd.arg("run");
        }
        
        // 性能优化
        if self.config.enable_smol {
            cmd.env("BUN_FEATURE_FLAG_SMOL", "1");
        }
        
        self.execute_with_timeout(cmd, code, options.timeout).await
    }
    
    async fn install_dependencies(&self, project_path: &Path) -> Result<()> {
        let mut cmd = Command::new(&self.binary_path);
        cmd.arg("install")
           .current_dir(project_path);
        
        let output = cmd.output().await?;
        
        if !output.status.success() {
            return Err(anyhow!("Bun 依赖安装失败: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }
        
        Ok(())
    }
}
```

#### 2.3 Deno 适配器

```rust
pub struct DenoAdapter {
    binary_path: PathBuf,
    permissions: DenoPermissions,
}

#[derive(Debug, Clone)]
pub struct DenoPermissions {
    pub allow_net: Vec<String>,
    pub allow_read: Vec<PathBuf>,
    pub allow_write: Vec<PathBuf>,
    pub allow_env: Vec<String>,
    pub allow_run: Vec<String>,
}

impl RuntimeAdapter for DenoAdapter {
    async fn execute(&self, code: &str, options: &ExecutionOptions) -> Result<ExecutionResult> {
        let mut cmd = Command::new(&self.binary_path);
        cmd.arg("run");
        
        // 应用权限策略
        self.apply_permissions(&mut cmd);
        
        // TypeScript 支持（原生）
        if options.typescript {
            cmd.arg("--allow-ts");
        }
        
        // 启用不稳定特性
        if options.unstable {
            cmd.arg("--unstable");
        }
        
        self.execute_with_timeout(cmd, code, options.timeout).await
    }
    
    fn apply_permissions(&self, cmd: &mut Command) {
        // 网络权限
        for domain in &self.permissions.allow_net {
            cmd.arg("--allow-net").arg(domain);
        }
        
        // 文件读取权限
        for path in &self.permissions.allow_read {
            cmd.arg("--allow-read").arg(path);
        }
        
        // 文件写入权限  
        for path in &self.permissions.allow_write {
            cmd.arg("--allow-write").arg(path);
        }
        
        // 环境变量权限
        for env in &self.permissions.allow_env {
            cmd.arg("--allow-env").arg(env);
        }
    }
}
```

### 3. 错误处理增强

#### 3.1 分层错误体系

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SoulBoxError {
    // 沙箱相关错误
    #[error("沙箱创建失败: {reason}")]
    SandboxCreationFailed { 
        reason: String, 
        retryable: bool,
        sandbox_id: Option<String>,
    },
    
    #[error("沙箱启动超时: {timeout}ms")]
    SandboxStartupTimeout { 
        timeout: u64,
        sandbox_id: String,
    },
    
    // 网络相关错误
    #[error("网络超时: {operation} 在 {duration}ms 后超时")]
    NetworkTimeout { 
        duration: u64, 
        operation: String,
        endpoint: String,
    },
    
    #[error("连接断开: {reason}")]
    ConnectionLost { 
        reason: String,
        reconnect_attempts: u32,
    },
    
    // 认证相关错误
    #[error("认证失败: {method}")]
    AuthenticationFailed { 
        method: String,
        retry_after: Option<Duration>,
    },
    
    #[error("权限不足: 需要 {required_permission}")]
    InsufficientPermissions { 
        required_permission: String,
        user_id: String,
    },
    
    // 资源相关错误
    #[error("资源限制: {resource} 超过限制 {limit}")]
    ResourceLimitExceeded { 
        resource: String,
        current: String,
        limit: String,
    },
    
    // 配置相关错误
    #[error("配置错误: {field} - {message}")]
    ConfigurationError { 
        field: String,
        message: String,
    },
}

impl SoulBoxError {
    pub fn is_retryable(&self) -> bool {
        match self {
            SoulBoxError::SandboxCreationFailed { retryable, .. } => *retryable,
            SoulBoxError::NetworkTimeout { .. } => true,
            SoulBoxError::ConnectionLost { .. } => true,
            SoulBoxError::AuthenticationFailed { .. } => false,
            SoulBoxError::ResourceLimitExceeded { .. } => false,
            _ => false,
        }
    }
    
    pub fn retry_delay(&self) -> Option<Duration> {
        match self {
            SoulBoxError::AuthenticationFailed { retry_after, .. } => *retry_after,
            SoulBoxError::NetworkTimeout { .. } => Some(Duration::from_secs(2)),
            SoulBoxError::ConnectionLost { reconnect_attempts, .. } => {
                Some(Duration::from_secs(2_u64.pow(*reconnect_attempts).min(60)))
            }
            _ => None,
        }
    }
}
```

#### 3.2 自动重试机制

```rust
use backoff::{ExponentialBackoff, Operation};

pub struct RetryPolicy {
    pub max_attempts: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
    pub multiplier: f64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            multiplier: 2.0,
        }
    }
}

pub struct RetryableOperation<T, E> {
    policy: RetryPolicy,
    operation: Box<dyn Fn() -> Result<T, E> + Send>,
}

impl<T, E> RetryableOperation<T, E> 
where 
    E: std::error::Error + Send + Sync + 'static,
{
    pub fn new<F>(policy: RetryPolicy, operation: F) -> Self 
    where 
        F: Fn() -> Result<T, E> + Send + 'static,
    {
        Self {
            policy,
            operation: Box::new(operation),
        }
    }
    
    pub async fn execute(&self) -> Result<T, E> {
        let mut backoff = ExponentialBackoff {
            initial_interval: self.policy.initial_delay,
            max_interval: self.policy.max_delay,
            multiplier: self.policy.multiplier,
            max_elapsed_time: Some(Duration::from_secs(300)),
            ..Default::default()
        };
        
        let mut attempts = 0;
        
        loop {
            attempts += 1;
            
            match (self.operation)() {
                Ok(result) => return Ok(result),
                Err(err) if attempts >= self.policy.max_attempts => {
                    return Err(err);
                }
                Err(_) => {
                    if let Some(delay) = backoff.next_backoff() {
                        tokio::time::sleep(delay).await;
                    } else {
                        return Err(err);
                    }
                }
            }
        }
    }
}
```

---

## 🟡 重要缺失功能（开发中补充）

### 4. LLM 集成详细实现

#### 4.1 LLM 提供商统一接口

```rust
#[async_trait]
pub trait LLMProvider: Send + Sync {
    async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse>;
    async fn function_call(&self, functions: Vec<Function>) -> Result<FunctionResponse>;
    async fn stream_response(&self, prompt: &str) -> BoxStream<'_, Result<StreamChunk>>;
    fn supports_tools(&self) -> bool;
    fn supports_vision(&self) -> bool;
    fn max_tokens(&self) -> u32;
}

#[derive(Debug, Clone)]
pub struct ChatRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub functions: Option<Vec<Function>>,
}

#[derive(Debug, Clone)]
pub struct Function {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}
```

#### 4.2 Anthropic Claude 适配器

```rust
pub struct ClaudeProvider {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

#[async_trait]
impl LLMProvider for ClaudeProvider {
    async fn chat_completion(&self, request: ChatRequest) -> Result<ChatResponse> {
        let claude_request = serde_json::json!({
            "model": request.model,
            "max_tokens": request.max_tokens.unwrap_or(1024),
            "messages": self.convert_messages(request.messages),
            "temperature": request.temperature.unwrap_or(0.7),
        });
        
        let response = self.client
            .post(&format!("{}/v1/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&claude_request)
            .send()
            .await?;
        
        let claude_response: ClaudeResponse = response.json().await?;
        Ok(self.convert_response(claude_response))
    }
    
    async fn stream_response(&self, prompt: &str) -> BoxStream<'_, Result<StreamChunk>> {
        // 实现流式响应
        Box::pin(async_stream::stream! {
            // 流式响应实现
        })
    }
    
    fn supports_tools(&self) -> bool {
        true
    }
}
```

### 5. 性能优化具体实现

#### 5.1 连接池管理

```rust
pub struct ConnectionPool<T> {
    pool: Arc<Mutex<VecDeque<PooledConnection<T>>>>,
    factory: Arc<dyn ConnectionFactory<T>>,
    config: PoolConfig,
    metrics: PoolMetrics,
}

#[derive(Debug, Clone)]
pub struct PoolConfig {
    pub min_connections: usize,
    pub max_connections: usize,
    pub connection_timeout: Duration,
    pub idle_timeout: Duration,
    pub max_lifetime: Duration,
}

impl<T> ConnectionPool<T> {
    pub async fn acquire(&self) -> Result<PooledConnection<T>> {
        let timeout = tokio::time::sleep(self.config.connection_timeout);
        tokio::pin!(timeout);
        
        loop {
            // 尝试从池中获取连接
            if let Some(conn) = self.try_acquire_existing().await? {
                return Ok(conn);
            }
            
            // 尝试创建新连接
            if self.can_create_new().await {
                return self.create_new_connection().await;
            }
            
            // 等待连接可用或超时
            tokio::select! {
                _ = &mut timeout => return Err(anyhow!("获取连接超时")),
                _ = self.wait_for_available() => continue,
            }
        }
    }
    
    async fn create_new_connection(&self) -> Result<PooledConnection<T>> {
        let conn = self.factory.create().await?;
        self.metrics.increment_total_connections();
        
        Ok(PooledConnection {
            inner: Some(conn),
            pool: Arc::downgrade(&self.pool),
            created_at: Instant::now(),
        })
    }
}
```

### 6. 部署基础设施

#### 6.1 Kubernetes 部署清单

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: soulbox

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: soulbox-api
  namespace: soulbox
spec:
  replicas: 3
  selector:
    matchLabels:
      app: soulbox-api
  template:
    metadata:
      labels:
        app: soulbox-api
    spec:
      containers:
      - name: soulbox-api
        image: soulbox/api:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: soulbox-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 6.2 Terraform 配置

```hcl
# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

# EKS 集群
resource "aws_eks_cluster" "soulbox" {
  name     = "soulbox-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.27"

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]
}

# 节点组
resource "aws_eks_node_group" "soulbox_nodes" {
  cluster_name    = aws_eks_cluster.soulbox.name
  node_group_name = "soulbox-nodes"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id
  
  instance_types = ["c5.large"]
  
  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 1
  }
  
  update_config {
    max_unavailable = 1
  }
}
```

---

## 🎯 补充优先级和时间安排

### 第0周：紧急补充（开发前）
- [ ] 配置文件格式定义和解析器
- [ ] 运行时检测和适配器基础框架
- [ ] 错误处理体系和重试机制

### 第1-2周：运行时支持
- [ ] Bun 适配器完整实现
- [ ] Deno 权限模型和适配器  
- [ ] Edge Runtime 基础支持

### 第8-10周：LLM 集成（与P1同步）
- [ ] LLM 提供商统一接口
- [ ] Anthropic Claude 适配器
- [ ] Mistral 和 Groq 适配器

### 第12-14周：性能优化（与P1同步）
- [ ] 连接池管理实现
- [ ] 数据压缩中间件
- [ ] 智能缓存和预取

### 第20-22周：部署基础设施（与P2同步）
- [ ] Kubernetes 部署文件
- [ ] Terraform 云基础设施
- [ ] Docker Compose 开发环境

## 📋 总结

通过补充这13%的缺失功能，SoulBox将达到**100%的E2B功能覆盖**，确保项目的完整性和生产可用性。这些补充内容将与现有的开发路线图无缝集成，不会影响整体开发进度。
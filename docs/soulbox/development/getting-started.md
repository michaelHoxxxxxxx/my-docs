# SoulBox 快速开始指南

## 项目初始化

### 1. 创建工作区 Cargo.toml

```toml
[workspace]
members = [
    "soulbox-core",
    "soulbox-api", 
    "soulbox-client",
    "soulbox-py",
]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
license = "MIT OR Apache-2.0"
repository = "https://github.com/yourusername/soulbox"

[workspace.dependencies]
tokio = { version = "1.40", features = ["full"] }
async-trait = "0.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.10", features = ["v4", "serde"] }
thiserror = "1.0"
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
tonic = "0.12"
prost = "0.13"
nix = { version = "0.29", features = ["process", "mount", "sched", "signal"] }
```

### 2. 核心库 (soulbox-core/Cargo.toml)

```toml
[package]
name = "soulbox-core"
version.workspace = true
edition.workspace = true
authors.workspace = true
license.workspace = true

[dependencies]
tokio.workspace = true
async-trait.workspace = true
serde.workspace = true
serde_json.workspace = true
uuid.workspace = true
thiserror.workspace = true
anyhow.workspace = true
tracing.workspace = true
nix.workspace = true

# 文件系统
fuser = "0.14"
tempfile = "3.12"

# 安全
seccomp = "0.1"
caps = "0.5"

# 进程管理
libc = "0.2"
signal-hook = "0.3"

# 资源管理
cgroups-rs = "0.3"
procfs = "0.16"

[dev-dependencies]
tokio-test = "0.4"
tempdir = "0.3"
```

### 3. API 服务器 (soulbox-api/Cargo.toml)

```toml
[package]
name = "soulbox-api"
version.workspace = true
edition.workspace = true

[dependencies]
soulbox-core = { path = "../soulbox-core" }
tokio.workspace = true
tonic.workspace = true
prost.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true

# Web 框架
axum = "0.7"
tower = "0.5"
tower-http = { version = "0.5", features = ["cors", "trace"] }

# 认证
jsonwebtoken = "9.3"
argon2 = "0.5"

[build-dependencies]
tonic-build = "0.12"
```

### 4. Rust 客户端 (soulbox-client/Cargo.toml)

```toml
[package]
name = "soulbox-client"
version.workspace = true
edition.workspace = true

[dependencies]
tokio.workspace = true
tonic.workspace = true
prost.workspace = true
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true

# HTTP 客户端
reqwest = { version = "0.12", features = ["json", "stream"] }
futures = "0.3"
tokio-stream = "0.1"
```

### 5. Python 绑定 (soulbox-py/Cargo.toml)

```toml
[package]
name = "soulbox-py"
version.workspace = true
edition.workspace = true

[lib]
name = "soulbox"
crate-type = ["cdylib"]

[dependencies]
soulbox-core = { path = "../soulbox-core" }
soulbox-client = { path = "../soulbox-client" }
pyo3 = { version = "0.22", features = ["extension-module", "abi3-py38"] }
pyo3-asyncio = { version = "0.22", features = ["tokio-runtime"] }
tokio.workspace = true

[build-dependencies]
pyo3-build-config = "0.22"
```

## 核心代码实现示例

### 1. 沙箱错误定义 (soulbox-core/src/error.rs)

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SoulBoxError {
    #[error("Sandbox creation failed: {0}")]
    CreationFailed(String),
    
    #[error("Code execution failed: {0}")]
    ExecutionFailed(String),
    
    #[error("Security violation: {0}")]
    SecurityViolation(String),
    
    #[error("Resource limit exceeded: {0}")]
    ResourceLimitExceeded(String),
    
    #[error("IO operation failed: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Sandbox not found: {0}")]
    NotFound(uuid::Uuid),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    
    #[error("Timeout: operation took longer than {0:?}")]
    Timeout(std::time::Duration),
}

pub type Result<T> = std::result::Result<T, SoulBoxError>;
```

### 2. 语言支持枚举 (soulbox-core/src/language.rs)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Python,
    JavaScript,
    TypeScript,
    Ruby,
    Go,
    Rust,
    Java,
    CSharp,
    PHP,
    Shell,
    R,
    Julia,
}

impl Language {
    /// 获取语言对应的解释器命令
    /// 注：当前 get_interpreter() 返回 None 的语言不视为执行兼容
    pub fn get_interpreter(&self) -> Option<&'static str> {
        match self {
            Language::Python => Some("python3"),
            Language::JavaScript => Some("node"),
            Language::Ruby => Some("ruby"),
            Language::PHP => Some("php"),
            Language::Shell => Some("bash"),
            Language::R => Some("Rscript"),
            Language::Julia => Some("julia"),
            _ => None,  // TypeScript, Rust, Go, Java 等待适配
        }
    }
    
    pub fn get_file_extension(&self) -> &'static str {
        match self {
            Language::Python => "py",
            Language::JavaScript => "js",
            Language::TypeScript => "ts",
            Language::Ruby => "rb",
            Language::Go => "go",
            Language::Rust => "rs",
            Language::Java => "java",
            Language::CSharp => "cs",
            Language::PHP => "php",
            Language::Shell => "sh",
            Language::R => "r",
            Language::Julia => "jl",
        }
    }
}
```

### 3. 沙箱配置 (soulbox-core/src/config.rs)

```rust
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxConfig {
    /// 内存限制（字节）
    #[serde(default = "default_memory_limit")]
    pub memory_limit: u64,
    
    /// CPU 配额（0.0-1.0）
    #[serde(default = "default_cpu_quota")]
    pub cpu_quota: f32,
    
    /// 执行超时时间（默认超时 30s；API 层允许在不超过全局上限（60s）范围内覆盖）
    #[serde(with = "humantime_serde", default = "default_timeout")]
    pub timeout: Duration,
    
    /// 是否启用网络
    #[serde(default = "default_network_enabled")]
    pub network_enabled: bool,
    
    /// 是否启用持久化存储
    #[serde(default)]
    pub persistent_storage: bool,
    
    /// 最大进程数
    #[serde(default = "default_max_processes")]
    pub max_processes: u32,
    
    /// 最大文件大小（字节）
    #[serde(default = "default_max_file_size")]
    pub max_file_size: u64,
    
    /// 允许的系统调用白名单
    #[serde(default)]
    pub allowed_syscalls: Vec<String>,
    
    /// 环境变量
    #[serde(default)]
    pub env_vars: std::collections::HashMap<String, String>,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            memory_limit: default_memory_limit(),
            cpu_quota: default_cpu_quota(),
            timeout: default_timeout(),
            network_enabled: default_network_enabled(),
            persistent_storage: false,
            max_processes: default_max_processes(),
            max_file_size: default_max_file_size(),
            allowed_syscalls: vec![],
            env_vars: std::collections::HashMap::new(),
        }
    }
}

fn default_memory_limit() -> u64 {
    512 * 1024 * 1024 // 512MB
}

fn default_cpu_quota() -> f32 {
    0.5 // 50% CPU
}

fn default_timeout() -> Duration {
    Duration::from_secs(30)
}

fn default_network_enabled() -> bool {
    false
}

fn default_max_processes() -> u32 {
    10
}

fn default_max_file_size() -> u64 {
    50 * 1024 * 1024 // 50MB
}

impl SandboxConfig {
    pub fn builder() -> SandboxConfigBuilder {
        SandboxConfigBuilder::default()
    }
}

#[derive(Default)]
pub struct SandboxConfigBuilder {
    config: SandboxConfig,
}

impl SandboxConfigBuilder {
    pub fn memory_limit(mut self, limit: u64) -> Self {
        self.config.memory_limit = limit;
        self
    }
    
    pub fn cpu_quota(mut self, quota: f32) -> Self {
        self.config.cpu_quota = quota.clamp(0.0, 1.0);
        self
    }
    
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.config.timeout = timeout;
        self
    }
    
    pub fn enable_network(mut self) -> Self {
        self.config.network_enabled = true;
        self
    }
    
    pub fn build(self) -> SandboxConfig {
        self.config
    }
}
```

## 使用示例

### 基础使用

```rust
use soulbox::{SoulBox, SandboxConfig, Language};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    tracing_subscriber::fmt::init();
    
    // 创建沙箱配置
    let config = SandboxConfig::builder()
        .memory_limit(256 * 1024 * 1024) // 256MB
        .cpu_quota(0.25) // 25% CPU
        .timeout(std::time::Duration::from_secs(10))
        .build();
    
    // 创建沙箱
    let sandbox = SoulBox::create(config).await?;
    
    // 执行简单的 Python 代码
    let result = sandbox.execute_code(
        Language::Python,
        "print('Hello from SoulBox!')"
    ).await?;
    
    println!("输出: {}", result.stdout);
    
    Ok(())
}
```

### AI 集成示例

```rust
use soulbox::{SoulBox, Language};
use openai_api_rust::*;

async fn ai_code_execution() -> Result<(), Box<dyn std::error::Error>> {
    let openai = OpenAI::new("your-api-key");
    let sandbox = SoulBox::create_default().await?;
    
    // 让 AI 生成代码
    let prompt = "Write a Python function to calculate fibonacci numbers";
    let response = openai.complete(prompt).await?;
    
    // 在沙箱中执行 AI 生成的代码
    let result = sandbox.execute_code(Language::Python, &response).await?;
    
    println!("AI 生成的代码执行结果:\n{}", result.stdout);
    
    Ok(())
}
```

## 项目命令

```bash
# 创建项目
cargo new soulbox --bin
cd soulbox

# 初始化工作区
mkdir -p soulbox-{core,api,client,py}/src

# 构建项目
cargo build --workspace

# 运行测试
cargo test --workspace

# 运行示例
cargo run --example basic

# 构建 Python 包
cd soulbox-py
maturin develop --release

# 发布到 crates.io
cargo publish -p soulbox-core
cargo publish -p soulbox-client
```

## 下一步

1. 实现核心沙箱功能
2. 添加安全隔离机制  
3. 创建 gRPC API 定义
4. 实现流式执行支持
5. 编写全面的测试套件

这样，你就可以开始构建 SoulBox 了！这个 Rust 版本的代码执行沙箱将提供比 E2B 更高的性能和更强的安全性。
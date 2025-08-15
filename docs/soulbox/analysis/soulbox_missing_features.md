# SoulBox 遗漏功能补充

经过对 E2B 源代码的再次深入检查，发现以下功能需要补充到 SoulBox 设计中。

## 1. 健康检查端点

E2B 提供了 `/health` 端点用于检查沙箱状态。

### Rust 实现

```rust
use axum::{
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub sandbox_id: String,
    pub uptime_seconds: u64,
    pub version: String,
}

impl SoulBox {
    /// 健康检查
    pub async fn health_check(&self) -> Result<HealthResponse, SoulBoxError> {
        let uptime = self.started_at.elapsed()?.as_secs();
        
        Ok(HealthResponse {
            status: "healthy".to_string(),
            sandbox_id: self.id.to_string(),
            uptime_seconds: uptime,
            version: env!("CARGO_PKG_VERSION").to_string(),
        })
    }
}

// API 端点
pub async fn health_handler(
    State(sandbox): State<Arc<SoulBox>>,
) -> impl IntoResponse {
    match sandbox.health_check().await {
        Ok(health) => (StatusCode::OK, Json(health)),
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "unhealthy"
            }))
        ),
    }
}
```

## 2. 文件签名和安全 URL

E2B 支持生成带签名的上传/下载 URL，用于安全的文件传输。

### Rust 实现

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::Engine;

#[derive(Debug, Clone)]
pub struct FileSignature {
    pub signature: String,
    pub expiration: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct SignatureOptions {
    pub path: String,
    pub operation: FileOperation,
    pub user: Username,
    pub expiration_in_seconds: Option<u64>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FileOperation {
    Read,
    Write,
}

impl SoulBox {
    /// 生成文件操作签名
    pub async fn generate_signature(
        &self,
        opts: SignatureOptions,
    ) -> Result<FileSignature, SoulBoxError> {
        let secret = self.envd_access_token.as_ref()
            .ok_or(SoulBoxError::SecurityViolation("No access token".into()))?;
        
        let expiration = opts.expiration_in_seconds
            .map(|secs| Utc::now().timestamp() + secs as i64);
        
        // 构建签名内容
        let mut content = format!(
            "{}:{}:{}",
            opts.path,
            match opts.operation {
                FileOperation::Read => "read",
                FileOperation::Write => "write",
            },
            opts.user
        );
        
        if let Some(exp) = expiration {
            content.push_str(&format!(":{}", exp));
        }
        
        // 生成 HMAC 签名
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())?;
        mac.update(content.as_bytes());
        let signature = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(mac.finalize().into_bytes());
        
        Ok(FileSignature {
            signature,
            expiration,
        })
    }
    
    /// 生成安全的上传 URL
    pub async fn upload_url(
        &self,
        path: Option<&str>,
        opts: Option<SandboxUrlOpts>,
    ) -> Result<String, SoulBoxError> {
        let base_url = self.file_url(path, opts.as_ref().and_then(|o| o.user));
        
        if let Some(opts) = opts {
            if opts.use_signature {
                let sig_opts = SignatureOptions {
                    path: path.unwrap_or("").to_string(),
                    operation: FileOperation::Write,
                    user: opts.user.unwrap_or(Username::User),
                    expiration_in_seconds: opts.use_signature_expiration,
                };
                
                let signature = self.generate_signature(sig_opts).await?;
                let mut url = Url::parse(&base_url)?;
                
                url.query_pairs_mut()
                    .append_pair("signature", &signature.signature);
                
                if let Some(exp) = signature.expiration {
                    url.query_pairs_mut()
                        .append_pair("signature_expiration", &exp.to_string());
                }
                
                return Ok(url.to_string());
            }
        }
        
        Ok(base_url)
    }
}
```

## 3. 版本兼容性检查

E2B SDK 包含版本兼容性逻辑，确保客户端和服务端版本匹配。

### Rust 实现

```rust
use semver::{Version, VersionReq};

pub const ENVD_VERSION_RECURSIVE_WATCH: &str = "0.1.4";
pub const MIN_SUPPORTED_VERSION: &str = "0.1.0";
pub const CURRENT_API_VERSION: &str = "v1";

#[derive(Debug, Clone)]
pub struct VersionInfo {
    pub envd_version: Option<Version>,
    pub api_version: String,
    pub sdk_version: Version,
}

impl SoulBox {
    /// 检查版本兼容性
    pub fn check_version_compatibility(&self) -> Result<(), SoulBoxError> {
        if let Some(ref envd_version) = self.version_info.envd_version {
            let min_version = Version::parse(MIN_SUPPORTED_VERSION)?;
            
            if envd_version < &min_version {
                return Err(SoulBoxError::VersionMismatch(format!(
                    "Envd version {} is too old. Minimum supported version is {}",
                    envd_version, min_version
                )));
            }
            
            // 检查特定功能的版本要求
            if self.config.recursive_watch {
                let required = Version::parse(ENVD_VERSION_RECURSIVE_WATCH)?;
                if envd_version < &required {
                    return Err(SoulBoxError::FeatureNotSupported(format!(
                        "Recursive watch requires envd version {} or higher, current: {}",
                        required, envd_version
                    )));
                }
            }
        }
        
        Ok(())
    }
}
```

## 4. 自动暂停功能

E2B 支持在超时后自动暂停沙箱而不是终止。

### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutBehavior {
    pub auto_pause: bool,
    pub grace_period_ms: Option<u64>,
}

impl SoulBox {
    /// 设置超时行为
    pub async fn set_timeout_behavior(
        &self,
        timeout_ms: u64,
        behavior: TimeoutBehavior,
    ) -> Result<(), SoulBoxError> {
        // 取消现有的超时任务
        if let Some(handle) = self.timeout_handle.lock().await.take() {
            handle.abort();
        }
        
        let sandbox = self.clone();
        let handle = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(timeout_ms)).await;
            
            if behavior.auto_pause {
                // 如果有宽限期，先等待
                if let Some(grace) = behavior.grace_period_ms {
                    info!("Sandbox {} entering grace period of {}ms", 
                        sandbox.id, grace);
                    tokio::time::sleep(Duration::from_millis(grace)).await;
                }
                
                // 暂停而不是终止
                if let Err(e) = sandbox.pause().await {
                    error!("Failed to auto-pause sandbox: {}", e);
                } else {
                    info!("Sandbox {} auto-paused after timeout", sandbox.id);
                }
            } else {
                // 直接终止
                if let Err(e) = sandbox.terminate().await {
                    error!("Failed to terminate sandbox: {}", e);
                }
            }
        });
        
        *self.timeout_handle.lock().await = Some(handle);
        
        Ok(())
    }
}
```

## 5. 命令结果的部分输出获取

E2B 的 CommandHandle 支持在命令执行过程中获取部分输出。

### Rust 实现

```rust
use tokio::sync::watch;

pub struct CommandHandle {
    pid: u32,
    stdout: Arc<Mutex<String>>,
    stderr: Arc<Mutex<String>>,
    exit_code: watch::Receiver<Option<i32>>,
    result_tx: watch::Sender<Option<i32>>,
}

impl CommandHandle {
    /// 获取当前的 stdout（不等待命令完成）
    pub async fn get_stdout(&self) -> String {
        self.stdout.lock().await.clone()
    }
    
    /// 获取当前的 stderr（不等待命令完成）
    pub async fn get_stderr(&self) -> String {
        self.stderr.lock().await.clone()
    }
    
    /// 检查命令是否已完成
    pub fn is_finished(&self) -> bool {
        self.exit_code.borrow().is_some()
    }
    
    /// 获取当前退出码（如果命令已完成）
    pub fn exit_code(&self) -> Option<i32> {
        *self.exit_code.borrow()
    }
}
```

## 6. 连接重定向支持

E2B 在连接时支持重定向，这对于边缘运行时很重要。

### Rust 实现

```rust
use reqwest::{Client, redirect::Policy};

pub struct ConnectionConfig {
    // ... 其他字段
    pub follow_redirects: bool,
    pub max_redirects: usize,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            follow_redirects: true,
            max_redirects: 10,
            // ... 其他默认值
        }
    }
}

impl SoulBox {
    /// 创建 HTTP 客户端
    fn create_http_client(config: &ConnectionConfig) -> Result<Client, SoulBoxError> {
        let mut builder = Client::builder();
        
        if config.follow_redirects {
            builder = builder.redirect(Policy::limited(config.max_redirects));
        } else {
            builder = builder.redirect(Policy::none());
        }
        
        // 添加默认头部
        let mut headers = HeaderMap::new();
        if let Some(ref token) = config.access_token {
            headers.insert("X-Access-Token", HeaderValue::from_str(token)?);
        }
        
        Ok(builder
            .default_headers(headers)
            .timeout(Duration::from_millis(config.request_timeout_ms))
            .build()?)
    }
}
```

## 7. 沙箱刷新机制

E2B 支持刷新沙箱以延长其生命周期。

### Rust 实现

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshOptions {
    pub extend_by_ms: u64,
    pub max_duration_ms: Option<u64>,
}

impl SoulBox {
    /// 刷新沙箱，延长其生命周期
    pub async fn refresh(
        &self,
        opts: RefreshOptions,
    ) -> Result<DateTime<Utc>, SoulBoxError> {
        // 计算新的结束时间
        let current_end = self.end_at.lock().await;
        let new_end = *current_end + Duration::milliseconds(opts.extend_by_ms as i64);
        
        // 检查最大持续时间限制
        if let Some(max_duration) = opts.max_duration_ms {
            let max_end = self.started_at + Duration::milliseconds(max_duration as i64);
            if new_end > max_end {
                return Err(SoulBoxError::InvalidArgument(
                    "Cannot extend sandbox beyond maximum duration".into()
                ));
            }
        }
        
        // 更新超时
        self.set_timeout_internal(opts.extend_by_ms).await?;
        
        // 更新结束时间
        *self.end_at.lock().await = new_end;
        
        // 通知 API 服务器
        self.api_client.refresh_sandbox(&self.id, &new_end).await?;
        
        Ok(new_end)
    }
}
```

## 8. 沙箱指标详细信息

E2B 提供了详细的沙箱指标，包括 CPU、内存、网络等。

### Rust 实现

```rust
use sysinfo::{System, SystemExt, ProcessExt};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxMetric {
    pub timestamp: DateTime<Utc>,
    pub cpu_percent: f64,
    pub memory_bytes: u64,
    pub memory_percent: f64,
    pub disk_read_bytes: u64,
    pub disk_write_bytes: u64,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
    pub process_count: u32,
}

pub struct MetricsCollector {
    system: System,
    sandbox_id: Uuid,
    interval: Duration,
    metrics: Arc<Mutex<Vec<SandboxMetric>>>,
}

impl MetricsCollector {
    /// 开始收集指标
    pub fn start(sandbox_id: Uuid, interval: Duration) -> Self {
        let collector = Self {
            system: System::new_all(),
            sandbox_id,
            interval,
            metrics: Arc::new(Mutex::new(Vec::new())),
        };
        
        let metrics = collector.metrics.clone();
        let mut system = System::new_all();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(interval);
            
            loop {
                interval.tick().await;
                system.refresh_all();
                
                let metric = collect_sandbox_metrics(&system, sandbox_id);
                metrics.lock().await.push(metric);
                
                // 保留最近 1 小时的数据
                let cutoff = Utc::now() - Duration::hours(1);
                metrics.lock().await.retain(|m| m.timestamp > cutoff);
            }
        });
        
        collector
    }
    
    /// 获取指定时间范围的指标
    pub async fn get_metrics(
        &self,
        start: Option<DateTime<Utc>>,
        end: Option<DateTime<Utc>>,
    ) -> Vec<SandboxMetric> {
        let metrics = self.metrics.lock().await;
        
        metrics.iter()
            .filter(|m| {
                let after_start = start.map_or(true, |s| m.timestamp >= s);
                let before_end = end.map_or(true, |e| m.timestamp <= e);
                after_start && before_end
            })
            .cloned()
            .collect()
    }
}
```

## 9. 模板构建日志流

E2B 在构建模板时支持实时日志流。

### Rust 实现

```rust
use tokio::sync::mpsc;
use futures::stream::Stream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildLog {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub message: String,
    pub step: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

impl TemplateBuilder {
    /// 构建模板并流式返回日志
    pub fn build_stream(
        &self,
    ) -> (impl Stream<Item = BuildLog>, JoinHandle<Result<TemplateImage, SoulBoxError>>) {
        let (tx, rx) = mpsc::channel(100);
        let build_context = self.build_context.clone();
        let config = self.config.clone();
        
        let handle = tokio::spawn(async move {
            // Docker 构建命令
            let mut cmd = Command::new("docker");
            cmd.args(&[
                "build",
                "-t", &format!("soulbox/{}", config.id),
                "--progress", "plain",
                build_context.to_str().unwrap(),
            ]);
            
            let mut child = cmd
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()?;
            
            // 处理输出流
            let stdout = child.stdout.take().unwrap();
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            
            while let Some(line) = lines.next_line().await? {
                let log = parse_docker_build_log(&line);
                let _ = tx.send(log).await;
            }
            
            let status = child.wait().await?;
            if !status.success() {
                return Err(SoulBoxError::BuildFailed("Docker build failed".into()));
            }
            
            // 导出镜像
            let image = export_to_oci(&config.id).await?;
            Ok(image)
        });
        
        (ReceiverStream::new(rx), handle)
    }
}
```

## 10. 节点健康状态

E2B 跟踪沙箱运行的节点状态。

### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeStatus {
    Healthy,
    Degraded,
    Draining,
    Connecting,
    Unhealthy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub node_id: String,
    pub status: NodeStatus,
    pub cpu_count: u32,
    pub memory_mb: u32,
    pub available_cpu: f32,
    pub available_memory_mb: u32,
    pub sandbox_count: u32,
    pub region: String,
    pub last_health_check: DateTime<Utc>,
}

pub struct NodeManager {
    nodes: Arc<Mutex<HashMap<String, NodeInfo>>>,
}

impl NodeManager {
    /// 选择最佳节点来运行沙箱
    pub async fn select_node(
        &self,
        requirements: &SandboxConfig,
    ) -> Result<String, SoulBoxError> {
        let nodes = self.nodes.lock().await;
        
        let suitable_nodes: Vec<_> = nodes
            .values()
            .filter(|node| {
                node.status == NodeStatus::Healthy &&
                node.available_cpu >= requirements.cpu_quota &&
                node.available_memory_mb >= (requirements.memory_limit / 1024 / 1024) as u32
            })
            .collect();
        
        if suitable_nodes.is_empty() {
            return Err(SoulBoxError::NoAvailableNodes);
        }
        
        // 选择负载最低的节点
        let best_node = suitable_nodes
            .into_iter()
            .min_by_key(|node| node.sandbox_count)
            .unwrap();
        
        Ok(best_node.node_id.clone())
    }
}
```

## 总结

通过这次更深入的检查，我发现了以下 10 个遗漏的功能：

1. **健康检查端点** - 提供沙箱健康状态
2. **文件签名和安全 URL** - 安全的文件传输
3. **版本兼容性检查** - 确保客户端和服务端兼容
4. **自动暂停功能** - 超时后暂停而非终止
5. **命令部分输出** - 执行中获取输出
6. **连接重定向** - 支持边缘运行时
7. **沙箱刷新** - 延长生命周期
8. **详细指标收集** - CPU、内存、网络等
9. **构建日志流** - 实时模板构建日志
10. **节点健康管理** - 多节点负载均衡

这些功能使 SoulBox 成为一个真正完整的生产级代码执行沙箱系统。
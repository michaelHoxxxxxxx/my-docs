# SoulBox 高级功能补充

基于对 E2B 源代码的深入分析，本文档补充 SoulBox 设计中遗漏的重要功能。

## 1. PTY（伪终端）完整支持

E2B 提供了完整的 PTY 支持，这对于交互式终端应用至关重要。

### Rust 实现

```rust
use nix::pty::{openpty, OpenptyResult, Winsize};
use nix::unistd::{ForkResult, fork, setsid};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Clone)]
pub struct PtySize {
    pub cols: u16,
    pub rows: u16,
}

pub struct PtyHandle {
    master_fd: RawFd,
    process_handle: ProcessHandle,
    size: Arc<Mutex<PtySize>>,
}

impl SoulBox {
    /// 创建 PTY 会话
    pub async fn create_pty(
        &self,
        opts: PtyCreateOpts,
    ) -> Result<PtyHandle, SoulBoxError> {
        let winsize = Winsize {
            ws_row: opts.rows,
            ws_col: opts.cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        
        // 创建 PTY
        let OpenptyResult { master, slave } = openpty(Some(&winsize), None)?;
        
        match unsafe { fork() }? {
            ForkResult::Parent { child } => {
                // 父进程
                close(slave)?;
                
                let handle = PtyHandle {
                    master_fd: master,
                    process_handle: ProcessHandle::new(child),
                    size: Arc::new(Mutex::new(PtySize {
                        cols: opts.cols,
                        rows: opts.rows,
                    })),
                };
                
                // 启动数据流处理
                self.start_pty_stream(handle.clone(), opts.on_data).await?;
                
                Ok(handle)
            }
            ForkResult::Child => {
                // 子进程
                close(master)?;
                setsid()?;
                
                // 设置 PTY 为标准输入输出
                dup2(slave, 0)?;
                dup2(slave, 1)?;
                dup2(slave, 2)?;
                close(slave)?;
                
                // 执行 shell
                let shell = CString::new("/bin/bash")?;
                let args = vec![
                    CString::new("bash")?,
                    CString::new("-i")?,
                    CString::new("-l")?,
                ];
                
                execvp(&shell, &args)?;
                unreachable!()
            }
        }
    }
    
    /// 调整 PTY 大小
    pub async fn resize_pty(
        &self,
        handle: &PtyHandle,
        size: PtySize,
    ) -> Result<(), SoulBoxError> {
        let winsize = Winsize {
            ws_row: size.rows,
            ws_col: size.cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        
        // 更新 PTY 窗口大小
        unsafe {
            libc::ioctl(handle.master_fd, libc::TIOCSWINSZ, &winsize);
        }
        
        // 更新内部状态
        let mut current_size = handle.size.lock().await;
        *current_size = size;
        
        Ok(())
    }
}
```

## 2. 文件监听功能

E2B 支持文件系统监听，可以实时监控文件变化。

### Rust 实现

```rust
use notify::{Watcher, RecursiveMode, watcher, DebouncedEvent};
use std::sync::mpsc::{channel, Receiver};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileSystemEvent {
    Create(PathBuf),
    Write(PathBuf),
    Remove(PathBuf),
    Rename(PathBuf, PathBuf),
    Chmod(PathBuf),
}

pub struct WatchHandle {
    id: Uuid,
    watcher: Box<dyn Watcher>,
    receiver: Receiver<DebouncedEvent>,
}

impl SoulBox {
    /// 监听目录变化
    pub async fn watch_dir(
        &self,
        path: &Path,
        recursive: bool,
    ) -> Result<WatchHandle, SoulBoxError> {
        let (tx, rx) = channel();
        let mut watcher = watcher(tx, Duration::from_millis(100))?;
        
        let mode = if recursive {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        };
        
        watcher.watch(path, mode)?;
        
        Ok(WatchHandle {
            id: Uuid::new_v4(),
            watcher: Box::new(watcher),
            receiver: rx,
        })
    }
    
    /// 获取文件系统事件
    pub async fn get_fs_events(
        &self,
        handle: &mut WatchHandle,
    ) -> Result<Vec<FileSystemEvent>, SoulBoxError> {
        let mut events = Vec::new();
        
        // 非阻塞接收所有待处理事件
        while let Ok(event) = handle.receiver.try_recv() {
            match event {
                DebouncedEvent::Create(path) => {
                    events.push(FileSystemEvent::Create(path));
                }
                DebouncedEvent::Write(path) => {
                    events.push(FileSystemEvent::Write(path));
                }
                DebouncedEvent::Remove(path) => {
                    events.push(FileSystemEvent::Remove(path));
                }
                DebouncedEvent::Rename(from, to) => {
                    events.push(FileSystemEvent::Rename(from, to));
                }
                DebouncedEvent::Chmod(path) => {
                    events.push(FileSystemEvent::Chmod(path));
                }
                _ => {}
            }
        }
        
        Ok(events)
    }
}
```

## 3. 进程标签系统

E2B 支持给进程打标签，便于管理和查找。

### Rust 实现

```rust
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub config: ProcessConfig,
    pub tag: Option<String>,
    pub started_at: SystemTime,
    pub state: ProcessState,
}

#[derive(Debug, Clone)]
pub enum ProcessSelector {
    Pid(u32),
    Tag(String),
}

pub struct ProcessManager {
    processes: Arc<Mutex<HashMap<u32, ProcessInfo>>>,
    tags: Arc<Mutex<HashMap<String, u32>>>,
}

impl ProcessManager {
    /// 启动带标签的进程
    pub async fn start_tagged(
        &self,
        config: ProcessConfig,
        tag: Option<String>,
    ) -> Result<ProcessHandle, SoulBoxError> {
        let handle = self.start_process(config.clone()).await?;
        
        let info = ProcessInfo {
            pid: handle.pid(),
            config,
            tag: tag.clone(),
            started_at: SystemTime::now(),
            state: ProcessState::Running,
        };
        
        // 存储进程信息
        let mut processes = self.processes.lock().await;
        processes.insert(handle.pid(), info);
        
        // 存储标签映射
        if let Some(tag) = tag {
            let mut tags = self.tags.lock().await;
            tags.insert(tag, handle.pid());
        }
        
        Ok(handle)
    }
    
    /// 根据选择器查找进程
    pub async fn find_process(
        &self,
        selector: ProcessSelector,
    ) -> Result<ProcessInfo, SoulBoxError> {
        match selector {
            ProcessSelector::Pid(pid) => {
                let processes = self.processes.lock().await;
                processes.get(&pid)
                    .cloned()
                    .ok_or(SoulBoxError::ProcessNotFound)
            }
            ProcessSelector::Tag(tag) => {
                let tags = self.tags.lock().await;
                if let Some(&pid) = tags.get(&tag) {
                    let processes = self.processes.lock().await;
                    processes.get(&pid)
                        .cloned()
                        .ok_or(SoulBoxError::ProcessNotFound)
                } else {
                    Err(SoulBoxError::ProcessNotFound)
                }
            }
        }
    }
}
```

## 4. 沙箱元数据管理

E2B 支持为沙箱存储自定义元数据，便于查询和管理。

### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxMetadata {
    pub custom: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Vec<String>,
}

impl SoulBox {
    /// 设置沙箱元数据
    pub async fn set_metadata(
        &self,
        key: &str,
        value: &str,
    ) -> Result<(), SoulBoxError> {
        let mut metadata = self.metadata.lock().await;
        metadata.custom.insert(key.to_string(), value.to_string());
        metadata.updated_at = Utc::now();
        
        // 持久化元数据
        self.persist_metadata(&metadata).await?;
        
        Ok(())
    }
    
    /// 批量更新元数据
    pub async fn update_metadata(
        &self,
        updates: HashMap<String, String>,
    ) -> Result<(), SoulBoxError> {
        let mut metadata = self.metadata.lock().await;
        
        for (key, value) in updates {
            metadata.custom.insert(key, value);
        }
        
        metadata.updated_at = Utc::now();
        self.persist_metadata(&metadata).await?;
        
        Ok(())
    }
    
    /// 根据元数据查询沙箱
    pub async fn list_by_metadata(
        filters: HashMap<String, String>,
    ) -> Result<Vec<SandboxInfo>, SoulBoxError> {
        let sandboxes = Self::list_all().await?;
        
        Ok(sandboxes.into_iter()
            .filter(|sandbox| {
                filters.iter().all(|(key, value)| {
                    sandbox.metadata.custom.get(key) == Some(value)
                })
            })
            .collect())
    }
}
```

## 5. 沙箱暂停和恢复

E2B 支持暂停和恢复沙箱，这对于长时间运行的任务很有用。

### Rust 实现

```rust
use nix::sys::signal::{kill, Signal};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SandboxState {
    Running,
    Paused,
    Terminated,
}

impl SoulBox {
    /// 暂停沙箱
    pub async fn pause(&self) -> Result<(), SoulBoxError> {
        let mut state = self.state.lock().await;
        
        if *state != SandboxState::Running {
            return Err(SoulBoxError::InvalidState);
        }
        
        // 暂停所有进程
        let processes = self.process_manager.list_all().await?;
        for process in processes {
            kill(Pid::from_raw(process.pid as i32), Signal::SIGSTOP)?;
        }
        
        *state = SandboxState::Paused;
        
        // 停止资源计费
        self.metrics.pause_billing().await?;
        
        Ok(())
    }
    
    /// 恢复沙箱
    pub async fn resume(&self) -> Result<(), SoulBoxError> {
        let mut state = self.state.lock().await;
        
        if *state != SandboxState::Paused {
            return Err(SoulBoxError::InvalidState);
        }
        
        // 恢复所有进程
        let processes = self.process_manager.list_all().await?;
        for process in processes {
            kill(Pid::from_raw(process.pid as i32), Signal::SIGCONT)?;
        }
        
        *state = SandboxState::Running;
        
        // 恢复资源计费
        self.metrics.resume_billing().await?;
        
        Ok(())
    }
}
```

## 6. 高级网络功能

E2B 支持获取沙箱的网络信息，包括 URL 和端口映射。

### Rust 实现

```rust
use std::net::{IpAddr, SocketAddr};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub sandbox_url: String,
    pub port_mappings: HashMap<u16, u16>,
    pub internal_ip: IpAddr,
    pub hostname: String,
}

impl SoulBox {
    /// 获取沙箱 URL
    pub async fn get_sandbox_url(&self, port: u16) -> Result<String, SoulBoxError> {
        let network_info = self.network.as_ref()
            .ok_or(SoulBoxError::NetworkDisabled)?;
        
        let external_port = network_info.port_mappings.get(&port)
            .ok_or(SoulBoxError::PortNotMapped)?;
        
        Ok(format!("https://{}.sandbox.soulbox.dev:{}",
            self.id, external_port))
    }
    
    /// 暴露端口到外网
    pub async fn expose_port(
        &self,
        internal_port: u16,
    ) -> Result<u16, SoulBoxError> {
        let mut network = self.network.as_mut()
            .ok_or(SoulBoxError::NetworkDisabled)?;
        
        // 分配外部端口
        let external_port = self.allocate_external_port().await?;
        
        // 设置端口转发
        self.setup_port_forward(internal_port, external_port).await?;
        
        network.port_mappings.insert(internal_port, external_port);
        
        Ok(external_port)
    }
}
```

## 7. 模板管理系统

E2B 支持自定义沙箱模板，这是实现快速启动和预配置环境的关键。

### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateConfig {
    pub id: String,
    pub name: String,
    pub dockerfile: String,
    pub start_cmd: Option<String>,
    pub ready_cmd: Option<String>,
    pub cpu_count: u32,
    pub memory_mb: u32,
    pub env_vars: HashMap<String, String>,
}

pub struct TemplateBuilder {
    config: TemplateConfig,
    build_context: PathBuf,
}

impl TemplateBuilder {
    /// 构建沙箱模板
    pub async fn build(&self) -> Result<TemplateImage, SoulBoxError> {
        // 创建 Dockerfile
        let dockerfile_path = self.build_context.join("Dockerfile");
        fs::write(&dockerfile_path, &self.config.dockerfile).await?;
        
        // 运行 Docker 构建
        let output = Command::new("docker")
            .args(&[
                "build",
                "-t", &format!("soulbox/{}", self.config.id),
                "-f", dockerfile_path.to_str().unwrap(),
                self.build_context.to_str().unwrap(),
            ])
            .output()
            .await?;
        
        if !output.status.success() {
            return Err(SoulBoxError::BuildFailed(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }
        
        // 导出为 OCI 镜像
        let image = self.export_to_oci().await?;
        
        Ok(image)
    }
}
```

## 8. 沙箱连接重连机制

E2B 支持断线重连，保证连接的稳定性。

### Rust 实现

```rust
use tokio::time::{interval, Duration};
use backoff::{ExponentialBackoff, backoff::Backoff};

pub struct ReconnectableConnection {
    inner: Arc<Mutex<Option<Connection>>>,
    config: ConnectionConfig,
    reconnect_handle: Option<JoinHandle<()>>,
}

impl ReconnectableConnection {
    /// 启动自动重连
    pub async fn enable_auto_reconnect(&mut self) {
        let inner = self.inner.clone();
        let config = self.config.clone();
        
        let handle = tokio::spawn(async move {
            let mut backoff = ExponentialBackoff::default();
            let mut interval = interval(Duration::from_secs(5));
            
            loop {
                interval.tick().await;
                
                let needs_reconnect = {
                    let conn = inner.lock().await;
                    conn.is_none() || !conn.as_ref().unwrap().is_healthy().await
                };
                
                if needs_reconnect {
                    match Self::reconnect(&config).await {
                        Ok(new_conn) => {
                            let mut conn = inner.lock().await;
                            *conn = Some(new_conn);
                            backoff.reset();
                            info!("Successfully reconnected to sandbox");
                        }
                        Err(e) => {
                            if let Some(delay) = backoff.next_backoff() {
                                warn!("Reconnection failed: {}, retrying in {:?}", e, delay);
                                tokio::time::sleep(delay).await;
                            } else {
                                error!("Max reconnection attempts reached");
                                break;
                            }
                        }
                    }
                }
            }
        });
        
        self.reconnect_handle = Some(handle);
    }
}
```

## 9. 日志和指标收集

E2B 提供详细的日志和指标收集功能。

### Rust 实现

```rust
use prometheus::{Counter, Histogram, Registry};
use tracing_subscriber::layer::SubscriberExt;

#[derive(Debug, Clone)]
pub struct SandboxMetrics {
    pub cpu_usage: Arc<Mutex<f64>>,
    pub memory_usage: Arc<Mutex<u64>>,
    pub network_bytes_in: Counter,
    pub network_bytes_out: Counter,
    pub command_latency: Histogram,
    pub active_processes: Arc<Mutex<u32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxLog {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub message: String,
    pub source: String,
}

impl SoulBox {
    /// 设置日志收集
    pub fn setup_logging(&self) -> Result<(), SoulBoxError> {
        let log_writer = SandboxLogWriter::new(self.id.clone());
        
        let subscriber = tracing_subscriber::registry()
            .with(tracing_subscriber::fmt::layer()
                .with_writer(log_writer)
                .with_target(false)
                .json());
        
        tracing::subscriber::set_global_default(subscriber)?;
        
        Ok(())
    }
    
    /// 获取沙箱日志
    pub async fn get_logs(
        &self,
        since: Option<DateTime<Utc>>,
        limit: Option<usize>,
    ) -> Result<Vec<SandboxLog>, SoulBoxError> {
        let logs = self.log_store.query()
            .since(since.unwrap_or_else(|| Utc::now() - Duration::hours(1)))
            .limit(limit.unwrap_or(1000))
            .execute()
            .await?;
        
        Ok(logs)
    }
    
    /// 获取实时指标
    pub async fn get_metrics(&self) -> Result<SandboxMetrics, SoulBoxError> {
        let cpu = self.metrics.cpu_usage.lock().await;
        let memory = self.metrics.memory_usage.lock().await;
        let processes = self.metrics.active_processes.lock().await;
        
        Ok(SandboxMetrics {
            cpu_usage: *cpu,
            memory_usage: *memory,
            network_bytes_in: self.metrics.network_bytes_in.get(),
            network_bytes_out: self.metrics.network_bytes_out.get(),
            command_latency: self.metrics.command_latency.observe(0.0),
            active_processes: *processes,
        })
    }
}
```

## 10. CLI 工具设计

基于 E2B CLI 的设计，SoulBox 也需要提供强大的命令行工具。

### CLI 命令结构

```bash
# 认证相关
soulbox auth login
soulbox auth logout
soulbox auth info

# 沙箱管理
soulbox sandbox create [--template <id>] [--metadata <key=value>]
soulbox sandbox list [--filter <key=value>]
soulbox sandbox connect <sandbox-id>
soulbox sandbox kill <sandbox-id>
soulbox sandbox logs <sandbox-id> [--follow]
soulbox sandbox metrics <sandbox-id>

# 模板管理
soulbox template init
soulbox template build [--push]
soulbox template list
soulbox template delete <template-id>

# 进程管理
soulbox ps <sandbox-id>
soulbox exec <sandbox-id> <command>
soulbox kill <sandbox-id> <process-id>
```

## 总结

通过深入分析 E2B 的源代码，我们发现了以下关键功能需要补充到 SoulBox 的设计中：

1. **PTY 支持** - 完整的伪终端功能，支持交互式应用
2. **文件监听** - 实时监控文件系统变化
3. **进程标签** - 灵活的进程管理系统
4. **元数据管理** - 支持自定义元数据和查询
5. **暂停/恢复** - 沙箱生命周期的精细控制
6. **网络功能** - 端口映射和 URL 生成
7. **模板系统** - 自定义沙箱镜像
8. **断线重连** - 保证连接稳定性
9. **日志指标** - 完善的监控系统
10. **CLI 工具** - 用户友好的命令行界面

这些功能将使 SoulBox 成为一个功能完备、生产就绪的代码执行沙箱系统。
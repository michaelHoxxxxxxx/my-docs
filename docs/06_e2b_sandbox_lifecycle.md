# E2B 沙箱生命周期管理详解

本文档深入解析 E2B 沙箱的完整生命周期，包括创建、连接、管理、监控和销毁的全过程。

## 目录

1. [沙箱生命周期概述](#沙箱生命周期概述)
2. [沙箱创建阶段](#沙箱创建阶段)
3. [沙箱连接与重连](#沙箱连接与重连)
4. [沙箱状态管理](#沙箱状态管理)
5. [资源监控与限制](#资源监控与限制)
6. [沙箱销毁与清理](#沙箱销毁与清理)
7. [最佳实践指南](#最佳实践指南)

## 沙箱生命周期概述

### 1.1 生命周期状态图

```
   创建请求
      ↓
  ┌─────────┐    初始化    ┌─────────┐    就绪    ┌─────────┐
  │ PENDING │ ────────→  │STARTING │ ────────→ │ RUNNING │
  └─────────┘            └─────────┘           └─────────┘
      ↑                      ↑                      │
      │                      │                      │ 
      │                  超时/错误               使用中
      │                      │                      │
      │                      ↓                      ↓
  ┌─────────┐            ┌─────────┐            ┌─────────┐
  │ FAILED  │            │ ERROR   │            │ ACTIVE  │
  └─────────┘            └─────────┘            └─────────┘
      ↑                      ↑                      │
      │                      │                      │
      └──────────────────────┼──────────────────────┘
                             │ 闲置超时/手动销毁
                             ↓
                       ┌─────────┐
                       │DESTROYED│
                       └─────────┘
```

### 1.2 关键时间节点

- **创建时间**：通常 2-5 秒（冷启动）
- **重连时间**：< 100ms（热连接）
- **默认存活时间**：5 分钟（可配置）
- **销毁时间**：< 1 秒

## 沙箱创建阶段

### 2.1 基本创建流程

#### TypeScript 创建示例

```typescript
import { Sandbox } from '@e2b/code-interpreter'

// 基础创建
const sandbox = await Sandbox.create()

// 带配置的创建
const customSandbox = await Sandbox.create('python-data-science', {
  timeoutMs: 10 * 60 * 1000,  // 10分钟超时
  metadata: {
    userId: 'user123',
    sessionId: 'session456',
    environment: 'production'
  },
  apiKey: process.env.E2B_API_KEY
})
```

#### Python 创建示例

```python
from e2b_code_interpreter import Sandbox

# 基础创建（同步）
sandbox = Sandbox()

# 带配置的创建
custom_sandbox = Sandbox(
    template='python-data-science',
    timeout=10 * 60,  # 10分钟超时
    metadata={
        'user_id': 'user123',
        'session_id': 'session456',
        'environment': 'production'
    }
)

# 异步创建
from e2b_code_interpreter import AsyncSandbox

async def create_async_sandbox():
    sandbox = await AsyncSandbox.create(
        template='custom-template',
        timeout=15 * 60
    )
    return sandbox
```

### 2.2 创建过程详解

#### 创建步骤分析

```typescript
// E2B 内部创建流程（简化版）
static async create<S extends typeof Sandbox>(
  template?: string,
  opts?: SandboxOpts
): Promise<InstanceType<S>> {
  
  // 1. 验证参数和权限
  const config = new ConnectionConfig(opts)
  await this.validateApiKey(config.apiKey)
  
  // 2. 请求沙箱资源
  const sandboxRequest = {
    templateId: template || this.defaultTemplate,
    timeoutMs: opts?.timeoutMs ?? this.defaultSandboxTimeoutMs,
    metadata: opts?.metadata || {},
    resourceLimits: {
      cpuCores: opts?.cpuCores || 1,
      memoryMB: opts?.memoryMB || 512,
      diskMB: opts?.diskMB || 1024
    }
  }
  
  // 3. 等待沙箱分配
  const sandbox = await this.allocateSandbox(sandboxRequest)
  
  // 4. 建立连接
  const connection = await this.establishConnection(sandbox.id, config)
  
  // 5. 初始化沙箱环境
  await this.initializeSandbox(connection)
  
  // 6. 返回沙箱实例
  return new this({
    sandboxId: sandbox.id,
    connectionConfig: config,
    connection: connection
  })
}
```

#### 错误处理机制

```typescript
// 创建失败的错误处理
try {
  const sandbox = await Sandbox.create()
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('API Key 无效或已过期')
  } else if (error instanceof QuotaExceededError) {
    console.error('已达到沙箱数量限制')
  } else if (error instanceof TimeoutError) {
    console.error('沙箱创建超时')
  } else if (error instanceof ResourceUnavailableError) {
    console.error('暂无可用资源')
  }
}
```

### 2.3 模板系统

#### 预定义模板

```typescript
// 常用预定义模板
const templates = {
  'base': 'ubuntu-22.04',
  'python': 'python-3.11',
  'python-data-science': 'python-3.11-pandas-numpy-matplotlib',
  'node': 'node-18-lts',
  'python-ml': 'python-3.11-sklearn-tensorflow-pytorch'
}

// 使用特定模板
const pythonSandbox = await Sandbox.create('python-data-science')
```

#### 自定义模板

```typescript
// 使用自定义模板
const customSandbox = await Sandbox.create('my-custom-template', {
  // 自定义配置
  environmentVariables: {
    'CUSTOM_VAR': 'value',
    'DEBUG': 'true'
  }
})
```

## 沙箱连接与重连

### 3.1 连接机制

#### 新建连接

```typescript
// 直接创建新沙箱
const sandbox = await Sandbox.create()

// 获取沙箱信息
console.log('沙箱ID:', sandbox.id)
console.log('沙箱状态:', sandbox.status)
console.log('创建时间:', sandbox.createdAt)
```

#### 重连现有沙箱

```typescript
// 重连到现有沙箱
const existingSandbox = await Sandbox.connect('sandbox-id-123', {
  apiKey: process.env.E2B_API_KEY
})

// 验证连接状态
const isConnected = await existingSandbox.isAlive()
if (isConnected) {
  console.log('重连成功')
} else {
  console.log('沙箱已不存在或已销毁')
}
```

### 3.2 连接管理

#### 连接池实现

```typescript
class SandboxPool {
  private pool: Map<string, Sandbox> = new Map()
  private maxSize: number = 10
  
  async getSandbox(sessionId: string): Promise<Sandbox> {
    // 检查是否有现有沙箱
    if (this.pool.has(sessionId)) {
      const sandbox = this.pool.get(sessionId)!
      
      // 验证沙箱是否仍然活跃
      if (await sandbox.isAlive()) {
        return sandbox
      } else {
        // 移除失效的沙箱
        this.pool.delete(sessionId)
      }
    }
    
    // 创建新沙箱
    const sandbox = await Sandbox.create('python-data-science', {
      metadata: { sessionId },
      timeoutMs: 15 * 60 * 1000  // 15分钟
    })
    
    // 检查池大小限制
    if (this.pool.size >= this.maxSize) {
      // 移除最老的沙箱
      const oldestKey = this.pool.keys().next().value
      const oldestSandbox = this.pool.get(oldestKey)
      await oldestSandbox?.kill()
      this.pool.delete(oldestKey)
    }
    
    this.pool.set(sessionId, sandbox)
    return sandbox
  }
  
  async cleanup(): Promise<void> {
    for (const [sessionId, sandbox] of this.pool.entries()) {
      try {
        await sandbox.kill()
      } catch (error) {
        console.error(`清理沙箱 ${sessionId} 失败:`, error)
      }
    }
    this.pool.clear()
  }
}
```

#### 自动重连机制

```typescript
class ReconnectableSandbox {
  private sandbox: Sandbox | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  
  async ensureConnection(): Promise<Sandbox> {
    if (this.sandbox && await this.sandbox.isAlive()) {
      return this.sandbox
    }
    
    // 尝试重连
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        this.sandbox = await Sandbox.create()
        this.reconnectAttempts = 0  // 重置重连计数
        return this.sandbox
      } catch (error) {
        this.reconnectAttempts++
        console.warn(`重连尝试 ${this.reconnectAttempts} 失败:`, error)
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          // 指数退避延迟
          const delay = Math.pow(2, this.reconnectAttempts) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error('重连失败，已达到最大尝试次数')
  }
}
```

## 沙箱状态管理

### 4.1 状态监控

#### 实时状态查询

```typescript
class SandboxMonitor {
  private sandbox: Sandbox
  private statusCheckInterval: NodeJS.Timeout | null = null
  
  constructor(sandbox: Sandbox) {
    this.sandbox = sandbox
  }
  
  startMonitoring(intervalMs: number = 30000): void {
    this.statusCheckInterval = setInterval(async () => {
      try {
        const status = await this.checkStatus()
        this.handleStatusChange(status)
      } catch (error) {
        console.error('状态检查失败:', error)
      }
    }, intervalMs)
  }
  
  async checkStatus(): Promise<SandboxStatus> {
    const isAlive = await this.sandbox.isAlive()
    
    if (!isAlive) {
      return { state: 'DESTROYED', reason: 'timeout_or_manual' }
    }
    
    // 获取详细状态信息
    const stats = await this.sandbox.getStats()
    
    return {
      state: 'RUNNING',
      uptime: stats.uptime,
      cpuUsage: stats.cpuUsage,
      memoryUsage: stats.memoryUsage,
      diskUsage: stats.diskUsage,
      activeConnections: stats.activeConnections
    }
  }
  
  private handleStatusChange(status: SandboxStatus): void {
    switch (status.state) {
      case 'RUNNING':
        // 检查资源使用率
        if (status.cpuUsage > 0.9) {
          console.warn('CPU 使用率过高:', status.cpuUsage)
        }
        if (status.memoryUsage > 0.9) {
          console.warn('内存使用率过高:', status.memoryUsage)
        }
        break
        
      case 'DESTROYED':
        console.log('沙箱已销毁:', status.reason)
        this.stopMonitoring()
        break
    }
  }
  
  stopMonitoring(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval)
      this.statusCheckInterval = null
    }
  }
}
```

### 4.2 健康检查

```typescript
async function performHealthCheck(sandbox: Sandbox): Promise<HealthStatus> {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    checks: {
      connectivity: false,
      responsiveness: false,
      resourceAvailability: false,
      fileSystemAccess: false
    },
    overall: 'UNKNOWN' as 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN'
  }
  
  try {
    // 1. 连接性检查
    const startTime = Date.now()
    const isAlive = await sandbox.isAlive()
    const responseTime = Date.now() - startTime
    
    healthCheck.checks.connectivity = isAlive
    healthCheck.checks.responsiveness = responseTime < 5000  // 5秒内响应
    
    if (!isAlive) {
      healthCheck.overall = 'UNHEALTHY'
      return healthCheck
    }
    
    // 2. 简单代码执行检查
    const execution = await sandbox.runCode('print("health_check")', {
      timeout: 10000
    })
    healthCheck.checks.responsiveness = execution.exitCode === 0
    
    // 3. 文件系统检查
    const files = await sandbox.files.list('/')
    healthCheck.checks.fileSystemAccess = Array.isArray(files)
    
    // 4. 资源可用性检查
    const stats = await sandbox.getStats()
    healthCheck.checks.resourceAvailability = 
      stats.memoryUsage < 0.95 && stats.diskUsage < 0.95
    
    // 5. 综合评估
    const passedChecks = Object.values(healthCheck.checks).filter(Boolean).length
    const totalChecks = Object.keys(healthCheck.checks).length
    
    if (passedChecks === totalChecks) {
      healthCheck.overall = 'HEALTHY'
    } else if (passedChecks >= totalChecks * 0.75) {
      healthCheck.overall = 'DEGRADED'
    } else {
      healthCheck.overall = 'UNHEALTHY'
    }
    
  } catch (error) {
    console.error('健康检查失败:', error)
    healthCheck.overall = 'UNHEALTHY'
  }
  
  return healthCheck
}
```

## 资源监控与限制

### 5.1 资源配置

```typescript
// 创建时设置资源限制
const sandbox = await Sandbox.create('python-data-science', {
  resourceLimits: {
    cpuCores: 2,           // 2个CPU核心
    memoryMB: 1024,        // 1GB 内存
    diskMB: 2048,          // 2GB 磁盘空间
    networkBandwidthKbps: 10000,  // 10Mbps 网络带宽
    maxProcesses: 50,       // 最大进程数
    maxOpenFiles: 1000     // 最大打开文件数
  },
  executionLimits: {
    maxExecutionTimeMs: 30000,     // 单次代码执行最大30秒
    maxOutputSizeBytes: 10 * 1024 * 1024,  // 最大输出10MB
    maxConcurrentExecutions: 3      // 最大并发执行数
  }
})
```

### 5.2 实时监控

```typescript
class ResourceMonitor {
  private sandbox: Sandbox
  private metrics: ResourceMetrics[] = []
  private alertThresholds = {
    cpuUsage: 0.8,
    memoryUsage: 0.85,
    diskUsage: 0.9
  }
  
  async collectMetrics(): Promise<ResourceMetrics> {
    const stats = await this.sandbox.getStats()
    const timestamp = Date.now()
    
    const metrics: ResourceMetrics = {
      timestamp,
      cpu: {
        usage: stats.cpuUsage,
        cores: stats.cpuCores,
        loadAverage: stats.loadAverage
      },
      memory: {
        usage: stats.memoryUsage,
        totalMB: stats.memoryTotalMB,
        availableMB: stats.memoryAvailableMB,
        buffersMB: stats.memoryBuffersMB,
        cachedMB: stats.memoryCachedMB
      },
      disk: {
        usage: stats.diskUsage,
        totalMB: stats.diskTotalMB,
        availableMB: stats.diskAvailableMB,
        readIOPS: stats.diskReadIOPS,
        writeIOPS: stats.diskWriteIOPS
      },
      network: {
        bytesIn: stats.networkBytesIn,
        bytesOut: stats.networkBytesOut,
        packetsIn: stats.networkPacketsIn,
        packetsOut: stats.networkPacketsOut
      },
      processes: {
        count: stats.processCount,
        maxCount: stats.maxProcessCount
      }
    }
    
    this.metrics.push(metrics)
    this.checkAlerts(metrics)
    
    return metrics
  }
  
  private checkAlerts(metrics: ResourceMetrics): void {
    if (metrics.cpu.usage > this.alertThresholds.cpuUsage) {
      this.sendAlert('HIGH_CPU_USAGE', {
        current: metrics.cpu.usage,
        threshold: this.alertThresholds.cpuUsage
      })
    }
    
    if (metrics.memory.usage > this.alertThresholds.memoryUsage) {
      this.sendAlert('HIGH_MEMORY_USAGE', {
        current: metrics.memory.usage,
        threshold: this.alertThresholds.memoryUsage
      })
    }
    
    if (metrics.disk.usage > this.alertThresholds.diskUsage) {
      this.sendAlert('HIGH_DISK_USAGE', {
        current: metrics.disk.usage,
        threshold: this.alertThresholds.diskUsage
      })
    }
  }
  
  private sendAlert(type: string, data: any): void {
    console.warn(`[ALERT] ${type}:`, data)
    // 这里可以集成告警系统，如发送邮件、Slack 消息等
  }
}
```

## 沙箱销毁与清理

### 6.1 正常销毁

```typescript
// 手动销毁沙箱
async function destroySandbox(sandbox: Sandbox): Promise<void> {
  try {
    // 1. 停止所有正在执行的进程
    await sandbox.killAllProcesses()
    
    // 2. 清理临时文件
    await sandbox.files.remove('/tmp/*')
    
    // 3. 保存重要数据（如果需要）
    const importantFiles = await sandbox.files.list('/workspace')
    // 下载重要文件...
    
    // 4. 销毁沙箱
    await sandbox.kill()
    
    console.log('沙箱已成功销毁')
  } catch (error) {
    console.error('销毁沙箱时出错:', error)
  }
}
```

### 6.2 超时自动销毁

```typescript
class SandboxLifecycleManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private defaultTimeoutMs = 5 * 60 * 1000  // 5分钟
  
  trackSandbox(sandbox: Sandbox, timeoutMs?: number): void {
    const timeout = timeoutMs || this.defaultTimeoutMs
    
    const timer = setTimeout(async () => {
      try {
        console.log(`沙箱 ${sandbox.id} 超时，开始自动销毁`)
        await this.gracefulDestroy(sandbox)
      } catch (error) {
        console.error(`自动销毁沙箱 ${sandbox.id} 失败:`, error)
      }
    }, timeout)
    
    this.timers.set(sandbox.id, timer)
  }
  
  refreshTimeout(sandboxId: string, newTimeoutMs?: number): void {
    // 清除现有定时器
    const existingTimer = this.timers.get(sandboxId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // 设置新的定时器
    const timeout = newTimeoutMs || this.defaultTimeoutMs
    const timer = setTimeout(async () => {
      // 自动销毁逻辑
    }, timeout)
    
    this.timers.set(sandboxId, timer)
  }
  
  private async gracefulDestroy(sandbox: Sandbox): Promise<void> {
    // 优雅销毁逻辑
    try {
      // 1. 发送销毁前通知
      await this.notifyBeforeDestroy(sandbox)
      
      // 2. 等待当前执行完成（最多等待30秒）
      await this.waitForCurrentExecution(sandbox, 30000)
      
      // 3. 强制销毁
      await sandbox.kill()
      
      // 4. 清理定时器
      this.timers.delete(sandbox.id)
      
    } catch (error) {
      console.error('优雅销毁失败，执行强制销毁:', error)
      await sandbox.kill()
    }
  }
  
  private async waitForCurrentExecution(
    sandbox: Sandbox, 
    maxWaitMs: number
  ): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitMs) {
      const stats = await sandbox.getStats()
      if (stats.activeExecutions === 0) {
        return  // 没有活跃的执行，可以安全销毁
      }
      
      // 等待1秒后再检查
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}
```

### 6.3 批量清理

```typescript
class SandboxCleanupService {
  async cleanupInactiveSandboxes(): Promise<void> {
    try {
      // 1. 获取所有沙箱列表
      const allSandboxes = await Sandbox.list()
      
      // 2. 识别不活跃的沙箱
      const inactiveSandboxes = await this.identifyInactiveSandboxes(allSandboxes)
      
      // 3. 批量销毁
      const destroyPromises = inactiveSandboxes.map(sandbox => 
        this.destroySandboxSafely(sandbox)
      )
      
      const results = await Promise.allSettled(destroyPromises)
      
      // 4. 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      console.log(`清理完成: 成功 ${successful}, 失败 ${failed}`)
      
    } catch (error) {
      console.error('批量清理失败:', error)
    }
  }
  
  private async identifyInactiveSandboxes(
    sandboxes: SandboxInfo[]
  ): Promise<SandboxInfo[]> {
    const inactive: SandboxInfo[] = []
    const inactiveThresholdMs = 30 * 60 * 1000  // 30分钟不活跃
    
    for (const sandboxInfo of sandboxes) {
      try {
        const sandbox = await Sandbox.connect(sandboxInfo.id)
        const stats = await sandbox.getStats()
        
        const isInactive = 
          stats.lastActivityTime && 
          (Date.now() - stats.lastActivityTime) > inactiveThresholdMs
        
        if (isInactive) {
          inactive.push(sandboxInfo)
        }
      } catch (error) {
        // 连接失败的沙箱也认为是不活跃的
        inactive.push(sandboxInfo)
      }
    }
    
    return inactive
  }
  
  private async destroySandboxSafely(sandboxInfo: SandboxInfo): Promise<void> {
    try {
      const sandbox = await Sandbox.connect(sandboxInfo.id)
      await sandbox.kill()
    } catch (error) {
      console.warn(`销毁沙箱 ${sandboxInfo.id} 失败:`, error)
      // 可以记录到日志系统进行后续处理
    }
  }
}
```

## 最佳实践指南

### 7.1 生产环境配置

```typescript
// 生产环境沙箱配置
const productionSandboxConfig = {
  // 基础配置
  template: 'python-production',
  timeoutMs: 30 * 60 * 1000,  // 30分钟超时
  
  // 资源限制
  resourceLimits: {
    cpuCores: 2,
    memoryMB: 2048,
    diskMB: 4096,
    maxProcesses: 100
  },
  
  // 安全配置
  securityConfig: {
    enableNetworkAccess: false,  // 禁用网络访问
    allowedDomains: ['api.trusted-service.com'],  // 白名单域名
    enableFileSystemWrite: true,
    maxFileSize: 100 * 1024 * 1024  // 100MB 文件大小限制
  },
  
  // 监控配置
  monitoring: {
    enableMetrics: true,
    metricsInterval: 30000,
    enableAlerts: true,
    alertWebhook: 'https://monitoring.company.com/webhook'
  },
  
  // 元数据
  metadata: {
    environment: 'production',
    version: '1.0.0',
    owner: 'ai-service',
    costCenter: 'engineering'
  }
}
```

### 7.2 错误恢复策略

```typescript
class RobustSandboxManager {
  private fallbackTemplates = ['python-basic', 'python-minimal']
  private maxRetries = 3
  
  async createRobustSandbox(
    preferredTemplate: string,
    options: SandboxOpts
  ): Promise<Sandbox> {
    const templates = [preferredTemplate, ...this.fallbackTemplates]
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]
      
      for (let retry = 0; retry < this.maxRetries; retry++) {
        try {
          const sandbox = await Sandbox.create(template, {
            ...options,
            timeoutMs: Math.min(options.timeoutMs || 300000, 300000)  // 最大5分钟
          })
          
          // 验证沙箱是否正常工作
          await this.validateSandbox(sandbox)
          
          console.log(`成功创建沙箱，使用模板: ${template}`)
          return sandbox
          
        } catch (error) {
          console.warn(
            `模板 ${template} 创建失败 (尝试 ${retry + 1}/${this.maxRetries}):`, 
            error.message
          )
          
          if (retry === this.maxRetries - 1) {
            console.error(`模板 ${template} 彻底失败，尝试下一个模板`)
          } else {
            // 指数退避
            const delay = Math.pow(2, retry) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
    }
    
    throw new Error('所有模板都创建失败')
  }
  
  private async validateSandbox(sandbox: Sandbox): Promise<void> {
    // 基础验证测试
    const execution = await sandbox.runCode('print("validation_test")', {
      timeout: 5000
    })
    
    if (execution.exitCode !== 0) {
      throw new Error('沙箱验证失败：基础代码执行异常')
    }
    
    if (!execution.logs.stdout.includes('validation_test')) {
      throw new Error('沙箱验证失败：输出不匹配')
    }
  }
}
```

### 7.3 性能优化

```typescript
class OptimizedSandboxPool {
  private warmPool: Sandbox[] = []
  private coldPool: Sandbox[] = []
  private maxWarmSize = 5
  private maxColdSize = 10
  private warmupInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.startWarmupProcess()
  }
  
  async getSandbox(): Promise<Sandbox> {
    // 优先使用预热的沙箱
    if (this.warmPool.length > 0) {
      const sandbox = this.warmPool.pop()!
      this.triggerWarmup()  // 异步补充预热池
      return sandbox
    }
    
    // 使用冷沙箱
    if (this.coldPool.length > 0) {
      const sandbox = this.coldPool.pop()!
      await this.warmupSandbox(sandbox)
      return sandbox
    }
    
    // 创建新沙箱
    const sandbox = await Sandbox.create()
    await this.warmupSandbox(sandbox)
    return sandbox
  }
  
  private async warmupSandbox(sandbox: Sandbox): Promise<void> {
    // 预热操作：执行一些常用的初始化代码
    await sandbox.runCode('import sys, os, json, datetime')
    await sandbox.runCode('print("Sandbox warmed up")')
  }
  
  private startWarmupProcess(): void {
    this.warmupInterval = setInterval(async () => {
      await this.maintainPools()
    }, 60000)  // 每分钟检查一次
  }
  
  private async maintainPools(): Promise<void> {
    // 维护预热池
    while (this.warmPool.length < this.maxWarmSize) {
      try {
        const sandbox = await Sandbox.create()
        await this.warmupSandbox(sandbox)
        this.warmPool.push(sandbox)
      } catch (error) {
        console.error('预热池补充失败:', error)
        break
      }
    }
    
    // 维护冷池
    while (this.coldPool.length < this.maxColdSize) {
      try {
        const sandbox = await Sandbox.create()
        this.coldPool.push(sandbox)
      } catch (error) {
        console.error('冷池补充失败:', error)
        break
      }
    }
  }
  
  async shutdown(): Promise<void> {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval)
    }
    
    // 清理所有沙箱
    const allSandboxes = [...this.warmPool, ...this.coldPool]
    await Promise.all(allSandboxes.map(s => s.kill()))
    
    this.warmPool = []
    this.coldPool = []
  }
}
```

## 总结

E2B 沙箱生命周期管理是一个复杂的系统工程，涉及创建、连接、监控、资源管理和销毁等多个环节。通过合理的架构设计和最佳实践，可以构建出高可用、高性能的沙箱服务：

### 关键要点

1. **资源规划**：合理配置 CPU、内存、磁盘等资源限制
2. **连接管理**：实现连接池和自动重连机制
3. **状态监控**：实时监控沙箱状态和资源使用情况
4. **优雅销毁**：确保沙箱销毁时的数据安全和资源清理
5. **错误处理**：完善的错误恢复和重试机制
6. **性能优化**：使用预热池和缓存策略提升响应速度

### 生产环境建议

1. **监控告警**：建立完善的监控和告警体系
2. **资源配额**：设置合理的资源配额和限制
3. **安全隔离**：确保沙箱间的完全隔离
4. **备份恢复**：关键数据的备份和恢复策略
5. **性能调优**：根据实际负载调整池大小和配置参数

通过这些实践，可以确保 E2B 沙箱服务在生产环境中的稳定性和可靠性。
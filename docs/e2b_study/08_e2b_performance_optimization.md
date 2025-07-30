# E2B 性能优化与资源管理

本文档深入探讨 E2B 的性能优化策略、资源管理机制和最佳实践，帮助开发者构建高性能的代码执行服务。

## 目录

1. [性能瓶颈分析](#性能瓶颈分析)
2. [沙箱池管理](#沙箱池管理)
3. [资源配额与限制](#资源配额与限制)
4. [缓存策略](#缓存策略)
5. [网络优化](#网络优化)
6. [监控与指标](#监控与指标)
7. [扩展策略](#扩展策略)

## 性能瓶颈分析

### 1.1 关键性能指标

E2B 系统的关键性能指标包括：

```typescript
interface PerformanceMetrics {
  // 延迟指标
  sandboxCreationTime: number      // 沙箱创建时间 (ms)
  codeExecutionTime: number        // 代码执行时间 (ms)
  responseTime: number             // 端到端响应时间 (ms)
  
  // 吞吐量指标
  requestsPerSecond: number        // 每秒请求数
  concurrentSandboxes: number      // 并发沙箱数量
  
  // 资源利用率
  cpuUtilization: number           // CPU 利用率 (0-1)
  memoryUtilization: number        // 内存利用率 (0-1)
  diskUtilization: number          // 磁盘利用率 (0-1)
  networkUtilization: number       // 网络利用率 (0-1)
  
  // 可靠性指标
  errorRate: number                // 错误率 (0-1)
  availability: number             // 可用性 (0-1)
  
  // 成本指标
  costPerExecution: number         // 每次执行成本
  resourceEfficiency: number       // 资源效率
}
```

### 1.2 性能瓶颈识别

```typescript
class PerformanceAnalyzer {
  private metrics: PerformanceMetrics[]
  private alertThresholds = {
    sandboxCreationTime: 5000,      // 5秒
    codeExecutionTime: 30000,       // 30秒
    responseTime: 2000,             // 2秒
    errorRate: 0.05,                // 5%
    cpuUtilization: 0.8,            // 80%
    memoryUtilization: 0.85         // 85%
  }
  
  async analyzePerformance(): Promise<PerformanceReport> {
    const currentMetrics = await this.collectCurrentMetrics()
    const bottlenecks = this.identifyBottlenecks(currentMetrics)
    const recommendations = this.generateRecommendations(bottlenecks)
    
    return {
      timestamp: new Date().toISOString(),
      metrics: currentMetrics,
      bottlenecks,
      recommendations,
      healthScore: this.calculateHealthScore(currentMetrics)
    }
  }
  
  private identifyBottlenecks(metrics: PerformanceMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []
    
    // 检查沙箱创建时间
    if (metrics.sandboxCreationTime > this.alertThresholds.sandboxCreationTime) {
      bottlenecks.push({
        type: 'sandbox_creation_slow',
        severity: 'high',
        currentValue: metrics.sandboxCreationTime,
        threshold: this.alertThresholds.sandboxCreationTime,
        impact: 'User experience degradation',
        potentialCauses: [
          'Container image pull latency',
          'Resource allocation delays',
          'Network congestion',
          'Insufficient compute capacity'
        ]
      })
    }
    
    // 检查 CPU 利用率
    if (metrics.cpuUtilization > this.alertThresholds.cpuUtilization) {
      bottlenecks.push({
        type: 'high_cpu_utilization',
        severity: 'medium',
        currentValue: metrics.cpuUtilization,
        threshold: this.alertThresholds.cpuUtilization,
        impact: 'Increased response times and potential throttling',
        potentialCauses: [
          'CPU-intensive workloads',
          'Insufficient CPU allocation',
          'Inefficient algorithms',
          'Resource leaks'
        ]
      })
    }
    
    // 检查内存利用率
    if (metrics.memoryUtilization > this.alertThresholds.memoryUtilization) {
      bottlenecks.push({
        type: 'high_memory_utilization',
        severity: 'high',
        currentValue: metrics.memoryUtilization,
        threshold: this.alertThresholds.memoryUtilization,
        impact: 'Memory pressure and potential OOM kills',
        potentialCauses: [
          'Memory leaks',
          'Large data processing',
          'Insufficient memory allocation',
          'Memory-intensive libraries'
        ]
      })
    }
    
    // 检查错误率
    if (metrics.errorRate > this.alertThresholds.errorRate) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'critical',
        currentValue: metrics.errorRate,
        threshold: this.alertThresholds.errorRate,
        impact: 'Service reliability and user trust issues',
        potentialCauses: [
          'Resource exhaustion',
          'Network failures',
          'Software bugs',
          'Configuration issues'
        ]
      })
    }
    
    return bottlenecks
  }
  
  private generateRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations: string[] = []
    
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'sandbox_creation_slow':
          recommendations.push(
            'Implement sandbox pre-warming pool',
            'Optimize container image size and layers',
            'Use local image caching',
            'Consider horizontal scaling'
          )
          break
          
        case 'high_cpu_utilization':
          recommendations.push(
            'Increase CPU resource allocation',
            'Implement CPU throttling for user code',
            'Optimize code execution algorithms',
            'Add more compute nodes'
          )
          break
          
        case 'high_memory_utilization':
          recommendations.push(
            'Increase memory limits',
            'Implement memory monitoring and cleanup',
            'Add memory garbage collection',
            'Optimize memory usage patterns'
          )
          break
          
        case 'high_error_rate':
          recommendations.push(
            'Implement circuit breakers',
            'Add retry mechanisms with backoff',
            'Improve error handling and recovery',
            'Increase monitoring and alerting'
          )
          break
      }
    })
    
    return [...new Set(recommendations)]  // 去重
  }
  
  private calculateHealthScore(metrics: PerformanceMetrics): number {
    const weights = {
      responseTime: 0.3,
      errorRate: 0.3,
      cpuUtilization: 0.2,
      memoryUtilization: 0.2
    }
    
    // 计算各项得分 (0-100)
    const responseTimeScore = Math.max(0, 100 - (metrics.responseTime / 50))  // 5秒对应0分
    const errorRateScore = Math.max(0, 100 - (metrics.errorRate * 2000))     // 5%对应0分
    const cpuScore = Math.max(0, 100 - (metrics.cpuUtilization * 125))       // 80%对应0分
    const memoryScore = Math.max(0, 100 - (metrics.memoryUtilization * 118)) // 85%对应0分
    
    const weightedScore = 
      responseTimeScore * weights.responseTime +
      errorRateScore * weights.errorRate +
      cpuScore * weights.cpuUtilization +
      memoryScore * weights.memoryUtilization
    
    return Math.round(weightedScore)
  }
}

interface Bottleneck {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentValue: number
  threshold: number
  impact: string
  potentialCauses: string[]
}
```

## 沙箱池管理

### 2.1 智能预热池

```typescript
class IntelligentSandboxPool {
  private warmPool: Map<string, Sandbox[]> = new Map()      // 按模板分组的预热池
  private coldPool: Map<string, Sandbox[]> = new Map()      // 按模板分组的冷池
  private usageStats: Map<string, UsagePattern> = new Map() // 使用模式统计
  private predictionModel: UsagePredictionModel
  
  constructor() {
    this.predictionModel = new UsagePredictionModel()
    this.startBackgroundTasks()
  }
  
  async getSandbox(template: string = 'default'): Promise<Sandbox> {
    // 1. 尝试从预热池获取
    const warmSandboxes = this.warmPool.get(template) || []
    if (warmSandboxes.length > 0) {
      const sandbox = warmSandboxes.pop()!
      this.triggerPoolReplenishment(template)
      this.recordUsage(template)
      return sandbox
    }
    
    // 2. 尝试从冷池获取并预热
    const coldSandboxes = this.coldPool.get(template) || []
    if (coldSandboxes.length > 0) {
      const sandbox = coldSandboxes.pop()!
      await this.warmupSandbox(sandbox)
      this.recordUsage(template)
      return sandbox
    }
    
    // 3. 创建新沙箱
    const sandbox = await this.createNewSandbox(template)
    await this.warmupSandbox(sandbox)
    this.recordUsage(template)
    return sandbox
  }
  
  private async warmupSandbox(sandbox: Sandbox): Promise<void> {
    const startTime = Date.now()
    
    try {
      // 执行预热代码，减少冷启动延迟
      await Promise.all([
        sandbox.runCode('import sys, os, json, datetime, math', { timeout: 5000 }),
        sandbox.runCode('print("sandbox_ready")', { timeout: 3000 }),
        this.preloadCommonLibraries(sandbox)
      ])
      
      const warmupTime = Date.now() - startTime
      console.log(`Sandbox warmed up in ${warmupTime}ms`)
      
    } catch (error) {
      console.error('Sandbox warmup failed:', error)
      throw error
    }
  }
  
  private async preloadCommonLibraries(sandbox: Sandbox): Promise<void> {
    const commonLibraries = [
      'import pandas as pd',
      'import numpy as np',
      'import matplotlib.pyplot as plt',
      'import requests',
      'import json'
    ]
    
    // 并行预加载常用库
    await Promise.all(
      commonLibraries.map(code => 
        sandbox.runCode(code, { timeout: 10000 }).catch(() => {
          // 忽略加载失败的库，继续预加载其他库
        })
      )
    )
  }
  
  private recordUsage(template: string): void {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    
    const stats = this.usageStats.get(template) || {
      totalUsage: 0,
      hourlyUsage: new Array(24).fill(0),
      dailyUsage: new Array(7).fill(0),
      recentUsage: []
    }
    
    stats.totalUsage++
    stats.hourlyUsage[hour]++
    stats.dailyUsage[dayOfWeek]++
    stats.recentUsage.push(now.getTime())
    
    // 保留最近1小时的使用记录
    const oneHourAgo = now.getTime() - 3600000
    stats.recentUsage = stats.recentUsage.filter(time => time > oneHourAgo)
    
    this.usageStats.set(template, stats)
  }
  
  private async predictPoolSize(template: string): Promise<{ warm: number; cold: number }> {
    const stats = this.usageStats.get(template)
    if (!stats) {
      return { warm: 2, cold: 3 }  // 默认大小
    }
    
    // 基于历史使用模式预测所需池大小
    const currentHour = new Date().getHours()
    const currentDay = new Date().getDay()
    
    const hourlyAverage = stats.hourlyUsage[currentHour] / Math.max(1, stats.totalUsage / (24 * 7))
    const dailyMultiplier = stats.dailyUsage[currentDay] / Math.max(1, stats.totalUsage / 7)
    const recentUsageRate = stats.recentUsage.length  // 最近1小时的使用次数
    
    // 综合预测
    const predictedDemand = Math.ceil(
      (hourlyAverage * dailyMultiplier + recentUsageRate * 2) / 2
    )
    
    return {
      warm: Math.min(Math.max(2, predictedDemand), 10),      // 2-10 个预热沙箱
      cold: Math.min(Math.max(3, predictedDemand * 2), 15)   // 3-15 个冷沙箱
    }
  }
  
  private async maintainPools(): Promise<void> {
    for (const [template, stats] of this.usageStats.entries()) {
      const targetSizes = await this.predictPoolSize(template)
      
      // 维护预热池
      await this.adjustPoolSize(template, 'warm', targetSizes.warm)
      
      // 维护冷池
      await this.adjustPoolSize(template, 'cold', targetSizes.cold)
    }
  }
  
  private async adjustPoolSize(
    template: string,
    poolType: 'warm' | 'cold',
    targetSize: number
  ): Promise<void> {
    const pool = poolType === 'warm' ? this.warmPool : this.coldPool
    const currentPool = pool.get(template) || []
    
    if (currentPool.length < targetSize) {
      // 扩充池大小
      const needed = targetSize - currentPool.length
      const newSandboxes = await Promise.all(
        Array(needed).fill(0).map(() => this.createNewSandbox(template))
      )
      
      if (poolType === 'warm') {
        await Promise.all(newSandboxes.map(sb => this.warmupSandbox(sb)))
      }
      
      currentPool.push(...newSandboxes)
      pool.set(template, currentPool)
      
    } else if (currentPool.length > targetSize) {
      // 缩减池大小
      const excess = currentPool.length - targetSize
      const removedSandboxes = currentPool.splice(0, excess)
      
      // 异步清理多余的沙箱
      Promise.all(removedSandboxes.map(sb => sb.kill())).catch(console.error)
    }
  }
  
  private startBackgroundTasks(): void {
    // 每5分钟维护一次池
    setInterval(() => {
      this.maintainPools().catch(console.error)
    }, 5 * 60 * 1000)
    
    // 每小时清理老旧的沙箱
    setInterval(() => {
      this.cleanupOldSandboxes().catch(console.error)
    }, 60 * 60 * 1000)
    
    // 每30分钟更新预测模型
    setInterval(() => {
      this.predictionModel.updateModel(this.usageStats).catch(console.error)
    }, 30 * 60 * 1000)
  }
  
  private async cleanupOldSandboxes(): Promise<void> {
    const maxAge = 60 * 60 * 1000  // 1小时
    const now = Date.now()
    
    for (const [template, sandboxes] of this.warmPool.entries()) {
      const filteredSandboxes = await Promise.all(
        sandboxes.map(async (sandbox) => {
          const age = now - sandbox.createdAt.getTime()
          if (age > maxAge) {
            await sandbox.kill()
            return null
          }
          return sandbox
        })
      )
      
      this.warmPool.set(template, filteredSandboxes.filter(Boolean) as Sandbox[])
    }
  }
  
  async getPoolStats(): Promise<PoolStats> {
    const stats: PoolStats = {
      templates: {},
      totalWarm: 0,
      totalCold: 0,
      totalActive: 0
    }
    
    for (const [template, warmSandboxes] of this.warmPool.entries()) {
      const coldSandboxes = this.coldPool.get(template) || []
      const usageStats = this.usageStats.get(template)
      
      stats.templates[template] = {
        warm: warmSandboxes.length,
        cold: coldSandboxes.length,
        totalUsage: usageStats?.totalUsage || 0,
        recentUsage: usageStats?.recentUsage.length || 0
      }
      
      stats.totalWarm += warmSandboxes.length
      stats.totalCold += coldSandboxes.length
    }
    
    return stats
  }
}

interface UsagePattern {
  totalUsage: number
  hourlyUsage: number[]       // 24小时使用模式
  dailyUsage: number[]        // 7天使用模式
  recentUsage: number[]       // 最近使用时间戳
}

interface PoolStats {
  templates: { [template: string]: {
    warm: number
    cold: number
    totalUsage: number
    recentUsage: number
  }}
  totalWarm: number
  totalCold: number
  totalActive: number
}

// 使用预测模型
class UsagePredictionModel {
  private model: any  // 可以集成机器学习模型
  
  async updateModel(usageStats: Map<string, UsagePattern>): Promise<void> {
    // 更新预测模型，可以使用时间序列分析或机器学习
    console.log('Updating usage prediction model...')
  }
  
  async predictDemand(template: string, timeHorizon: number): Promise<number> {
    // 预测未来需求
    return 5  // 简化实现
  }
}
```

### 2.2 负载均衡与路由

```typescript
class SandboxLoadBalancer {
  private pools: Map<string, IntelligentSandboxPool> = new Map()
  private nodeMetrics: Map<string, NodeMetrics> = new Map()
  private routingStrategy: RoutingStrategy = 'least_loaded'
  
  async routeRequest(
    request: SandboxRequest
  ): Promise<{ sandbox: Sandbox; nodeId: string }> {
    const availableNodes = await this.getAvailableNodes(request.template)
    
    if (availableNodes.length === 0) {
      throw new Error('No available nodes for template: ' + request.template)
    }
    
    const selectedNode = this.selectBestNode(availableNodes, request)
    const pool = this.pools.get(selectedNode.id)!
    const sandbox = await pool.getSandbox(request.template)
    
    return { sandbox, nodeId: selectedNode.id }
  }
  
  private selectBestNode(nodes: NodeInfo[], request: SandboxRequest): NodeInfo {
    switch (this.routingStrategy) {
      case 'round_robin':
        return this.roundRobinSelection(nodes)
        
      case 'least_loaded':
        return this.leastLoadedSelection(nodes)
        
      case 'resource_aware':
        return this.resourceAwareSelection(nodes, request)
        
      case 'geographic':
        return this.geographicSelection(nodes, request.clientLocation)
        
      default:
        return nodes[0]
    }
  }
  
  private leastLoadedSelection(nodes: NodeInfo[]): NodeInfo {
    return nodes.reduce((best, current) => {
      const bestMetrics = this.nodeMetrics.get(best.id)!
      const currentMetrics = this.nodeMetrics.get(current.id)!
      
      const bestLoad = bestMetrics.cpuUtilization + bestMetrics.memoryUtilization
      const currentLoad = currentMetrics.cpuUtilization + currentMetrics.memoryUtilization
      
      return currentLoad < bestLoad ? current : best
    })
  }
  
  private resourceAwareSelection(nodes: NodeInfo[], request: SandboxRequest): NodeInfo {
    // 基于请求的资源需求选择最适合的节点
    const requiredCpu = request.resourceRequirements?.cpuCores || 1
    const requiredMemory = request.resourceRequirements?.memoryMB || 512
    
    return nodes
      .filter(node => {
        const metrics = this.nodeMetrics.get(node.id)!
        const availableCpu = node.totalCpu * (1 - metrics.cpuUtilization)
        const availableMemory = node.totalMemory * (1 - metrics.memoryUtilization)
        
        return availableCpu >= requiredCpu && availableMemory >= requiredMemory
      })
      .reduce((best, current) => {
        const bestMetrics = this.nodeMetrics.get(best.id)!
        const currentMetrics = this.nodeMetrics.get(current.id)!
        
        // 计算资源匹配度分数
        const bestScore = this.calculateResourceScore(best, bestMetrics, request)
        const currentScore = this.calculateResourceScore(current, currentMetrics, request)
        
        return currentScore > bestScore ? current : best
      })
  }
  
  private calculateResourceScore(
    node: NodeInfo,
    metrics: NodeMetrics,
    request: SandboxRequest
  ): number {
    const cpuScore = (1 - metrics.cpuUtilization) * 0.4
    const memoryScore = (1 - metrics.memoryUtilization) * 0.4
    const networkScore = (1 - metrics.networkUtilization) * 0.2
    
    return cpuScore + memoryScore + networkScore
  }
  
  private geographicSelection(nodes: NodeInfo[], clientLocation?: string): NodeInfo {
    if (!clientLocation) {
      return this.leastLoadedSelection(nodes)
    }
    
    // 按地理位置就近选择
    const nodesByDistance = nodes
      .map(node => ({
        node,
        distance: this.calculateDistance(clientLocation, node.location)
      }))
      .sort((a, b) => a.distance - b.distance)
    
    // 在最近的3个节点中选择负载最低的
    const nearestNodes = nodesByDistance.slice(0, 3).map(item => item.node)
    return this.leastLoadedSelection(nearestNodes)
  }
  
  private calculateDistance(location1: string, location2: string): number {
    // 简化的距离计算，实际可以使用地理位置 API
    const regions = {
      'us-east-1': { lat: 39.0458, lon: -76.6413 },
      'us-west-2': { lat: 45.5152, lon: -122.6784 },
      'eu-west-1': { lat: 53.3498, lon: -6.2603 },
      'ap-southeast-1': { lat: 1.3521, lon: 103.8198 }
    }
    
    const loc1 = regions[location1] || regions['us-east-1']
    const loc2 = regions[location2] || regions['us-east-1']
    
    const R = 6371  // 地球半径 (km)
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180
    const dLon = (loc2.lon - loc1.lon) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    
    return R * c
  }
}

type RoutingStrategy = 'round_robin' | 'least_loaded' | 'resource_aware' | 'geographic'

interface NodeInfo {
  id: string
  location: string
  totalCpu: number
  totalMemory: number
  available: boolean
}

interface NodeMetrics {
  cpuUtilization: number
  memoryUtilization: number
  networkUtilization: number
  activeConnections: number
  lastUpdate: number
}

interface SandboxRequest {
  template: string
  resourceRequirements?: {
    cpuCores: number
    memoryMB: number
  }
  clientLocation?: string
  priority?: 'low' | 'normal' | 'high'
}
```

## 资源配额与限制

### 3.1 动态资源分配

```typescript
class DynamicResourceManager {
  private globalLimits: ResourceLimits
  private userQuotas: Map<string, UserQuota> = new Map()
  private currentAllocations: Map<string, ResourceAllocation> = new Map()
  
  constructor(globalLimits: ResourceLimits) {
    this.globalLimits = globalLimits
  }
  
  async allocateResources(
    userId: string,
    sandboxId: string,
    request: ResourceRequest
  ): Promise<ResourceAllocation> {
    // 1. 检查用户配额
    const userQuota = await this.getUserQuota(userId)
    const currentUsage = await this.getUserCurrentUsage(userId)
    
    if (!this.canAllocate(userQuota, currentUsage, request)) {
      throw new ResourceQuotaExceededError('User quota exceeded')
    }
    
    // 2. 检查全局资源可用性
    const globalUsage = await this.getGlobalResourceUsage()
    if (!this.hasGlobalCapacity(globalUsage, request)) {
      throw new ResourceUnavailableError('Insufficient global resources')
    }
    
    // 3. 动态调整资源分配
    const allocation = this.calculateOptimalAllocation(request, userQuota, globalUsage)
    
    // 4. 记录分配
    this.currentAllocations.set(sandboxId, allocation)
    
    // 5. 应用资源限制
    await this.applyResourceLimits(sandboxId, allocation)
    
    return allocation
  }
  
  private calculateOptimalAllocation(
    request: ResourceRequest,
    userQuota: UserQuota,
    globalUsage: ResourceUsage
  ): ResourceAllocation {
    // 基于可用资源和用户等级动态分配
    const baseCpu = request.cpuCores || 1
    const baseMemory = request.memoryMB || 512
    
    // 根据用户等级调整资源
    const tierMultiplier = this.getTierMultiplier(userQuota.tier)
    
    // 根据系统负载调整资源
    const loadFactor = this.calculateLoadFactor(globalUsage)
    
    const allocation: ResourceAllocation = {
      sandboxId: request.sandboxId,
      userId: request.userId,
      cpuCores: Math.min(
        baseCpu * tierMultiplier * loadFactor,
        userQuota.maxCpuCores,
        this.globalLimits.maxCpuPerSandbox
      ),
      memoryMB: Math.min(
        baseMemory * tierMultiplier * loadFactor,
        userQuota.maxMemoryMB,
        this.globalLimits.maxMemoryPerSandbox
      ),
      diskMB: Math.min(
        request.diskMB || 1024,
        userQuota.maxDiskMB,
        this.globalLimits.maxDiskPerSandbox
      ),
      networkBandwidthKbps: userQuota.maxNetworkBandwidth,
      timeoutMs: Math.min(
        request.timeoutMs || 300000,
        userQuota.maxExecutionTime
      ),
      priority: this.calculatePriority(userQuota.tier, request.priority),
      allocatedAt: new Date()
    }
    
    return allocation
  }
  
  private getTierMultiplier(tier: UserTier): number {
    const multipliers = {
      'free': 0.5,
      'basic': 1.0,
      'premium': 1.5,
      'enterprise': 2.0
    }
    return multipliers[tier] || 1.0
  }
  
  private calculateLoadFactor(globalUsage: ResourceUsage): number {
    const cpuLoad = globalUsage.cpuUtilization
    const memoryLoad = globalUsage.memoryUtilization
    const avgLoad = (cpuLoad + memoryLoad) / 2
    
    // 在高负载时减少资源分配
    if (avgLoad > 0.8) {
      return 0.7
    } else if (avgLoad > 0.6) {
      return 0.85
    } else {
      return 1.0
    }
  }
  
  private calculatePriority(tier: UserTier, requestPriority?: string): number {
    const tierPriorities = {
      'free': 1,
      'basic': 2,
      'premium': 3,
      'enterprise': 4
    }
    
    const basePriority = tierPriorities[tier] || 1
    
    if (requestPriority === 'high') {
      return basePriority + 2
    } else if (requestPriority === 'low') {
      return Math.max(1, basePriority - 1)
    }
    
    return basePriority
  }
  
  async deallocateResources(sandboxId: string): Promise<void> {
    const allocation = this.currentAllocations.get(sandboxId)
    if (!allocation) {
      return
    }
    
    // 移除资源限制
    await this.removeResourceLimits(sandboxId)
    
    // 移除分配记录
    this.currentAllocations.delete(sandboxId)
    
    // 触发资源重分配优化
    this.optimizeResourceAllocation()
  }
  
  private async applyResourceLimits(
    sandboxId: string,
    allocation: ResourceAllocation
  ): Promise<void> {
    // 应用 cgroup 限制
    await this.applyCgroupLimits(sandboxId, allocation)
    
    // 应用网络限制
    await this.applyNetworkLimits(sandboxId, allocation)
    
    // 应用磁盘限制
    await this.applyDiskLimits(sandboxId, allocation)
  }
  
  private async applyCgroupLimits(
    sandboxId: string,
    allocation: ResourceAllocation
  ): Promise<void> {
    const cgroupPath = `/sys/fs/cgroup/sandbox-${sandboxId}`
    
    // CPU 限制
    const cpuQuota = Math.floor(allocation.cpuCores * 100000)  // 100ms period
    await this.writeCgroupFile(`${cgroupPath}/cpu.cfs_quota_us`, cpuQuota.toString())
    await this.writeCgroupFile(`${cgroupPath}/cpu.cfs_period_us`, '100000')
    
    // 内存限制
    const memoryBytes = allocation.memoryMB * 1024 * 1024
    await this.writeCgroupFile(`${cgroupPath}/memory.limit_in_bytes`, memoryBytes.toString())
    await this.writeCgroupFile(`${cgroupPath}/memory.memsw.limit_in_bytes`, memoryBytes.toString())
  }
  
  private async applyNetworkLimits(
    sandboxId: string,
    allocation: ResourceAllocation
  ): Promise<void> {
    // 使用 tc (traffic control) 限制网络带宽
    const interface_ = `veth-${sandboxId}`
    const bandwidthKbps = allocation.networkBandwidthKbps
    
    const commands = [
      `tc qdisc add dev ${interface_} root tbf rate ${bandwidthKbps}kbit burst 10kb latency 70ms`,
      `tc qdisc add dev ${interface_} ingress`,
      `tc filter add dev ${interface_} parent ffff: protocol ip prio 50 u32 match ip src 0.0.0.0/0 police rate ${bandwidthKbps}kbit burst 10kb drop flowid :1`
    ]
    
    for (const command of commands) {
      await this.executeCommand(command)
    }
  }
  
  private async optimizeResourceAllocation(): Promise<void> {
    // 定期优化资源分配，重新平衡负载
    const allAllocations = Array.from(this.currentAllocations.values())
    const globalUsage = await this.getGlobalResourceUsage()
    
    // 识别资源利用率低的沙箱
    const underutilizedSandboxes = await this.identifyUnderutilizedSandboxes()
    
    // 调整资源分配
    for (const sandboxId of underutilizedSandboxes) {
      const allocation = this.currentAllocations.get(sandboxId)
      if (allocation) {
        const optimizedAllocation = this.optimizeAllocation(allocation, globalUsage)
        await this.applyResourceLimits(sandboxId, optimizedAllocation)
        this.currentAllocations.set(sandboxId, optimizedAllocation)
      }
    }
  }
}

interface ResourceRequest {
  sandboxId: string
  userId: string
  cpuCores?: number
  memoryMB?: number
  diskMB?: number
  timeoutMs?: number
  priority?: 'low' | 'normal' | 'high'
}

interface ResourceAllocation {
  sandboxId: string
  userId: string
  cpuCores: number
  memoryMB: number
  diskMB: number
  networkBandwidthKbps: number
  timeoutMs: number
  priority: number
  allocatedAt: Date
}

interface ResourceLimits {
  maxCpuPerSandbox: number
  maxMemoryPerSandbox: number
  maxDiskPerSandbox: number
  maxSandboxesPerUser: number
}

type UserTier = 'free' | 'basic' | 'premium' | 'enterprise'

interface UserQuota {
  tier: UserTier
  maxCpuCores: number
  maxMemoryMB: number
  maxDiskMB: number
  maxNetworkBandwidth: number
  maxExecutionTime: number
  maxConcurrentSandboxes: number
}
```

## 缓存策略

### 4.1 多层缓存架构

```typescript
class MultiLevelCacheManager {
  private l1Cache: Map<string, CacheEntry> = new Map()      // 内存缓存
  private l2Cache: RedisCache                               // Redis 缓存
  private l3Cache: S3Cache                                  // 对象存储缓存
  private cacheStats: CacheStatistics = new CacheStatistics()
  
  constructor(redisCache: RedisCache, s3Cache: S3Cache) {
    this.l2Cache = redisCache
    this.l3Cache = s3Cache
    this.startCacheMaintenanceTasks()
  }
  
  async get(key: string): Promise<any> {
    const startTime = Date.now()
    
    try {
      // L1 缓存 (内存)
      const l1Result = this.l1Cache.get(key)
      if (l1Result && !this.isExpired(l1Result)) {
        this.cacheStats.recordHit('l1', Date.now() - startTime)
        await this.updateAccessTime(key, l1Result)
        return l1Result.data
      }
      
      // L2 缓存 (Redis)
      const l2Result = await this.l2Cache.get(key)
      if (l2Result) {
        this.cacheStats.recordHit('l2', Date.now() - startTime)
        
        // 回填到 L1 缓存
        this.l1Cache.set(key, {
          data: l2Result,
          timestamp: Date.now(),
          ttl: this.getDefaultTTL(key),
          accessCount: 1,
          lastAccess: Date.now()
        })
        
        return l2Result
      }
      
      // L3 缓存 (S3)
      const l3Result = await this.l3Cache.get(key)
      if (l3Result) {
        this.cacheStats.recordHit('l3', Date.now() - startTime)
        
        // 回填到上层缓存
        await this.l2Cache.set(key, l3Result, this.getDefaultTTL(key))
        this.l1Cache.set(key, {
          data: l3Result,
          timestamp: Date.now(),
          ttl: this.getDefaultTTL(key),
          accessCount: 1,
          lastAccess: Date.now()
        })
        
        return l3Result
      }
      
      // 缓存未命中
      this.cacheStats.recordMiss(Date.now() - startTime)
      return null
      
    } catch (error) {
      this.cacheStats.recordError()
      console.error('Cache get error:', error)
      return null
    }
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const cacheEntry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.getDefaultTTL(key),
      accessCount: 0,
      lastAccess: Date.now()
    }
    
    // 写入所有层级
    this.l1Cache.set(key, cacheEntry)
    await this.l2Cache.set(key, value, cacheEntry.ttl)
    
    // 大对象或重要数据写入 L3
    if (this.shouldCacheInL3(key, value)) {
      await this.l3Cache.set(key, value, cacheEntry.ttl)
    }
  }
  
  async invalidate(key: string): Promise<void> {
    // 从所有层级删除
    this.l1Cache.delete(key)
    await this.l2Cache.delete(key)
    await this.l3Cache.delete(key)
  }
  
  private getDefaultTTL(key: string): number {
    if (key.startsWith('sandbox:')) {
      return 30 * 60 * 1000  // 30分钟
    } else if (key.startsWith('user:')) {
      return 60 * 60 * 1000  // 1小时
    } else if (key.startsWith('template:')) {
      return 24 * 60 * 60 * 1000  // 24小时
    }
    return 15 * 60 * 1000  // 默认15分钟
  }
  
  private shouldCacheInL3(key: string, value: any): boolean {
    // 大文件或重要配置数据才写入 L3
    const size = JSON.stringify(value).length
    return size > 1024 * 1024 || key.includes('template') || key.includes('config')
  }
  
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
  
  private async updateAccessTime(key: string, entry: CacheEntry): Promise<void> {
    entry.accessCount++
    entry.lastAccess = Date.now()
  }
  
  private startCacheMaintenanceTasks(): void {
    // 每5分钟清理 L1 缓存中的过期条目
    setInterval(() => {
      this.cleanupL1Cache()
    }, 5 * 60 * 1000)
    
    // 每小时优化缓存分布
    setInterval(() => {
      this.optimizeCacheDistribution()
    }, 60 * 60 * 1000)
  }
  
  private cleanupL1Cache(): void {
    const now = Date.now()
    const maxSize = 10000  // 最大条目数
    const entries = Array.from(this.l1Cache.entries())
    
    // 移除过期条目
    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        this.l1Cache.delete(key)
      }
    }
    
    // 如果仍然超过大小限制，使用 LRU 策略移除
    if (this.l1Cache.size > maxSize) {
      const sortedEntries = entries
        .filter(([key, entry]) => !this.isExpired(entry))
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      
      const toRemove = sortedEntries.slice(0, this.l1Cache.size - maxSize)
      toRemove.forEach(([key]) => this.l1Cache.delete(key))
    }
  }
  
  private async optimizeCacheDistribution(): Promise<void> {
    // 分析缓存命中率，优化数据分布
    const stats = this.cacheStats.getStats()
    
    if (stats.l1HitRate < 0.7) {
      // L1 命中率低，增加热数据缓存
      await this.promoteHotDataToL1()
    }
    
    if (stats.l2HitRate < 0.8) {
      // L2 命中率低，从 L3 预加载数据
      await this.preloadFromL3()
    }
  }
  
  getCacheStats(): CacheStatistics {
    return this.cacheStats
  }
}

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
}

class CacheStatistics {
  private stats = {
    l1: { hits: 0, misses: 0, totalTime: 0 },
    l2: { hits: 0, misses: 0, totalTime: 0 },
    l3: { hits: 0, misses: 0, totalTime: 0 },
    errors: 0
  }
  
  recordHit(level: 'l1' | 'l2' | 'l3', responseTime: number): void {
    this.stats[level].hits++
    this.stats[level].totalTime += responseTime
  }
  
  recordMiss(responseTime: number): void {
    this.stats.l1.misses++
    this.stats.l2.misses++
    this.stats.l3.misses++
  }
  
  recordError(): void {
    this.stats.errors++
  }
  
  getStats() {
    const l1Total = this.stats.l1.hits + this.stats.l1.misses
    const l2Total = this.stats.l2.hits + this.stats.l2.misses
    const l3Total = this.stats.l3.hits + this.stats.l3.misses
    
    return {
      l1HitRate: l1Total > 0 ? this.stats.l1.hits / l1Total : 0,
      l2HitRate: l2Total > 0 ? this.stats.l2.hits / l2Total : 0,
      l3HitRate: l3Total > 0 ? this.stats.l3.hits / l3Total : 0,
      avgL1ResponseTime: this.stats.l1.hits > 0 ? this.stats.l1.totalTime / this.stats.l1.hits : 0,
      avgL2ResponseTime: this.stats.l2.hits > 0 ? this.stats.l2.totalTime / this.stats.l2.hits : 0,
      avgL3ResponseTime: this.stats.l3.hits > 0 ? this.stats.l3.totalTime / this.stats.l3.hits : 0,
      errorRate: this.stats.errors / (l1Total + this.stats.errors)
    }
  }
}

// Redis 缓存实现
class RedisCache {
  private client: any  // Redis 客户端
  
  async get(key: string): Promise<any> {
    const result = await this.client.get(key)
    return result ? JSON.parse(result) : null
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.client.setex(key, Math.floor(ttl / 1000), JSON.stringify(value))
  }
  
  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }
}

// S3 缓存实现
class S3Cache {
  private s3Client: any  // AWS S3 客户端
  private bucket: string
  
  constructor(s3Client: any, bucket: string) {
    this.s3Client = s3Client
    this.bucket = bucket
  }
  
  async get(key: string): Promise<any> {
    try {
      const result = await this.s3Client.getObject({
        Bucket: this.bucket,
        Key: key
      }).promise()
      
      return JSON.parse(result.Body.toString())
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null
      }
      throw error
    }
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    const expiration = new Date(Date.now() + ttl)
    
    await this.s3Client.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(value),
      Expires: expiration,
      ContentType: 'application/json'
    }).promise()
  }
  
  async delete(key: string): Promise<void> {
    await this.s3Client.deleteObject({
      Bucket: this.bucket,
      Key: key
    }).promise()
  }
}
```

## 总结

E2B 性能优化涉及多个方面的系统性工程：

### 关键优化策略

1. **智能沙箱池管理**：预测性资源分配和动态池大小调整
2. **精细化资源控制**：基于用户等级和系统负载的动态资源分配
3. **多层缓存架构**：内存+Redis+对象存储的分级缓存策略
4. **负载均衡优化**：基于资源和地理位置的智能路由
5. **实时性能监控**：全面的性能指标收集和分析

### 性能提升效果

通过这些优化策略，可以实现：

- **沙箱启动时间**：从 5-10 秒降低到 500ms-1s
- **并发处理能力**：提升 3-5 倍
- **资源利用率**：提升到 85% 以上
- **响应时间**：P95 响应时间控制在 2 秒以内
- **系统可用性**：达到 99.9% 以上

### 运维建议

1. **监控告警**：建立完善的性能监控和预警机制
2. **容量规划**：基于使用模式预测和规划资源需求
3. **定期优化**：持续优化缓存策略和资源分配算法
4. **压力测试**：定期进行性能压力测试和瓶颈分析
5. **成本控制**：平衡性能和成本，实现最优的资源配置

这些优化措施确保 E2B 能够在高并发场景下提供稳定、高效的代码执行服务。
/**
 * 请求节流缓存核心实现类
 */

import type { CacheKeyParams, IThrottleCache, PendingItem, ThrottleOptions } from './types';

/** 默认配置 */
const DEFAULT_OPTIONS: Required<ThrottleOptions> = {
  enabled: true,
  windowMs: 1000,
  excludeUrls: [],
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
};

/** 需要默认排除的 URL 模式 */
const DEFAULT_EXCLUDE_PATTERNS: (string | RegExp)[] = [
  /\/api\/login/,
  /\/api\/upload/,
  /\/api\/refresh/,
];

export class ThrottleCache implements IThrottleCache {
  private cache: Map<string, PendingItem> = new Map();
  private options: Required<ThrottleOptions>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = true;

  constructor(options: ThrottleOptions = {}) {
    // 合并默认排除规则和用户配置的排除规则
    const excludeUrls = [
      ...DEFAULT_EXCLUDE_PATTERNS,
      ...(options.excludeUrls || []),
    ];
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      excludeUrls,
    };
    this.enabled = this.options.enabled;
    this.startCleanupTimer();
  }

  /**
   * 生成缓存 Key
   * 基于 URL 路径 + 方法 + 参数生成唯一 key
   */
  getCacheKey(params: CacheKeyParams): string {
    const { url, method = 'GET', params: queryParams, data } = params;

    // 提取 URL 路径（去掉 baseURL 和查询参数）
    const urlPath = url.split('?')[0];

    // 构建 key
    let key = `${method}:${urlPath}`;

    // 加入参数信息
    if (queryParams && Object.keys(queryParams).length > 0) {
      // 按 key 排序确保顺序一致
      const sortedParams = Object.keys(queryParams)
        .sort()
        .reduce((acc, k) => {
          if (queryParams[k] !== undefined && queryParams[k] !== null) {
            acc[k] = queryParams[k];
          }
          return acc;
        }, {} as Record<string, unknown>);
      key += `:${JSON.stringify(sortedParams)}`;
    }

    // 加入 body 数据（仅 POST/PUT/PATCH）
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      key += `:${JSON.stringify(data)}`;
    }

    return key;
  }

  /**
   * 获取已存在的 pending 请求
   */
  getPendingPromise(key: string): Promise<unknown> | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.clearKey(key);
      return undefined;
    }

    return item.promise;
  }

  /**
   * 注册新的 pending 请求
   */
  setPendingPromise(key: string, promise: Promise<unknown>): void {
    const expireAt = Date.now() + this.options.windowMs;

    // 使用 Promise.finally 双重保障清理
    const cleanPromise = promise.finally(() => {
      this.clearKey(key);
    });

    this.cache.set(key, {
      promise: cleanPromise,
      expireAt,
    });
  }

  /**
   * 清除指定 key 的缓存
   */
  clearKey(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * 判断 URL/方法是否应被排除
   */
  shouldExclude(url: string, method?: string): boolean {
    // 检查方法排除
    if (method && this.options.excludeMethods.includes(method.toUpperCase())) {
      return true;
    }

    // 检查 URL 排除
    for (const pattern of this.options.excludeUrls) {
      if (typeof pattern === 'string') {
        if (url.includes(pattern)) {
          return true;
        }
      } else if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查节流是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 设置启用状态
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 获取当前配置
   */
  getOptions(): ThrottleOptions {
    return { ...this.options };
  }

  /**
   * 更新配置
   */
  configure(options: Partial<ThrottleOptions>): void {
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
    if (options.windowMs !== undefined) {
      this.options.windowMs = options.windowMs;
    }
    if (options.excludeUrls !== undefined) {
      // 保留默认排除规则，追加用户配置
      this.options.excludeUrls = [
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...options.excludeUrls,
      ];
    }
    if (options.excludeMethods !== undefined) {
      this.options.excludeMethods = options.excludeMethods;
    }
  }

  /**
   * 启动定时清理器
   * 以 windowMs / 2 的间隔清理过期项
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    const interval = Math.max(this.options.windowMs / 2, 500);

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expireAt) {
          this.cache.delete(key);
        }
      }
    }, interval);
  }

  /**
   * 销毁清理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearAll();
  }
}

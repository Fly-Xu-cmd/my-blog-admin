/**
 * 请求节流类型定义
 */

/** 节流配置选项 */
export interface ThrottleOptions {
  /** 是否启用节流 */
  enabled?: boolean;
  /** 时间窗口大小（毫秒），默认 1000ms */
  windowMs?: number;
  /** 需要排除的 URL 模式列表 */
  excludeUrls?: (string | RegExp)[];
  /** 需要排除的请求方法列表 */
  excludeMethods?: string[];
}

/** 缓存项结构 */
export interface PendingItem {
  /** Pending 状态的 Promise */
  promise: Promise<unknown>;
  /** 过期时间戳 */
  expireAt: number;
}

/** 生成缓存 Key 的参数 */
export interface CacheKeyParams {
  /** 请求 URL */
  url: string;
  /** 请求方法 */
  method?: string;
  /** 请求参数 */
  params?: Record<string, unknown>;
  /** 请求数据 */
  data?: unknown;
}

/** 节流缓存工具类接口 */
export interface IThrottleCache {
  /** 获取缓存的 Promise（如果存在） */
  getPendingPromise(key: string): Promise<unknown> | undefined;
  /** 设置缓存 Promise */
  setPendingPromise(key: string, promise: Promise<unknown>): void;
  /** 清除指定 key 的缓存 */
  clearKey(key: string): void;
  /** 清除所有缓存 */
  clearAll(): void;
  /** 判断 URL 是否应被排除 */
  shouldExclude(url: string, method?: string): boolean;
  /** 检查节流是否启用 */
  isEnabled(): boolean;
  /** 设置启用状态 */
  setEnabled(enabled: boolean): void;
  /** 获取当前配置 */
  getOptions(): ThrottleOptions;
  /** 更新配置 */
  configure(options: Partial<ThrottleOptions>): void;
}

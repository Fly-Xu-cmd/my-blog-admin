import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';
import { ThrottleCache } from '@/utils/throttleRequest';
import type { CacheKeyParams } from '@/utils/throttleRequest';

// 创建节流缓存实例
const throttleCache = new ThrottleCache({
  windowMs: 1000,
  excludeUrls: [/\/api\/login/, /\/api\/upload/],
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
});

/**
 * 获取节流缓存实例
 */
export const getThrottleCache = () => throttleCache;

/**
 * 清除所有节流缓存
 */
export const clearThrottleCache = () => throttleCache.clearAll();

/**
 * 配置节流选项
 */
export const configureThrottle = (options: Parameters<typeof throttleCache.configure>[0]) => {
  throttleCache.configure(options);
};

/**
 * 设置节流启用状态
 */
export const setThrottleEnabled = (enabled: boolean) => {
  throttleCache.setEnabled(enabled);
};

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        message.error(`Response status:${error.response.status}`);
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('None response! Please retry.');
      } else {
        // 发送请求时出了点问题
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      const url = config?.url?.concat('?token=123');

      // 节流逻辑：检查是否有相同的 pending 请求
      if (throttleCache.isEnabled() && !config.skipThrottle) {
        const cacheKeyParams: CacheKeyParams = {
          url: url || '',
          method: config.method,
          params: config.params,
          data: config.data,
        };

        // 检查是否在排除列表中
        if (!throttleCache.shouldExclude(cacheKeyParams.url, cacheKeyParams.method)) {
          const cacheKey = throttleCache.getCacheKey(cacheKeyParams);
          const pendingPromise = throttleCache.getPendingPromise(cacheKey);

          if (pendingPromise) {
            // 返回已存在的 pending 请求，中断当前请求
            return { ...config, url, __pendingPromise: pendingPromise };
          }

          // 创建新的 promise 并缓存
          const requestPromise = new Promise((resolve, reject) => {
            // 将原始请求的 resolve/reject 保存起来
            // 由于 UmiJS 的 request 拦截器不能直接控制响应流程，
            // 这里采用标记方式，在响应拦截器中处理
            (config as any).__throttleResolve = resolve;
            (config as any).__throttleReject = reject;
          });

          throttleCache.setPendingPromise(cacheKey, requestPromise);
        }
      }

      return { ...config, url };
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      const { data } = response as unknown as ResponseStructure;

      if (data?.success === false) {
        message.error('请求失败！');
      }

      // 节流缓存清理：从 pending 缓存中移除
      const config = (response as any).config;
      if (config && config.__throttleResolve) {
        config.__throttleResolve(response);
      }

      return response;
    },
  ],
};

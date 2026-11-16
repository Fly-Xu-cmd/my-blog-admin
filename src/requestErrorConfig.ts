import type { RequestConfig } from '@umijs/max';
import { message } from 'antd';
import { authFailure, authHeaders } from '@/utils/api';
export const errorConfig: RequestConfig = {
  requestInterceptors: [
    (config: any) => ({ ...config, headers: { ...config.headers, ...authHeaders() } }),
  ],
  errorConfig: {
    errorThrower: (res) => {
      const data = res as { ok?: boolean; success?: boolean; error?: string };
      if (data.ok === false || data.success === false) throw new Error(data.error || '请求失败');
    },
    errorHandler: (error: any, options: any) => {
      if (options?.skipErrorHandler) throw error;
      const status = error.response?.status;
      if (status === 401) {
        authFailure(status);
        message.error('登录已失效，请重新登录');
      } else if (status === 403) message.error('没有权限执行此操作');
      else message.error(error.response?.data?.error || error.message || '请求失败');
    },
  },
};

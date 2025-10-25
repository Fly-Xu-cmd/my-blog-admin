import { request } from "@umijs/max";

// 新增文章 POST /nextjs/api/posts
export async function addPost(options?: { [key: string]: any }) {
  return request<API.Post>("/nextjs/api/posts", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

// 获取文章列表 GET /nextjs/api/posts
export async function getPosts(
  params?: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any }
) {
  return request<API.PostList>("/nextjs/api/posts", {
    method: "GET",
    params: {
      ...params,
      current: params?.current || 1,
      pageSize: params?.pageSize || 10,
    },
    ...(options || {}),
  });
}

// 新增动态 POST /nextjs/api/dynamics
export async function addDynamic(options?: { [key: string]: any }) {
  return request<API.Dynamic>("/nextjs/api/dynamics", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

import { request } from "@umijs/max";

// 新增文章 POST /api/posts
export async function addPost(options?: { [key: string]: any }) {
  return request<API.PostList>("/api/posts", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

// 获取文章列表 GET /api/posts
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
  return request<API.PostList>("/api/posts", {
    method: "GET",
    params: {
      ...params,
      current: params?.current || 1,
      pageSize: params?.pageSize || 10,
    },
    ...(options || {}),
  });
}

// 更新文章 POST /api/posts/:slug
export async function updatePost(
  slug: string,
  options?: { [key: string]: any }
) {
  return request<API.PostList>(`/api/posts/${slug}`, {
    method: "Put",
    data: {
      method: "put",
      ...(options || {}),
    },
  });
}

// 删除文章 DELETE /api/posts/:slug
export async function deletePost(slug: string) {
  console.log("slug", slug);
  return request<API.PostList>(`/api/posts/${slug}`, {
    method: "DELETE",
    data: {
      method: "delete",
    },
  });
}

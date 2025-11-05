import { request } from "@umijs/max";

// 新增分类 POST /api/categories
export async function addCategory(options?: { name: string }) {
  return request<API.Category>("/api/categories", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

// 更新分类 PUT /api/categories
export async function updateCategory(options?: {
  name: string;
  newName: string;
}) {
  return request<API.Category>(`/api/categories`, {
    method: "PUT",
    data: {
      method: "put",
      ...(options || {}),
    },
  });
}

// 删除分类 DELETE /api/categories
export async function deleteCategory(options?: { name: string }) {
  return request<API.Category>(`/api/categories`, {
    method: "DELETE",
    data: {
      method: "delete",
      ...(options || {}),
    },
  });
}

// 获取分类 GET /api/categories
export async function getCategories(options?: { [key: string]: any }) {
  return request<API.CategoryList>(`/api/categories`, {
    method: "GET",
    data: {
      method: "get",
      ...(options || {}),
    },
  });
}

// 获取标签 GET /api/tags
export async function getTags(options?: { [key: string]: any }) {
  return request<API.TagList>(`/api/tags`, {
    method: "GET",
    data: {
      method: "get",
      ...(options || {}),
    },
  });
}

// 新增标签 POST /api/tags
export async function addTag(options?: { name: string }) {
  return request<API.Tag>("/api/tags", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

// 删除标签 DELETE /api/tags
export async function deleteTag(options?: { name: string }) {
  return request<API.Tag>(`/api/tags`, {
    method: "DELETE",
    data: {
      method: "delete",
      ...(options || {}),
    },
  });
}

// 更新标签 PUT /api/tags
export async function updateTag(options?: { name: string; newName: string }) {
  return request<API.Tag>(`/api/tags`, {
    method: "PUT",
    data: {
      method: "put",
      ...(options || {}),
    },
  });
}

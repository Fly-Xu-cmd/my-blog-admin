import { request } from "@umijs/max";

// 新增动态 POST /api/dynamics
export async function addDynamic(options?: { [key: string]: any }) {
  return request<API.DynamicList>("/api/dynamics", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

// 获取动态列表 GET /api/dynamics
export async function getDynamics(options?: { [key: string]: any }) {
  return request<API.DynamicList>("/api/dynamics", {
    method: "GET",
    params: {
      method: "get",
      ...(options || {}),
    },
  });
}

// 更新动态 PUT /api/dynamics/:id
export async function updateDynamic(
  id: number,
  options?: { [key: string]: any }
) {
  return request<API.DynamicList>(`/api/dynamics/${id}`, {
    method: "PUT",
    data: {
      method: "put",
      ...(options || {}),
    },
  });
}

// 删除动态 DELETE /api/dynamics/:id
export async function deleteDynamic(id: number) {
  return request<API.DynamicList>(`/api/dynamics/${id}`, {
    method: "DELETE",
    data: {
      method: "delete",
    },
  });
}

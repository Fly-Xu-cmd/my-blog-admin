import { request } from "@umijs/max";

export async function login(options?: { [key: string]: any }) {
  return request<API.LoginResponse>("/api/login", {
    method: "POST",
    data: {
      method: "post",
      ...(options || {}),
    },
  });
}

export async function loginOut() {
  return request<API.LoginResponse>("/api/loginout", {
    method: "POST",
    data: {
      method: "post",
    },
  });
}
// 检验token
export async function checkToken(token: string) {
  if (!token) {
    return Promise.reject("token is required");
  }
  return request<API.LoginResponse>("/api/login/" + token, {
    method: "POST",
    data: {
      method: "post",
    },
  });
}

import { request } from "@umijs/max";

/**
 * 数据分析统计数据的返回结构（GET /api/analytics/stats）
 */
export type AnalyticsStats = {
  /** 今日统计（PV / UV） */
  today: { pv: number; uv: number };
  /** 按天的访问趋势 */
  trend: { date: string; pv: number; uv: number }[];
  /** 热门页面 Top 榜 */
  topPages: { path: string; count: number }[];
  /** 访问来源统计 */
  referrers: { host: string; count: number }[];
};

/**
 * 获取数据分析统计数据（仅管理员可访问，本接口单独携带 Authorization 头）
 * @param range 统计时间范围：'7d' 近 7 天 / '30d' 近 30 天
 * @returns 统计数据 Promise
 */
export async function getAnalyticsStats(range: "7d" | "30d") {
  return request<AnalyticsStats>("/api/analytics/stats", {
    method: "GET",
    params: { range },
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    },
  });
}

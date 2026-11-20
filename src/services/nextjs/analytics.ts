import { api } from '@/utils/api';
import type { ReportDates } from '@/components/ReportDateRange';
export type AnalyticsStats={today:{pv:number;uv:number};period:{pv:number;uv:number};trend:{date:string;pv:number;uv:number}[];topPages:{path:string;title:string;kind:string;url:string|null;count:number}[];referrers:{host:string;count:number}[];interactions:Record<string,number>;feedback:{status:string;count:number}[];range:string;start:string;end:string;updatedAt:string};
export function getAnalyticsStats(dates:ReportDates,kind='all',signal?:AbortSignal){return api<AnalyticsStats>('/api/analytics/stats?'+new URLSearchParams({...dates,kind}),{signal});}

import { Line } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Result,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import type { AnalyticsStats } from '@/services/nextjs';
import { getAnalyticsStats } from '@/services/nextjs';

/** 统计时间范围类型：近 7 天 / 近 30 天 */
type AnalyticsRange = '7d' | '30d';

/** 页面错误状态：401 未登录 / 403 无权限 / error 其他错误 */
type ErrorStatus = '401' | '403' | 'error';

/** 热门页面表格的列配置（路径可复制、访问量） */
const topPageColumns: ColumnsType<{ path: string; count: number }> = [
  {
    title: '路径',
    dataIndex: 'path',
    key: 'path',
    render: (text: string) => (
      <Typography.Text copyable={{ text }}>{text}</Typography.Text>
    ),
  },
  {
    title: '访问量',
    dataIndex: 'count',
    key: 'count',
    width: 100,
  },
];

/** 来源统计表格的列配置（来源 hostname、次数） */
const referrerColumns: ColumnsType<{ host: string; count: number }> = [
  {
    title: '来源',
    dataIndex: 'host',
    key: 'host',
  },
  {
    title: '次数',
    dataIndex: 'count',
    key: 'count',
    width: 100,
  },
];

/**
 * 数据分析看板页面
 * 展示今日 PV/UV 统计卡片、访问趋势折线图、热门页面 Top10 与访问来源统计
 */
const Analysis: React.FC = () => {
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ErrorStatus | null>(null);

  /**
   * 拉取统计数据并更新页面状态
   * @param currentRange 当前时间范围（'7d' / '30d'）
   */
  const fetchData = async (currentRange: AnalyticsRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsStats(currentRange);
      setStats(res);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('401');
      } else if (status === 403) {
        setError('403');
      } else {
        setError('error');
      }
    } finally {
      setLoading(false);
    }
  };

  // 切换时间范围时重新拉取数据
  useEffect(() => {
    fetchData(range);
  }, [range]);

  // 趋势图数据：将 pv / uv 拍平为双线数据，系列名使用中文便于 tooltip 展示
  const trendData =
    stats?.trend?.flatMap((item) => [
      { date: item.date, value: item.pv, type: '访问量（PV）' },
      { date: item.date, value: item.uv, type: '独立访客（UV）' },
    ]) ?? [];

  // 趋势图配置（参考 Welcome 页的 Line 配置写法）
  const lineConfig = {
    data: trendData,
    title: '访问趋势',
    xField: 'date',
    yField: 'value',
    point: {
      shapeField: 'square',
      sizeField: 4,
    },
    interaction: {
      tooltip: {
        marker: false,
      },
    },
    style: {
      lineWidth: 2,
    },
    colorField: 'type',
  };

  // 热门页面 Top10 数据
  const topPages = stats?.topPages?.slice(0, 10) ?? [];
  // 访问来源统计数据
  const referrers = stats?.referrers ?? [];

  // 请求失败时展示错误提示（401/403/其他），保证页面不白屏
  if (error) {
    return (
      <PageContainer title="数据分析">
        <Card>
          <Result
            status={
              error === '403' ? '403' : error === '401' ? 'warning' : 'error'
            }
            title={
              error === '401'
                ? '未登录或登录已过期'
                : error === '403'
                  ? '无权限访问'
                  : '数据加载失败'
            }
            subTitle={
              error === '401'
                ? '请重新登录后再查看数据分析看板（错误码 401）'
                : error === '403'
                  ? '该页面仅管理员可见（错误码 403）'
                  : '请稍后重试，或检查网络后重试'
            }
            extra={
              <Button type="primary" onClick={() => fetchData(range)}>
                重试
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="数据分析">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* 顶部：今日 PV / UV 统计卡片与时间范围切换 */}
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Card loading={loading}>
              <Statistic
                title="今日访问量（PV）"
                value={stats?.today?.pv ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card loading={loading}>
              <Statistic
                title="今日独立访客（UV）"
                value={stats?.today?.uv ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Segmented
              value={range}
              options={[
                { label: '近 7 天', value: '7d' },
                { label: '近 30 天', value: '30d' },
              ]}
              onChange={(value) => setRange(value as AnalyticsRange)}
            />
          </Col>
        </Row>
        {/* 访问趋势折线图（x 轴日期，PV / UV 双线） */}
        <Card>
          <Line {...lineConfig} />
        </Card>
        {/* 热门页面 Top10 与访问来源统计 */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="热门页面 Top10">
              <Table
                size="small"
                rowKey="path"
                loading={loading}
                pagination={false}
                columns={topPageColumns}
                dataSource={topPages}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="访问来源统计">
              <Table
                size="small"
                rowKey="host"
                loading={loading}
                pagination={false}
                columns={referrerColumns}
                dataSource={referrers}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </PageContainer>
  );
};

export default Analysis;

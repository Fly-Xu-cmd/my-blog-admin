import { Line } from '@ant-design/charts';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { getAnalyticsStats, type AnalyticsStats } from '@/services/nextjs';
import ReportDateRange, { recentDates } from '@/components/ReportDateRange';
const eventNames: Record<string, string> = {
  search: '搜索请求',
  search_empty: '无结果搜索',
  search_click: '搜索结果点击',
  featured_click: '主推文章点击',
  start_click: '入门文章点击',
  series_click: '推荐系列点击',
  subscribe_click: '订阅入口点击',
};
export default function Analysis() {
  const [dates, setDates] = useState(() => recentDates(7)),
    [kind, setKind] = useState('all'),
    [data, setData] = useState<AnalyticsStats | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void getAnalyticsStats(dates, kind, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setData(next);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dates, kind, reload]);
  const eventRows = Object.entries(eventNames).map(([event, name]) => ({
    event,
    name,
    count: data?.interactions[event] ?? 0,
  }));
  const noResults = data?.interactions.search
    ? Math.round(
        ((data.interactions.search_empty ?? 0) / data.interactions.search) *
          1000,
      ) / 10
    : null;
  const trend =
    data?.trend.flatMap((row) => [
      { date: row.date, count: row.pv, type: '访问量（PV）' },
      { date: row.date, count: row.uv, type: '独立访客（UV）' },
    ]) ?? [];
  const failed = !!error;
  return (
    <PageContainer
      title="数据分析"
      subTitle="了解读者从哪里来、看了什么，以及阅读入口是否有效"
      extra={
        <Space wrap>
          <ReportDateRange value={dates} onChange={setDates} />
          <Button onClick={() => setReload((n) => n + 1)} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      {failed && (
        <Alert
          type="error"
          showIcon
          message="数据读取失败"
          description={error}
          style={{ marginBottom: 20 }}
        />
      )}
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          {data
            ? '当前展示 ' +
              new Date(data.start).toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
              }) +
              ' 至 ' +
              new Date(Date.parse(data.end) - 1).toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
              })
            : '正在读取统计范围'}{' '}
          · UV 按浏览器标识估算，不代表真实人数。
        </Typography.Text>
        <Row gutter={[16, 16]}>
          {[
            { title: '今日访问量（PV）', value: data?.today.pv },
            { title: '今日独立访客（UV）', value: data?.today.uv },
            { title: '范围内访问量（PV）', value: data?.period.pv },
            { title: '范围内独立访客（UV）', value: data?.period.uv },
          ].map((row) => (
            <Col xs={12} lg={6} key={row.title}>
              <Card loading={loading}>
                <Statistic title={row.title} value={row.value ?? 0} />
              </Card>
            </Col>
          ))}
        </Row>
        <Card title="访问趋势">
          {trend.length ? (
            <Line
              height={280}
              data={trend}
              xField="date"
              yField="count"
              colorField="type"
            />
          ) : (
            <Empty description="暂无访问数据" />
          )}
        </Card>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={15}>
            <Card
              title="热门页面"
              extra={
                <Segmented
                  size="small"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '文章', value: 'post' },
                    { label: '技术笔记', value: 'TECH' },
                    { label: '随笔', value: 'ESSAY' },
                  ]}
                />
              }
            >
              <Table
                size="small"
                loading={loading}
                rowKey="path"
                pagination={false}
                dataSource={data?.topPages ?? []}
                columns={[
                  {
                    title: '页面',
                    render: (_, row) => (
                      <div>
                        {row.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {row.title} ↗
                          </a>
                        ) : (
                          <Typography.Text>
                            {row.title}（未公开）
                          </Typography.Text>
                        )}
                        <Typography.Paragraph
                          type="secondary"
                          style={{ margin: '4px 0 0', fontSize: 12 }}
                        >
                          {row.kind} · {row.path}
                        </Typography.Paragraph>
                      </div>
                    ),
                  },
                  { title: '访问量', dataIndex: 'count', width: 90 },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card title="访问来源">
              <Table
                size="small"
                loading={loading}
                rowKey="host"
                pagination={false}
                dataSource={data?.referrers ?? []}
                columns={[
                  { title: '来源域名', dataIndex: 'host' },
                  { title: '次数', dataIndex: 'count', width: 80 },
                ]}
              />
              <Typography.Text type="secondary">
                浏览器未提供来源的访问不出现在此表；来源无法完整反映所有转发渠道。
              </Typography.Text>
            </Card>
          </Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={15}>
            <Card title="搜索与阅读入口">
              <Typography.Paragraph type="secondary">
                按日汇总点击事件，不保存搜索词或读者操作明细；只从本次上线后开始积累。订阅入口点击不等于订阅成功。
              </Typography.Paragraph>
              <Statistic
                title="无结果搜索比例"
                value={noResults ?? '—'}
                suffix={noResults === null ? '' : '%'}
              />
              <Table
                size="small"
                rowKey="event"
                pagination={false}
                dataSource={eventRows}
                columns={[
                  { title: '行为', dataIndex: 'name' },
                  { title: '次数', dataIndex: 'count', width: 90 },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card title="本范围收到的反馈">
              <Table
                size="small"
                rowKey="status"
                pagination={false}
                dataSource={data?.feedback ?? []}
                columns={[
                  {
                    title: '当前状态',
                    dataIndex: 'status',
                    render: (status) =>
                      ({
                        NEW: '待处理',
                        RESOLVED: '已处理',
                        IGNORED: '已忽略',
                      })[status as 'NEW'] ?? status,
                  },
                  { title: '数量', dataIndex: 'count', width: 80 },
                ]}
              />
              <a href="/manage/feedback">前往处理反馈 →</a>
            </Card>
          </Col>
        </Row>
        <Typography.Text type="secondary">
          范围内 UV 整段时间去重，不能由每日 UV 相加。数据最多缓存 60 秒
          {data?.updatedAt
            ? ' · 更新于 ' +
              new Date(data.updatedAt).toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
              })
            : ''}
        </Typography.Text>
      </Space>
    </PageContainer>
  );
}

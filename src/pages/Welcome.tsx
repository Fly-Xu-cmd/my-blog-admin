import { Line, Pie } from '@ant-design/charts';
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
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
const labels: Record<string, string> = {
  post: '文章',
  TECH: '技术笔记',
  ESSAY: '随笔',
  dynamic: '动态',
};
type Timeline = { date: string; kind: string; count: number };
type Recent = {
  id: number;
  title: string | null;
  slug?: string;
  kind: string;
  resource?: string;
  published: boolean;
  updatedAt: string;
};
type Overview = {
  counts: { kind: string; total: number; published: number; drafts: number }[];
  createdTimeline: Timeline[];
  publishedTimeline: Timeline[];
  categories: { name: string; count: number }[];
  recent: Recent[];
  pendingFeedback: number;
  readingEntry: {
    featuredTitle: string | null;
    featuredConfigured: boolean;
    startCount: number;
    seriesCount: number;
    unavailableCount: number;
  };
  updatedAt: string;
};
export default function Welcome() {
  const [data, setData] = useState<Overview | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0),
    [timeline, setTimeline] = useState('published');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void api<{ data: Overview }>('/api/admin/content-stats', {
      signal: controller.signal,
    })
      .then((r) => {
        if (!controller.signal.aborted) setData(r.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  const trend =
    (timeline === 'published'
      ? data?.publishedTimeline
      : data?.createdTimeline
    )?.map((row) => ({ ...row, type: labels[row.kind] })) ?? [];
  return (
    <PageContainer
      title="内容概览"
      subTitle="内容发布、待处理事项与首页配置"
      extra={
        <Button onClick={() => setReload((n) => n + 1)} loading={loading}>
          刷新概览
        </Button>
      }
    >
      {error && (
        <Alert
          type="error"
          showIcon
          message="概览读取失败"
          description={error}
          style={{ marginBottom: 20 }}
        />
      )}
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          {(['post', 'TECH', 'ESSAY', 'dynamic'] as const).map((kind) => {
            const row = data?.counts.find((r) => r.kind === kind);
            return (
              <Col xs={12} lg={6} key={kind}>
                <Card loading={loading}>
                  <Statistic
                    title={'已公开' + labels[kind]}
                    value={row?.published ?? 0}
                  />
                  <Typography.Text type="secondary">
                    草稿 {row?.drafts ?? 0} · 总计 {row?.total ?? 0}
                  </Typography.Text>
                </Card>
              </Col>
            );
          })}
        </Row>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={9}>
            <Card title="需要关注" loading={loading}>
              <Space
                direction="vertical"
                size="large"
                style={{ width: '100%' }}
              >
                <div>
                  <Statistic
                    title="待处理反馈"
                    value={data?.pendingFeedback ?? 0}
                  />
                  <a href="/manage/feedback">查看反馈 →</a>
                </div>
                <div>
                  <Typography.Title level={5}>首页阅读入口</Typography.Title>
                  <p>
                    主推：
                    {data?.readingEntry.featuredTitle ?? '未配置可展示文章'}
                  </p>
                  <p>
                    入门文章 {data?.readingEntry.startCount ?? 0} 篇 · 推荐系列{' '}
                    {data?.readingEntry.seriesCount ?? 0} 个
                  </p>
                  {!!data?.readingEntry.unavailableCount && (
                    <Alert
                      type="warning"
                      message={
                        data.readingEntry.unavailableCount +
                        ' 项配置对应内容已隐藏或删除'
                      }
                      style={{ marginBottom: 12 }}
                    />
                  )}
                  <a href="/manage/reading-entry">调整阅读入口 →</a>
                </div>
                <Space wrap>
                  <a href="/new/post">写新文章</a>
                  <a href="/manage/note">管理笔记</a>
                  <a href="/manage/site">站点配置</a>
                </Space>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={15}>
            <Card title="最近编辑" loading={loading}>
              <Table<Recent>
                size="small"
                pagination={false}
                dataSource={data?.recent ?? []}
                rowKey={(row) => row.kind + ':' + row.id}
                columns={[
                  {
                    title: '内容',
                    render: (_, row) => {
                      const kind =
                        row.resource === 'note'
                          ? 'note'
                          : row.kind === 'dynamic'
                            ? 'dynamic'
                            : 'post';
                      return (
                        <>
                          <Tag>{labels[row.kind]}</Tag>
                          <a
                            href={
                              '/manage/content-preview?kind=' +
                              kind +
                              '&slug=' +
                              encodeURIComponent(row.slug ?? String(row.id))
                            }
                          >
                            {row.title || '未命名动态'} ↗
                          </a>
                        </>
                      );
                    },
                  },
                  {
                    title: '状态',
                    dataIndex: 'published',
                    width: 85,
                    render: (published) => (
                      <Tag color={published ? 'green' : 'default'}>
                        {published ? '已公开' : '草稿'}
                      </Tag>
                    ),
                  },
                  {
                    title: '更新',
                    dataIndex: 'updatedAt',
                    width: 100,
                    render: (value) =>
                      new Date(value).toLocaleDateString('zh-CN', {
                        timeZone: 'Asia/Shanghai',
                      }),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card
              title="近 30 天内容趋势"
              extra={
                <Segmented
                  value={timeline}
                  onChange={setTimeline}
                  options={[
                    { label: '首次发布', value: 'published' },
                    { label: '创建内容', value: 'created' },
                  ]}
                />
              }
            >
              <Typography.Paragraph type="secondary">
                创建包含草稿和同步笔记；首次发布按首次发布时间统计，隐藏或再次发布不会重复计数。
              </Typography.Paragraph>
              {trend.length ? (
                <Line
                  height={260}
                  data={trend}
                  xField="date"
                  yField="count"
                  colorField="type"
                />
              ) : (
                <Empty description="这段时间暂无内容变化" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="公开文章分类">
              {data?.categories.length ? (
                <Pie
                  height={260}
                  data={data.categories}
                  angleField="count"
                  colorField="name"
                />
              ) : (
                <Empty description="暂无公开文章" />
              )}
            </Card>
          </Col>
        </Row>
        <Typography.Text type="secondary">
          数据最多缓存 60 秒
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

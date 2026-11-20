import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import SafeMarkdown from '@/components/SafeMarkdown';
import { api } from '@/utils/api';
type Detail = { title: string; content: string; published: boolean };
export default function ContentPreview() {
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(location.search),
      kind = params.get('kind'),
      slug = params.get('slug');
    if (!['post', 'note', 'dynamic'].includes(kind ?? '') || !slug) {
      setError('预览地址无效');
      return;
    }
    const controller = new AbortController();
    void api<{ data: Detail }>(
      '/api/' +
        (kind === 'post' ? 'posts' : kind === 'note' ? 'notes' : 'dynamics') +
        '/' +
        encodeURIComponent(slug) +
        '?scope=admin',
      { signal: controller.signal },
    )
      .then((r) => {
        if (!controller.signal.aborted) setData(r.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <PageContainer
      title={data?.title ?? '内容预览'}
      subTitle="仅管理员可见的完整预览"
    >
      <Card>
        {error ? (
          <Alert type="error" message={error} showIcon />
        ) : data ? (
          <>
            <Tag color={data.published ? 'green' : 'default'}>
              {data.published ? '已公开' : '未公开'}
            </Tag>
            <Typography.Paragraph type="secondary">
              这里展示原文，反馈内容不会自动修改正文。
            </Typography.Paragraph>
            <SafeMarkdown source={data.content} />
          </>
        ) : (
          <Spin />
        )}
      </Card>
    </PageContainer>
  );
}

import { Line, Pie } from '@ant-design/charts';
import { PageContainer } from '@ant-design/pro-components';
import { App, Card, Space } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
export default function Welcome() {
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void api('/api/admin/content-stats')
      .then((r) => setData(r.data))
      .catch((e) => message.error(e.message));
  }, [message]);
  if (!data)
    return (
      <PageContainer>
        <p>正在加载内容统计…</p>
      </PageContainer>
    );
  const timeline = [
    ...data.postTimeline.map((r: any) => ({ ...r, type: '文章' })),
    ...data.dynamicTimeline.map((r: any) => ({ ...r, type: '动态' })),
  ];
  return (
    <PageContainer title="内容概览">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card title="内容创建趋势">
          <Line
            data={timeline}
            xField="date"
            yField="count"
            colorField="type"
          />
        </Card>
        <Card title="文章分类">
          <Pie data={data.categories} angleField="count" colorField="name" />
        </Card>
      </Space>
    </PageContainer>
  );
}

import { MarkdownEditor } from '@/components';
import { addDynamic } from '@/services/nextjs/index';
import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Col, Flex, Input, Row, Typography } from 'antd';
import { useId, useState } from 'react';

const baseUrl = process.env.BASE_API_URL || 'http://localhost:3000/';

const NewDynamic: React.FC = () => {
  const { message } = App.useApp();
  const titleId = useId();
  const excerptId = useId();
  const contentId = useId();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState(
    '## 在这里输入内容\n\n- 支持列表\n- 支持引用\n- 支持代码块',
  );

  const onSubmit = async (published = true) => {
    if (!content) {
      message.error('请输入内容');
      return;
    }

    try {
      const res: any = await addDynamic({
        title,
        published,
        excerpt,
        content,
      });

      if (res.ok) {
        message.success('发布成功');
        setTitle('');
        setExcerpt('');
        setContent('## 在这里输入内容\n\n- 支持列表\n- 支持引用\n- 支持代码块');
      } else {
        message.error('发布失败');
      }
    } catch (_error) {
      message.error('发布失败');
    }
  };

  return (
    <PageContainer
      title="新增动态"
      subTitle="适合快速发布短内容、状态和想法"
      extra={
        <>
          <Button onClick={() => onSubmit(false)}>保存草稿</Button>
          <Button type="primary" onClick={() => onSubmit(true)}>
            发布动态
          </Button>
        </>
      }
    >
      <Row justify="center">
        <Col xs={24} lg={16}>
          <Card styles={{ body: { paddingTop: 20 } }}>
            <Flex vertical gap={24}>
              <Flex vertical gap={8}>
                <Typography.Text strong>标题</Typography.Text>
                <Input
                  id={titleId}
                  placeholder="请输入标题（可选）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  size="large"
                  allowClear
                />
              </Flex>

              <Flex vertical gap={8}>
                <Typography.Text strong>摘要</Typography.Text>
                <Input.TextArea
                  id={excerptId}
                  placeholder="一句话摘要（可选）"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Flex>

              <Flex vertical gap={8}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>内容</Typography.Text>
                  <Typography.Text type="secondary">
                    支持列表、引用、代码块等 Markdown 语法
                  </Typography.Text>
                </Flex>
                <MarkdownEditor
                  id={contentId}
                  height={480}
                  value={content}
                  onChange={setContent}
                  baseUrl={baseUrl}
                />
              </Flex>
            </Flex>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default NewDynamic;

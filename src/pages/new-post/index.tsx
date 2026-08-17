import { MarkdownEditor, SummaryInput, TitleInput } from '@/components';
import { addPost, getCategories, getTags } from '@/services/nextjs/index';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useId, useMemo, useState } from 'react';

const baseUrl = process.env.BASE_API_URL || 'http://localhost:3000/';

// 七牛云返回的是完整 URL；只有相对路径才需要拼接 baseUrl
const resolveImageUrl = (url?: string) =>
  url && !/^https?:\/\//.test(url) ? baseUrl + url : url;

const NewPost: React.FC = () => {
  const { message } = App.useApp();
  const titleId = useId();
  const excerptId = useId();
  const coverId = useId();
  const categoryId = useId();
  const tagsId = useId();
  const contentId = useId();

  const [title, setTitle] = useState<string>();
  const [excerpt, setExcerpt] = useState<string>();
  const [content, setContent] = useState<string>(
    '## 在此处输入内容\n\n- 支持列表\n- 支持引用\n- 支持代码块',
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>('');
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [categoryValue, setCategoryValue] = useState<number | undefined>();
  const [categoryOptions, setCategoryOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [tags, setTags] = useState<string[] | undefined>([]);
  const [tagOptions, setTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [autoGenerateTitle, setAutoGenerateTitle] = useState(false);
  const [autoGenerateSummary, setAutoGenerateSummary] = useState(false);

  const selectedTags = useMemo(() => tags || [], [tags]);

  useEffect(() => {
    getCategories()
      .then((r) => {
        if (r.ok) {
          const { data } = r;
          return data;
        }
        throw new Error(`Request failed: ${r.error}`);
      })
      .then((categories) =>
        setCategoryOptions(
          categories?.map((cat) => ({
            label: cat.name || '',
            value: cat.id || 0,
          })) || [],
        ),
      )
      .catch((err) => console.error('加载分类失败:', err));

    getTags()
      .then((r) => {
        if (r.ok) {
          const { data } = r;
          return data;
        }
        throw new Error(`Request failed: ${r.error}`);
      })
      .then((loadedTags) => {
        setTagOptions(
          loadedTags?.map((tag) => ({
            label: tag.name || '',
            value: tag.name || '',
          })) || [],
        );
      })
      .catch((err) => console.error('加载标签失败:', err));
  }, []);

  const submitPost = async (nextPublished: boolean) => {
    if ((!title && !autoGenerateTitle) || !content) {
      message.error('缺少标题和内容');
      return;
    }

    try {
      const res: any = await addPost({
        title,
        excerpt,
        content,
        cover: imageUrl,
        categoryId: categoryValue,
        published: nextPublished,
        tags,
        autoGenerateTitle,
        autoGenerateSummary,
      });

      if (res.ok) {
        message.success(nextPublished ? '发布成功' : '已保存为私密');
        setTitle('');
        setExcerpt('');
        setContent('## 在此处输入内容\n\n- 支持列表\n- 支持引用\n- 支持代码块');
        setImageUrl('');
        setFileList([]);
        setCategoryValue(undefined);
        setTags([]);
        setAutoGenerateTitle(false);
        setAutoGenerateSummary(false);
      } else {
        message.error('发布失败');
      }
    } catch (_error) {
      message.error('发布失败');
    }
  };

  const uploadButton = (
    <div style={{ width: 104, height: 104, display: 'grid', placeItems: 'center' }}>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传封面</div>
    </div>
  );

  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    setFileList([...fileList, file]);
    if (!isJpgOrPng) {
      message.error('只能上传 JPG/PNG 格式的图片!');
    }
    setLoading(true);
    return isJpgOrPng;
  };

  const handleChange = (info: any) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.status === 'done') {
      setImageUrl(info.file.response.url);
      setLoading(false);
    }
    if (info.file.status === 'error') {
      message.error(`上传失败!${info.file.error}`);
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="新增博客"
      subTitle="完善标题、摘要、分类、标签和正文内容后即可发布"
      extra={
        <Space>
          <Button onClick={() => submitPost(false)}>保存草稿</Button>
          <Button type="primary" onClick={() => submitPost(true)}>
            发布博客
          </Button>
        </Space>
      }
    >
      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} lg={16}>
          <Card
            title="文章内容"
            extra={<Tag color="blue">Markdown</Tag>}
            styles={{ body: { paddingTop: 16 } }}
          >
            <Flex vertical gap={24}>
              <Flex vertical gap={8}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>标题</Typography.Text>
                  <Switch
                    size="small"
                    checked={autoGenerateTitle}
                    onChange={setAutoGenerateTitle}
                    checkedChildren="自动生成"
                    unCheckedChildren="手动输入"
                  />
                </Flex>
                <TitleInput
                  id={titleId}
                  value={title}
                  disabled={autoGenerateTitle}
                  onTitleChange={(val: string) => setTitle(val)}
                />
              </Flex>

              <Flex vertical gap={8}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>摘要</Typography.Text>
                  <Switch
                    size="small"
                    checked={autoGenerateSummary}
                    onChange={setAutoGenerateSummary}
                    checkedChildren="自动生成"
                    unCheckedChildren="手动输入"
                  />
                </Flex>
                <SummaryInput
                  id={excerptId}
                  value={excerpt}
                  disabled={autoGenerateSummary}
                  onSummaryChange={(val: string) => setExcerpt(val)}
                />
              </Flex>

              <Flex vertical gap={8}>
                <Flex align="center" justify="space-between">
                  <Typography.Text strong>内容</Typography.Text>
                  <Typography.Text type="secondary">
                    支持列表、引用、代码块、表格等 Markdown 语法
                  </Typography.Text>
                </Flex>
                <MarkdownEditor
                  id={contentId}
                  height={560}
                  value={content}
                  onChange={setContent}
                  baseUrl={baseUrl}
                />
              </Flex>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="发布设置" styles={{ body: { paddingTop: 16 } }}>
            <Flex vertical gap={20}>
              <div>
                <Typography.Text strong>封面图片</Typography.Text>
                <div style={{ marginTop: 12 }}>
                  <Upload
                    id={coverId}
                    name="file"
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    fileList={fileList}
                    action="/api/upload-qiniu"
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                  >
                    {imageUrl ? (
                      <img
                        draggable={false}
                        src={resolveImageUrl(imageUrl)}
                        alt="cover"
                        style={{ width: '100%', borderRadius: 12 }}
                      />
                    ) : (
                      uploadButton
                    )}
                  </Upload>
                </div>
              </div>

              <div>
                <Typography.Text strong>分类</Typography.Text>
                <Select
                  id={categoryId}
                  placeholder="请选择分类"
                  allowClear
                  style={{ width: '100%', marginTop: 8 }}
                  options={categoryOptions}
                  value={categoryValue}
                  onChange={(e) => {
                    setCategoryValue(e);
                  }}
                />
              </div>

              <div>
                <Typography.Text strong>标签</Typography.Text>
                <Select
                  id={tagsId}
                  placeholder="请选择标签(多选)"
                  style={{ width: '100%', marginTop: 8 }}
                  mode="multiple"
                  allowClear
                  value={tags}
                  options={
                    tagOptions.length
                      ? tagOptions
                      : [
                          { label: 'React', value: 'React' },
                          { label: 'Next.js', value: 'Next.js' },
                        ]
                  }
                  onChange={(e) => {
                    setTags(e as string[]);
                  }}
                />
                <div style={{ marginTop: 12 }}>
                  {selectedTags.map((tag) => (
                    <Tag key={tag} color="geekblue">
                      {tag}
                    </Tag>
                  ))}
                </div>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default NewPost;

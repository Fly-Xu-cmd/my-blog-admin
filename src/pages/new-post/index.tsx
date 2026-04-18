import { MarkdownEditor, SummaryInput, TitleInput } from "@/components";
import { addPost, getCategories, getTags } from "@/services/nextjs/index";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import {
  Button,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Upload,
} from "antd";
import { useEffect, useId, useState } from "react";

const baseUrl = process.env.BASE_API_URL || "http://localhost:3000/";

const NewPost: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  // 生成唯一ID
  const titleId = useId();
  const excerptId = useId();
  const coverId = useId();
  const categoryId = useId();
  const tagsId = useId();
  const contentId = useId();

  // 博客发布表单状态
  const [title, setTitle] = useState<string>();
  const [excerpt, setExcerpt] = useState<string>();
  const [content, setContent] = useState<string>("## 在此处输入内容");
  const [imageUrl, setImageUrl] = useState<string | undefined>("");
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(true);
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

  useEffect(() => {
    getCategories()
      .then((r) => {
        if (r.ok) {
          const { data } = r;
          return data;
        } else {
          throw new Error(`Request failed: ${r.error}`);
        }
      })
      .then((categories) =>
        setCategoryOptions(
          categories?.map((cat) => ({
            label: cat.name || "",
            value: cat.id || 0,
          })) || []
        )
      )
      .catch((err) => console.error("加载分类失败:", err));

    getTags()
      .then((r) => {
        if (r.ok) {
          const { data } = r;
          return data;
        } else {
          throw new Error(`Request failed: ${r.error}`);
        }
      })
      .then((tags) => {
        setTagOptions(
          tags?.map((tag) => ({
            label: tag.name || "",
            value: tag.name || "",
          })) || []
        );
      })
      .catch((err) => console.error("加载标签失败:", err));
  }, []);

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );
  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    setFileList([...fileList, file]);
    if (!isJpgOrPng) {
      messageApi.error("只能上传 JPG/PNG 格式的图片!");
    }
    setLoading(true);
    return isJpgOrPng;
  };
  const handleChange = (info: any) => {
    if (info.file.status === "uploading") {
      return;
    }
    if (info.file.status === "done") {
      console.log("上传成功:", info.file.response);
      setImageUrl(info.file.response.url);
      setLoading(false);
    }
    if (info.file.status === "error") {
      messageApi.error(`上传失败!${info.file.error}`);
      setLoading(false);
    }
  };
  const publishedPost = () => {
    setPublished(true);
    if ((!title && !autoGenerateTitle) || !content) {
      messageApi.error("缺少标题和内容");
      return;
    }
    try {
      addPost({
        title,
        excerpt,
        content,
        cover: imageUrl,
        categoryId: categoryValue,
        published,
        tags,
        autoGenerateTitle,
        autoGenerateSummary,
      }).then((res: any) => {
        if (res.ok) {
          messageApi.success("发布成功");
          setTitle("");
          setExcerpt("");
          setContent("");
          setImageUrl("");
          setFileList([]);
          setCategoryValue(undefined);
          setTags([]);
          setAutoGenerateTitle(false);
          setAutoGenerateSummary(false);
        } else {
          messageApi.error("发布失败");
        }
      });
    } catch (_error) {
      messageApi.error("发布失败");
    }
  };
  const privatePost = () => {
    setPublished(false);
    if ((!title && !autoGenerateTitle) || !content) {
      messageApi.error("缺少标题和内容");
      return;
    }
    try {
      addPost({
        title,
        excerpt,
        content,
        cover: imageUrl,
        categoryId: categoryValue,
        published,
        tags,
        autoGenerateTitle,
        autoGenerateSummary,
      }).then((res: any) => {
        if (res.ok) {
          messageApi.success("发布成功");
          setTitle("");
          setExcerpt("");
          setContent("");
          setImageUrl("");
          setFileList([]);
          setCategoryValue(undefined);
          setTags([]);
          setAutoGenerateTitle(false);
          setAutoGenerateSummary(false);
        } else {
          messageApi.error("发布失败");
        }
      });
    } catch (_error) {
      messageApi.error("发布失败");
    }
  };
  return (
    <>
      {contextHolder}
      <PageContainer
        extra={
          <Popconfirm
            title="选择发布方式"
            okText="公开发布"
            cancelText="私密发布"
            onConfirm={publishedPost}
            onCancel={privatePost}
          >
            <Button type="primary">发布</Button>
          </Popconfirm>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
              <label htmlFor={titleId}>标题:</label>
              <Switch
                size="small"
                checked={autoGenerateTitle}
                onChange={setAutoGenerateTitle}
                checkedChildren="自动生成"
                unCheckedChildren="手动输入"
              />
            </Space>
            <TitleInput
              id={titleId}
              value={title}
              disabled={autoGenerateTitle}
              onTitleChange={(val: string) => setTitle(val)}
            />
          </Space>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
              <label htmlFor={excerptId}>摘要:</label>
              <Switch
                size="small"
                checked={autoGenerateSummary}
                onChange={setAutoGenerateSummary}
                checkedChildren="自动生成"
                unCheckedChildren="手动输入"
              />
            </Space>
            <SummaryInput
              id={excerptId}
              value={excerpt}
              disabled={autoGenerateSummary}
              onSummaryChange={(val: string) => setExcerpt(val)}
            />
          </Space>
          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor={coverId}>封面图片:</label>
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
                  src={baseUrl + imageUrl}
                  alt="file"
                  style={{ width: "100%" }}
                />
              ) : (
                uploadButton
              )}
            </Upload>
          </Space>

          <Space direction="vertical">
            <label htmlFor={categoryId}>分类:</label>
            <Select
              id={categoryId}
              placeholder="请选择分类"
              allowClear
              style={{ width: "100%" }}
              options={categoryOptions || []}
              value={categoryValue}
              onChange={(e) => {
                setCategoryValue(e);
              }}
            />
          </Space>

          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor={tagsId}>标签:</label>
            <Select
              id={tagsId}
              placeholder="请选择标签(多选)"
              style={{ width: "100%" }}
              mode="multiple"
              allowClear
              value={tags}
              options={
                tagOptions || [
                  {
                    label: "React",
                    value: "React",
                  },
                  {
                    label: "Next.js",
                    value: "Next.js",
                  },
                ]
              }
              onChange={(e) => {
                setTags(e as string[]);
              }}
            />
          </Space>

          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor={contentId}>内容:</label>
            <MarkdownEditor
              id={contentId}
              height={500}
              value={content}
              onChange={setContent}
              baseUrl={baseUrl}
            />
          </Space>
        </Space>
      </PageContainer>
    </>
  );
};
export default NewPost;

import { MarkdownEditor } from "@/components";
import { addPost } from "@/services/nextjs/index";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import {
  Button,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Upload,
} from "antd";
import { useEffect, useState } from "react";
import { CategoryResponse, TagResponse } from "./model";

const baseUrl = "http://localhost:3000";
const NewPost: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  // 博客发布表单状态
  const [title, setTitle] = useState<string>();
  const [excerpt, setExcerpt] = useState<string>();
  const [content, setContent] = useState<string>("## 在此处输入内容");
  const [imageUrl, setImageUrl] = useState<string | undefined>("");
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(true);
  const [fileList, setFileList] = useState<any[]>([]);
  const [category, setCategory] = useState<number>();
  const [categoryOptions, setCategoryOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed: ${r.status}`);
        }
        const text: CategoryResponse = await r.json();
        if (!text.ok) return []; // 防止空响应
        return text.data;
      })
      .then((categories) =>
        setCategoryOptions(
          categories.map((cat) => ({ label: cat.name, value: cat.id }))
        )
      )
      .catch((err) => console.error("加载分类失败:", err));

    fetch("/api/tags")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Request failed: ${r.status}`);
        }
        const text: TagResponse = await r.json();
        if (!text.ok) return []; // 防止空响应
        return text.data;
      })
      .then((tags) => {
        setTags(tags.map((tag) => tag.name));
        setTagOptions(
          tags.map((tag) => ({ label: tag.name, value: tag.name }))
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
      setImageUrl(baseUrl + info.file.response.url);
      setLoading(false);
    }
    if (info.file.status === "error") {
      messageApi.error(`上传失败!${info.file.error}`);
      setLoading(false);
    }
  };
  const publishedPost = () => {
    setPublished(true);
    if (!title || !content) {
      messageApi.error("缺少标题和内容");
      return;
    }
    try {
      addPost({
        title,
        excerpt,
        content,
        cover: imageUrl,
        category,
        published,
        tags,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
      }).then((res: any) => {
        if (res.ok) {
          messageApi.success("发布成功");
          setTitle("");
          setExcerpt("");
          setContent("");
          setImageUrl("");
          setFileList([]);
          setCategory(undefined);
          setTags([]);
        } else {
          messageApi.error("发布失败");
        }
      });
    } catch (error) {
      messageApi.error("发布失败");
    }
  };
  const privatePost = () => {
    setPublished(false);
    if (!title || !content) {
      messageApi.error("缺少标题和内容");
      return;
    }
    try {
      addPost({
        title,
        excerpt,
        content,
        cover: imageUrl,
        category,
        published,
        tags,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
      }).then((res: any) => {
        if (res.ok) {
          messageApi.success("发布成功");
          setTitle("");
          setExcerpt("");
          setContent("");
          setImageUrl("");
          setFileList([]);
          setCategory(undefined);
          setTags([]);
        } else {
          messageApi.error("发布失败");
        }
      });
    } catch (error) {
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
          <Space direction="vertical">
            <label htmlFor="title">标题:</label>
            <Input
              id="title"
              placeholder="请输入标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Space>
          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor="excerpt">摘要:</label>
            <Input.TextArea
              id="excerpt"
              cols={100}
              placeholder="请输入摘要"
              maxLength={200}
              showCount={true}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </Space>
          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor="image">封面图片:</label>
            <Upload
              name="file"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              fileList={fileList}
              action="/api/upload"
              beforeUpload={beforeUpload}
              onChange={handleChange}
            >
              {imageUrl ? (
                <img
                  draggable={false}
                  src={imageUrl}
                  alt="file"
                  style={{ width: "100%" }}
                />
              ) : (
                uploadButton
              )}
            </Upload>
          </Space>

          <Space direction="vertical">
            <label htmlFor="categories">分类:</label>
            <Select
              id="categories"
              placeholder="请选择分类"
              allowClear
              style={{ width: "100%" }}
              options={categoryOptions || []}
              onChange={(e) => setCategory(e as number)}
            />
          </Space>

          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor="tags">标签:</label>
            <Select
              id="tags"
              placeholder="请选择标签(多选)"
              style={{ width: "100%" }}
              mode="multiple"
              allowClear
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
              onChange={(e) => setTags(e as string[])}
            />
          </Space>

          <Space direction="vertical" style={{ width: "100%" }}>
            <label htmlFor="content">内容:</label>
            <MarkdownEditor
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

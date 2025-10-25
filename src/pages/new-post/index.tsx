import { addPost } from "@/services/nextjs/index";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import MDEditor from "@uiw/react-md-editor";
import { Button, Input, message, Select, Space, Upload } from "antd";
import { useState } from "react";

const NewPost: React.FC = () => {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState<string | undefined>("");
  const [imageUrl, setImageUrl] = useState<string | undefined>("");
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);

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
      message.error("只能上传 JPG/PNG 格式的图片!");
    }
    setLoading(true);
    return isJpgOrPng;
  };
  const handleChange = (info: any) => {
    if (info.file.status === "uploading") {
      return;
    }
    if (info.file.status === "done") {
      setImageUrl(info.file.response.url);
      setLoading(false);
    }
    if (info.file.status === "error") {
      message.error(`上传失败!${info.file.error}`);
      setLoading(false);
    }
  };
  const onSubmit = () => {
    try {
      addPost({
        title,
        excerpt,
        content,
        cover: imageUrl,
        tags,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
      }).then((res: any) => {
        if (res.ok) {
          message.success("发布成功");
          setTitle("");
          setExcerpt("");
          setContent("");
          setImageUrl("");
          setFileList([]);
          setTags([]);
        } else {
          message.error("发布失败");
        }
      });
    } catch (error) {
      message.error("发布失败");
    }
  };
  return (
    <PageContainer
      extra={
        <Button type="primary" onClick={onSubmit}>
          发布
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space direction="vertical">
          <label htmlFor="title">标题:</label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Space>
        <Space direction="vertical" style={{ width: "100%" }}>
          <label htmlFor="excerpt">摘要:</label>
          <Input.TextArea
            id="excerpt"
            cols={100}
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
            action="/nextjs/api/upload"
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
        <Space direction="vertical" style={{ width: "100%" }}>
          <label htmlFor="tags">标签:</label>
          <Select
            id="tags"
            placeholder="请选择标签(多选)"
            mode="multiple"
            allowClear
            style={{ width: "100%" }}
            options={[
              {
                label: "React",
                value: "React",
              },
              {
                label: "Next.js",
                value: "Next.js",
              },
            ]}
            onChange={(e) => setTags(e as string[])}
          />
        </Space>
        <Space direction="vertical" style={{ width: "100%" }}>
          <label htmlFor="content">内容:</label>
          <MDEditor
            style={{ width: "100%" }}
            height={500}
            id="content"
            value={content}
            onChange={(value) => setContent(value)}
          />
        </Space>
      </Space>
    </PageContainer>
  );
};
export default NewPost;

import { addDynamic } from "@/services/nextjs/index";
import { PageContainer } from "@ant-design/pro-components";
import MDEditor from "@uiw/react-md-editor";
import { Button, Input, message, Space } from "antd";
import React, { useState } from "react";

const NewDynamic: React.FC = () => {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState<string | undefined>(
    "## 在这里输入内容"
  );
  const onSubmit = () => {
    if (!content) {
      message.error("请输入内容");
      return;
    }
    try {
      addDynamic({
        title,
        excerpt,
        content,
      }).then((res: any) => {
        if (res.ok) {
          message.success("发布成功");
          setTitle("");
          setExcerpt("");
          setContent("");
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
        <Space>
          <label htmlFor="title">标题:</label>
          <Input
            id="title"
            placeholder="请输入标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Space>
        <Space>
          <label htmlFor="excerpt">摘要:</label>
          <Input.TextArea
            id="excerpt"
            cols={100}
            placeholder="请输入摘要"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
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
export default NewDynamic;

import { LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import { Button, Input, message } from "antd";
import { type CSSProperties, useState } from "react";

// 标题输入组件 - 支持AI自动生成功能
// @param content - 正文内容，用于AI生成标题
// @param onTitleChange - 标题变化回调函数
export default function TitleInput({
  content,
  keyword,
  onTitleChange,
}: {
  content: string | undefined;
  keyword?: string | undefined;
  onTitleChange: (val: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  const handleAiGenerate = async () => {
    // 1. 简单校验
    if (!content || content.length < 50) {
      message.warning("请先输入足够的正文内容（至少50字）！");
      return;
    }

    setLoading(true);

    try {
      // 2. 调用后端生成标题
      const res = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "请求失败");
      }

      // 3. 回填数据并提示成功
      const generatedTitle = data.title;
      onTitleChange(generatedTitle);
      setTitle(generatedTitle);
      message.success("标题生成成功！");
    } catch (error: any) {
      console.error("生成标题失败:", error);
      message.error(`生成出错: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 容器样式
  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    transition: "all 0.3s ease",
  };

  // AI按钮样式
  const aiButtonStyle: CSSProperties = {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
    borderRadius: 6,
    fontSize: 12,
    padding: "6px 12px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  };

  return (
    <div style={containerStyle} className="title-input-container">
      {/* 标题输入框 */}
      <Input
        placeholder="请输入标题或点击右侧AI按钮自动生成..."
        value={title}
        onChange={(e) => {
          const value = e.target.value;
          // 标题长度限制（50字符）
          const truncatedValue = value.substring(0, 50);
          setTitle(truncatedValue);
          onTitleChange(truncatedValue);
        }}
        style={{
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.5,
          padding: "12px 10px",
          transition: "all 0.3s ease",
          paddingRight: 100, // 给AI按钮留位置
        }}
        className="title-input"
        maxLength={50}
      />

      {/* AI 生成按钮 - 悬浮在输入框右侧 */}
      <Button
        type="primary"
        icon={loading ? <LoadingOutlined spin /> : <RobotOutlined />}
        onClick={handleAiGenerate}
        disabled={loading}
        style={aiButtonStyle}
        className="ai-generate-button"
        size="small"
      >
        {loading ? "生成中..." : "AI 生成"}
      </Button>
    </div>
  );
}

import { LoadingOutlined, RobotOutlined } from "@ant-design/icons";
import { Button, Input, message } from "antd";
import { type CSSProperties, useState } from "react";

// 摘要输入组件 - 支持AI自动生成功能
// @param content - 正文内容，用于AI生成摘要
// @param onSummaryChange - 摘要变化回调函数
export default function SummaryInput({
  content,
  onSummaryChange,
}: {
  content: string;
  onSummaryChange: (val: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  const handleAiGenerate = async () => {
    // 1. 简单校验
    if (!content || content.length < 100) {
      message.warning("请先输入足够的正文内容（至少100字）！");
      return;
    }

    setLoading(true);

    try {
      // 2. 调用后端
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "请求失败");
      }

      // 3. 回填数据并提示成功
      const generatedSummary = data.summary;
      onSummaryChange(generatedSummary);
      setSummary(generatedSummary);
      message.success("摘要生成成功！");
    } catch (error: any) {
      console.error("生成摘要失败:", error);
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
    bottom: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 6,
    fontSize: 12,
    padding: "6px 12px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  };

  return (
    <div style={containerStyle} className="summary-input-container">
      {/* 摘要输入框 */}
      <Input.TextArea
        placeholder="请输入摘要或点击右下角AI按钮自动生成..."
        value={summary}
        onChange={(e) => {
          const value = e.target.value;
          setSummary(value);
          onSummaryChange(value);
        }}
        autoSize={{ minRows: 4, maxRows: 10 }}
        style={{
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.6,
          padding: "6px 0px",
          resize: "vertical",
          transition: "all 0.3s ease",
        }}
        maxLength={200}
        showCount
        className="summary-textarea"
      />

      {/* AI 生成按钮 - 悬浮在输入框右下角 */}
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

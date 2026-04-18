import { Input } from 'antd';
import type { CSSProperties } from 'react';

// 摘要输入组件
// @param onSummaryChange - 摘要变化回调函数
export default function SummaryInput({
  onSummaryChange,
  id,
  value,
  disabled,
}: {
  onSummaryChange: (val: string) => void;
  id?: string;
  value?: string;
  disabled?: boolean;
}) {
  // 容器样式
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    transition: 'all 0.3s ease',
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div style={containerStyle} className="summary-input-container">
      {/* 摘要输入框 */}
      <Input.TextArea
        id={id}
        placeholder={disabled ? '将在发布时自动生成...' : '请输入摘要...'}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          onSummaryChange(val);
        }}
        autoSize={{ minRows: 4, maxRows: 10 }}
        style={{
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.6,
          padding: '12px 16px 12px 16px',
          resize: 'vertical',
          transition: 'all 0.3s ease',
        }}
        className="summary-textarea"
      />
    </div>
  );
}

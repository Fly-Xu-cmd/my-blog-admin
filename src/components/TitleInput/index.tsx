import { Input } from 'antd';
import type { CSSProperties } from 'react';

// 标题输入组件
// @param onTitleChange - 标题变化回调函数
export default function TitleInput({
  onTitleChange,
  id,
  value,
  disabled,
}: {
  onTitleChange: (val: string) => void;
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
    <div style={containerStyle} className="title-input-container">
      {/* 标题输入框 */}
      <Input
        id={id}
        placeholder={disabled ? '将在发布时自动生成...' : '请输入标题...'}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          // 标题长度限制（50字符）
          const truncatedValue = val.substring(0, 50);
          onTitleChange(truncatedValue);
        }}
        style={{
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.5,
          padding: '12px 10px',
          transition: 'all 0.3s ease',
        }}
        className="title-input"
        maxLength={50}
      />
    </div>
  );
}

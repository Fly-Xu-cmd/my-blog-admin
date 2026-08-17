import { Image, Space, Tag, Typography } from 'antd';

const formatDate = (date: string) => {
  return date?.trim().split('.')[0]?.replace('T', ' ') || '-';
};

// 轻量灰色占位图（替代原先几百字符的 base64）
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64'%3E%3Crect width='96' height='64' fill='%23f5f5f5'/%3E%3C/svg%3E";

export default function PostCard({
  title,
  img,
  category,
  excerpt,
  createdAt,
}: {
  title: string;
  img: string;
  category: string;
  excerpt?: string;
  createdAt: string;
}) {
  return (
    <Space align="center" style={{ width: '100%' }}>
      <Image
        width={96}
        height={64}
        src={img}
        alt={title || '文章封面'}
        fallback={PLACEHOLDER}
        style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
      />
      <Space direction="vertical" size={4} style={{ width: '100%', minWidth: 0 }}>
        <Typography.Text
          strong
          ellipsis={{ tooltip: title }}
          style={{ maxWidth: 200 }}
        >
          {title}
        </Typography.Text>
        {category ? (
          <Tag color="blue" style={{ margin: 0, width: 'fit-content' }}>
            {category}
          </Tag>
        ) : null}
        {excerpt ? (
          <Typography.Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 0, fontSize: 12 }}
          >
            {excerpt}
          </Typography.Paragraph>
        ) : null}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatDate(createdAt)}
        </Typography.Text>
      </Space>
    </Space>
  );
}

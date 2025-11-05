export const Columns = [
  {
    title: "标题",
    dataIndex: "title",
  },
  {
    title: "分类",
    dataIndex: "category",
  },
  {
    title: "创建时间",
    dataIndex: "createdAt",
  },
];

export interface PostCardProps {
  title: string;
  img: string;
  category: string;
  createdAt: string;
}

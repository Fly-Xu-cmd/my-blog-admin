import MarkdownEditor from "@/components/MyEditor";
import {
  deletePost,
  getCategories,
  getPosts,
  getTags,
  updatePost,
} from "@/services/nextjs";
import {
  ActionType,
  PageContainer,
  ProTable,
} from "@ant-design/pro-components";
import { Input, message, Modal, Space } from "antd";
import { useEffect, useRef, useState } from "react";
import PostCard from "./components/post-card";

export default function PostManage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [postSlug, setPostSlug] = useState("");
  const [newContent, setNewContent] = useState("");

  const [messageApi, contextHolder] = message.useMessage();
  const [tagOptions, setTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [categoryOptions, setCategoryOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const actionRef = useRef<ActionType>(null);
  const valueEnum = {
    true: {
      text: "公开",
      status: "Success",
    },
    false: {
      text: "隐藏",
      status: "default",
    },
  };

  useEffect(() => {
    getTags()
      .then((res) => {
        if (res.ok) {
          const { data } = res;
          const formatData = data?.map((item) => ({
            label: item.name!,
            value: item.name!,
          }));
          setTagOptions(formatData || []);
        } else {
          setTagOptions([]);
          messageApi.error(res.error || "获取标签列表失败");
        }
      })
      .catch((err) => {
        console.error(err);
      });

    getCategories()
      .then((res) => {
        if (res.ok) {
          const { data } = res;
          const formatData = data?.map((item) => ({
            label: item.name!,
            value: item.name!,
          }));
          setCategoryOptions(formatData || []);
        } else {
          setCategoryOptions([]);
          messageApi.error(res.error || "获取分类列表失败");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const handleEdit = (record: API.Post) => {
    setIsModalOpen(true);
    updatePost(record.slug!, record)
      .then((res) => {
        if (res.ok) {
          messageApi.success("更新文章成功");
          setIsModalOpen(false);
          actionRef.current?.reload();
        } else {
          messageApi.error(res.error || "更新文章失败");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {contextHolder}
      <PageContainer title="文章管理">
        <ProTable
          rowKey="id"
          actionRef={actionRef}
          columns={[
            {
              title: "文章",
              dataIndex: "postCard",
              editable: false,
              search: false,
              render: (_, record: any) => {
                return <PostCard {...record.postCard} />;
              },
            },
            {
              title: "分类",
              dataIndex: "category",
              valueType: "select",
              fieldProps: {
                options: categoryOptions,
              },
              editable: false,
            },
            {
              title: "标签",
              dataIndex: "tags",
              valueType: "select",
              fieldProps: {
                options: tagOptions,
              },
              editable: false,
              render: (_, record: any) => {
                return (
                  <div>
                    {record.tags.map((tag: string) => (
                      <span
                        key={tag}
                        style={{
                          marginRight: 4,
                          padding: 4,
                          borderRadius: 4,
                          backgroundColor: "#f0f0f0",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                );
              },
            },
            {
              title: "发布",
              dataIndex: "published",
              valueEnum,
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              search: false,
              sorter: (a, b) => {
                return Date.parse(a.createdAt) - Date.parse(b.createdAt);
              },
              render: (_, record: any) =>
                record.createdAt.split(".")[0].replace("T", " "),
              editable: false,
            },
            {
              title: "操作",
              valueType: "option",
              width: 160,
              render: (text, record, _, action) => [
                <a
                  key={`published-${record.id}`}
                  onClick={() => {
                    updatePost(record.slug!, {
                      published: String(!record.published),
                    }).then((res) => {
                      if (res.ok) {
                        messageApi.success(`公开 ${record.title} 成功`);
                        action?.reload();
                      } else {
                        messageApi.error(res.error || "公开文章失败");
                      }
                    });
                  }}
                >
                  {record.published ? "隐藏" : "公开"}
                </a>,
                <a
                  key={`delete-${record.id}`}
                  onClick={() => {
                    deletePost(record.slug!).then((res) => {
                      if (res.ok) {
                        messageApi.success(`删除 ${record.title} 成功`);
                        action?.reload();
                      } else {
                        messageApi.error(res.error || "删除文章失败");
                      }
                    });
                  }}
                >
                  删除
                </a>,
                <a
                  key={`edit-${record.id}`}
                  onClick={() => {
                    setNewTitle(record.title!);
                    setNewContent(record.content!);
                    setPostSlug(record.slug!);
                    setIsModalOpen(true);
                  }}
                >
                  编辑
                </a>,
              ],
            },
          ]}
          request={async (params) => {
            const res = await getPosts({
              ...params,
            });
            const { data } = res;
            const formatData = data?.map((item) => ({
              ...item,
              postCard: {
                id: item.id,
                title: item.title,
                category: item.category,
                img: item.cover,
                createdAt: item.createdAt,
              },
            }));
            return {
              data: formatData || [],
              success: true,
              total: res.total || 0,
            };
          }}
        />
        <Modal
          title="编辑文章"
          open={isModalOpen}
          width={"80%"}
          onOk={(e) => {
            e.preventDefault();
            updatePost(postSlug, {
              title: newTitle,
              content: newContent,
            }).then((res) => {
              if (res.ok) {
                messageApi.success(`更新 ${postSlug} 成功`);
                actionRef.current?.reload();
                setIsModalOpen(false);
              } else {
                messageApi.error(res.error || "更新文章失败");
              }
            });
          }}
          onCancel={handleCancel}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <label
                style={{ fontSize: 16, fontWeight: "bold" }}
                htmlFor="title"
              >
                标题:
              </label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </Space>
            <Space direction="vertical" style={{ width: "100%" }}>
              <label
                style={{ fontSize: 16, fontWeight: "bold" }}
                htmlFor="content"
              >
                内容:
              </label>
              <MarkdownEditor value={newContent} onChange={setNewContent} />
            </Space>
          </Space>
        </Modal>
      </PageContainer>
    </>
  );
}

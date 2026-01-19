import MarkdownEditor from "@/components/MyEditor";
import {
  deletePost,
  getCategories,
  getPosts,
  getTags,
  updatePost,
} from "@/services/nextjs";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import {
  ActionType,
  PageContainer,
  ProTable,
} from "@ant-design/pro-components";
import { Input, message, Modal, Space, Upload } from "antd";
import { useEffect, useRef, useState } from "react";
import PostCard from "./components/post-card";

const baseUrl = process.env.BASE_API_URL || "http://localhost:3000";

export default function PostManage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [postSlug, setPostSlug] = useState("");
  const [newContent, setNewContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>("");
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [isPublished, setIsPublished] = useState(true);
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
      console.log("上传成功:", info.file.response);
      setImageUrl(info.file.response.url);
      setLoading(false);
    }
    if (info.file.status === "error") {
      messageApi.error(`上传失败!${info.file.error}`);
      setLoading(false);
    }
  };

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
              render: (_, record: any) => record.category?.name || "",
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
                    setImageUrl(record.cover);
                    setIsPublished(record.published);
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
                category: item.category?.name,
                img: baseUrl + item.cover,
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
              cover: imageUrl,
              published: isPublished,
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
                    src={baseUrl + imageUrl}
                    alt="file"
                    style={{ width: "100%" }}
                  />
                ) : (
                  uploadButton
                )}
              </Upload>
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

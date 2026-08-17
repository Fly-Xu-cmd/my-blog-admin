import MarkdownEditor from "@/components/MyEditor";
import {
  addPost,
  deletePost,
  getCategories,
  getPosts,
  getTags,
  updatePost,
} from "@/services/nextjs";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import type { ActionType } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import { useEffect, useId, useRef, useState } from "react";
import PostCard from "./components/post-card";

type ModalMode = "create" | "edit";

interface PostFormValues {
  title: string;
  content: string;
  published: boolean;
  categoryId?: number;
  tags: string[];
}

export default function PostManage() {
  const { message, modal } = App.useApp();
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingSlug, setEditingSlug] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [tagOptions, setTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [categoryOptions, setCategoryOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [form] = Form.useForm<PostFormValues>();

  const titleId = useId();
  const imageId = useId();
  const contentId = useId();
  const categoryId = useId();
  const tagsId = useId();

  const actionRef = useRef<ActionType>(null);
  const isModalOpen = modalMode !== null;
  const isEditing = modalMode === "edit";

  // 表格搜索用：按名称筛选（后端按名称匹配）
  const categorySearchOptions = categoryOptions.map((item) => ({
    label: item.label,
    value: item.label,
  }));

  const valueEnum = {
    true: {
      text: "公开",
      status: "Success",
    },
    false: {
      text: "隐藏",
      status: "Default",
    },
  };

  const resetDraft = () => {
    form.resetFields();
    form.setFieldsValue({
      title: "",
      content: "",
      published: true,
      categoryId: undefined,
      tags: [],
    });
    setEditingSlug("");
    setCoverUrl("");
    setUploading(false);
  };

  const contentValue = Form.useWatch("content", form) || "";

  const openCreateModal = () => {
    resetDraft();
    setModalMode("create");
  };

  const openEditModal = (record: any) => {
    form.setFieldsValue({
      title: record.title || "",
      content: record.content || "",
      published: Boolean(record.published),
      categoryId: record.category?.id,
      tags: record.tags || [],
    });
    setEditingSlug(record.slug || "");
    setCoverUrl(record.cover || "");
    setModalMode("edit");
  };

  useEffect(() => {
    getTags()
      .then((res: any) => {
        if (res.ok) {
          const { data } = res;
          const formatData = data?.map((item: any) => ({
            label: item.name || "",
            value: item.name || "",
          }));
          setTagOptions(formatData || []);
        } else {
          setTagOptions([]);
          message.error(res.error || "获取标签列表失败");
        }
      })
      .catch((err) => {
        console.error(err);
      });

    getCategories()
      .then((res) => {
        if (res.ok) {
          const { data } = res;
          const formatData = data?.map((item: any) => ({
            label: item.name || "",
            value: item.id,
          }));
          setCategoryOptions(formatData || []);
        } else {
          setCategoryOptions([]);
          message.error(res.error || "获取分类列表失败");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [message]);

  const uploadProps: UploadProps = {
    name: "file",
    listType: "picture-card",
    className: "avatar-uploader",
    showUploadList: false,
    action: "/api/upload-qiniu",
    beforeUpload: (file) => {
      const isSupported =
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/webp";

      if (!isSupported) {
        message.error("只能上传 JPG、PNG 或 WebP 格式的图片");
        return Upload.LIST_IGNORE;
      }

      setUploading(true);
      return true;
    },
    onChange: (info) => {
      if (info.file.status === "done") {
        const nextUrl =
          info.file.response?.url || info.file.response?.data?.url || "";

        if (nextUrl) {
          setCoverUrl(nextUrl);
          message.success("封面上传成功");
        } else {
          message.warning("图片上传成功，但未返回可用地址");
        }

        setUploading(false);
      }

      if (info.file.status === "error") {
        message.error(`上传失败！${info.file.error?.message || "请稍后重试"}`);
        setUploading(false);
      }
    },
  };

  const handleModalCancel = () => {
    setModalMode(null);
    resetDraft();
  };

  const handleDelete = (record: any) => {
    if (!record.slug) return;
    modal.confirm({
      title: "确认删除吗？",
      content: `删除「${record.title || "文章"}」后将无法恢复`,
      okText: "确认",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () =>
        deletePost(record.slug).then((res: any) => {
          if (res.ok) {
            message.success(`删除 ${record.title || "文章"} 成功`);
            actionRef.current?.reload();
          } else {
            message.error(res.error || "删除文章失败");
          }
        }),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        title: values.title.trim(),
        content: values.content,
        cover: coverUrl || undefined,
        published: values.published,
        categoryId: values.categoryId,
        tags: values.tags || [],
      };

      setConfirmLoading(true);

      const res = isEditing
        ? await updatePost(editingSlug, payload)
        : await addPost(payload);

      if (res.ok) {
        message.success(isEditing ? "文章更新成功" : "文章创建成功");
        actionRef.current?.reload();
        handleModalCancel();
      } else {
        message.error(res.error || (isEditing ? "更新文章失败" : "创建文章失败"));
      }
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <PageContainer title="文章管理">
      <ProTable
        rowKey="id"
        actionRef={actionRef}
        toolBarRender={() => [
          <Button key="create-post" type="primary" onClick={openCreateModal}>
            新增文章
          </Button>,
        ]}
        columns={[
          {
            title: "标题",
            dataIndex: "title",
            hideInTable: true,
            fieldProps: { placeholder: "搜索文章标题" },
          },
          {
            title: "文章",
            dataIndex: "postCard",
            editable: false,
            search: false,
            width: 340,
            render: (_, record: any) => {
              return <PostCard {...record.postCard} />;
            },
          },
          {
            title: "分类",
            dataIndex: "category",
            valueType: "select",
            fieldProps: {
              options: categorySearchOptions,
            },
            render: (_, record: any) => record.category?.name || "",
            editable: false,
            width: 110,
            ellipsis: true,
          },
          {
            title: "标签",
            dataIndex: "tags",
            valueType: "select",
            fieldProps: {
              options: tagOptions,
            },
            editable: false,
            width: 220,
            render: (_, record: any) => {
              return (
                <div>
                  {record.tags.map((tag: string) => (
                    <Tag key={tag} color="geekblue" style={{ marginBottom: 4 }}>
                      {tag}
                    </Tag>
                  ))}
                </div>
              );
            },
          },
          {
            title: "发布",
            dataIndex: "published",
            valueEnum,
            width: 90,
            align: "center",
          },
          {
            title: "创建时间",
            dataIndex: "createdAt",
            search: false,
            width: 170,
            sorter: (a, b) => {
              return Date.parse(a.createdAt) - Date.parse(b.createdAt);
            },
            render: (_, record: any) => (
              <span style={{ whiteSpace: "nowrap" }}>
                {record.createdAt.split(".")[0].replace("T", " ")}
              </span>
            ),
            editable: false,
          },
          {
            title: "操作",
            valueType: "option",
            width: 180,
            render: (_text, record, _, action) => [
              <a
                key={`published-${record.id}`}
                onClick={() => {
                  if (record.slug) {
                    updatePost(record.slug, {
                      published: String(!record.published),
                    }).then((res: any) => {
                      if (res.ok) {
                        message.success(
                          `${record.published ? "隐藏" : "公开"} ${
                            record.title || "文章"
                          } 成功`
                        );
                        action?.reload();
                      } else {
                        message.error(res.error || "切换文章状态失败");
                      }
                    });
                  }
                }}
              >
                {record.published ? "隐藏" : "公开"}
              </a>,
              <a
                key={`edit-${record.id}`}
                onClick={() => openEditModal(record)}
              >
                编辑
              </a>,
              <a
                key={`delete-${record.id}`}
                style={{ color: "#ff4d4f" }}
                onClick={() => handleDelete(record)}
              >
                删除
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
              excerpt: item.excerpt,
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

      <Drawer
        title={isEditing ? "编辑文章" : "新增文章"}
        open={isModalOpen}
        width={1120}
        destroyOnClose
        maskClosable={false}
        onClose={handleModalCancel}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={handleModalCancel}>取消</Button>
            <Button
              type="primary"
              loading={confirmLoading}
              onClick={handleSubmit}
            >
              {isEditing ? "保存修改" : "发布文章"}
            </Button>
          </div>
        }
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{ published: true }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Card size="small" title="基础信息">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Form.Item
                    label="标题"
                    name="title"
                    rules={[
                      { required: true, message: "请输入文章标题" },
                      { min: 2, message: "标题至少 2 个字" },
                    ]}
                  >
                    <Input
                      id={titleId}
                      placeholder="给文章一个能吸引点击的标题"
                      allowClear
                    />
                  </Form.Item>

                  <Form.Item label="发布状态" name="published" valuePropName="checked">
                    <Switch checkedChildren="公开" unCheckedChildren="隐藏" />
                  </Form.Item>
                </Space>
              </Card>

              <Card size="small" title="正文内容">
                <Form.Item
                  name="content"
                  rules={[{ required: true, message: "请输入文章内容" }]}
                >
                  <div id={contentId}>
                    <MarkdownEditor
                      value={contentValue}
                      onChange={(value: string) =>
                        form.setFieldValue("content", value || "")
                      }
                    />
                  </div>
                </Form.Item>
              </Card>
            </Space>

            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Card size="small" title="内容设置">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Form.Item label="分类" name="categoryId">
                    <Select
                      id={categoryId}
                      placeholder="可先不选，后续再补"
                      allowClear
                      style={{ width: "100%" }}
                      options={categoryOptions}
                    />
                  </Form.Item>

                  <Form.Item label="标签" name="tags">
                    <Select
                      id={tagsId}
                      placeholder="为文章增加几个关键词"
                      mode="multiple"
                      allowClear
                      style={{ width: "100%" }}
                      options={tagOptions}
                    />
                  </Form.Item>
                </Space>
              </Card>

              <Card size="small" title="封面图片">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Upload {...uploadProps}>
                    {coverUrl ? (
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "16 / 10",
                          border: "1px dashed #d9d9d9",
                          borderRadius: 8,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fafafa",
                        }}
                      >
                        <img
                          draggable={false}
                          src={coverUrl}
                          alt="cover"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ) : (
                      <div
                        id={imageId}
                        style={{
                          width: "100%",
                          aspectRatio: "16 / 10",
                          border: "1px dashed #d9d9d9",
                          borderRadius: 8,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#8c8c8c",
                          gap: 8,
                          background: "#fafafa",
                        }}
                      >
                        {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                        <span>{uploading ? "上传中" : "上传封面"}</span>
                      </div>
                    )}
                  </Upload>

                  {coverUrl ? (
                    <Space>
                      <Button onClick={() => setCoverUrl("")}>清除封面</Button>
                      <Typography.Text type="secondary">
                        支持 JPG / PNG / WebP
                      </Typography.Text>
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">
                      可选项，但封面会显著提升文章列表的吸引力。
                    </Typography.Text>
                  )}
                </Space>
              </Card>
            </Space>
          </div>
        </Form>
      </Drawer>
    </PageContainer>
  );
}

import { Button, Input, message, Modal, Popconfirm } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  addCategory,
  addTag,
  deleteCategory,
  deleteTag,
  getCategories,
  getTags,
  updateCategory,
  updateTag,
} from "../../services/nextjs";

const NewCategory: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const [tags, setTags] = useState<API.Tag[]>([]);
  const [categories, setCategories] = useState<API.Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addNewName, setAddNewName] = useState("");
  const [addTitle, setAddTitle] = useState("");

  // 存储每个 tag 的宽度
  const [widths, setWidths] = useState<Record<number, number>>({});

  const measureRef = useRef<HTMLSpanElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // 获取标签和分类
    getTags().then((res) => {
      setTags(res.data || []);
    });
    getCategories().then((res) => {
      setCategories(res.data || []);
    });
  }, []);

  // 删除标签
  const removeTag = (name: string) => {
    setTags((prev) => prev.filter((t) => t.name !== name));
    deleteTag({ name }).then((res: any) => {
      if (res.ok) {
        messageApi.open({
          type: "success",
          content: "删除成功",
        });
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "删除失败",
        });
      }
    });
  };

  // 更新标签
  const updateTagName = (name: string, newName: string) => {
    setTags((prev) =>
      prev.map((t) => (t.name === name ? { ...t, name: newName } : t))
    );
    updateTag({ name, newName }).then((res: any) => {
      if (res.ok) {
        messageApi.open({
          type: "success",
          content: "更新成功",
        });
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "更新失败",
        });
      }
    });
  };
  // 新增标签
  const addTagName = (name: string) => {
    addTag({ name }).then((res: any) => {
      if (res.ok) {
        messageApi.open({
          type: "success",
          content: "新增成功",
        });
        setTags((prev) => [...prev, { id: res.data?.id || 0, name }]);
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "新增失败",
        });
      }
    });
  };
  // 删除分类
  const removeCategory = (name: string) => {
    deleteCategory({ name }).then((res: any) => {
      if (res.ok) {
        messageApi.open({
          type: "success",
          content: "删除成功",
        });
        setCategories((prev) => prev.filter((c) => c.name !== name));
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "删除失败",
        });
      }
    });
  };
  // 新增分类
  const addCategoryName = (value: string) => {
    addCategory({ name: value }).then((res: any) => {
      if (res.ok) {
        messageApi.open({
          type: "success",
          content: "新增成功",
        });
        setCategories((prev) => [
          ...prev,
          { id: res.data?.id || 0, name: value },
        ]);
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "新增失败",
        });
      }
    });
  };
  // 更新分类
  const updateCategoryName = (name: string, value: string) => {
    updateCategory({ name, newName: value }).then((res: any) => {
      if (res.ok) {
        messageApi.open({
          type: "success",
          content: "更新成功",
        });
        setCategories((prev) =>
          prev.map((c) => (c.name === name ? { ...c, name: value } : c))
        );
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "更新失败",
        });
      }
    });
  };

  // 处理确认新增标签
  const handleOk = () => {
    if (addNewName.trim()) {
      if (addTitle.includes("分类")) {
        addCategoryName(addNewName.trim());
      } else {
        addTagName(addNewName.trim());
      }
      setAddNewName("");
      setIsModalOpen(false);
    }
  };
  // 处理取消新增标签
  const handleCancel = () => {
    setAddNewName("");
    setIsModalOpen(false);
  };

  // 计算文本像素宽度
  const measureText = (text: string): number => {
    const span = measureRef.current;
    if (!span) return 0;
    span.textContent = text || " ";
    const rect = span.getBoundingClientRect();
    return Math.ceil(rect.width);
  };

  // 重新测量宽度
  const recomputeWidths = () => {
    if (!measureRef.current) return;
    const newWidths: Record<number, number> = {};
    tags.forEach((tag) => {
      const textWidth = measureText(tag.name!);
      const extra = 24 + 20; // padding + 删除按钮预留
      const minW = 60;
      const maxW = 320;
      newWidths[tag.id!] = Math.max(minW, Math.min(maxW, textWidth + extra));
    });
    setWidths(newWidths);
  };

  // 初次与标签变化时测量
  useEffect(() => {
    recomputeWidths();
  }, [tags]);

  // 监听窗口尺寸变化（响应式）
  useEffect(() => {
    const handleResize = () => recomputeWidths();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserverRef.current?.disconnect();
    };
  }, [tags]);

  return (
    <>
      {contextHolder}
      {/* 隐藏测量节点 */}
      <span
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre",
          fontSize: 14,
          fontFamily:
            "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', 'Helvetica Neue', sans-serif",
          fontWeight: 400,
          letterSpacing: "normal",
          padding: 0,
          margin: 0,
        }}
      />

      {/* 分类容器 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 1000, fontSize: 18 }}>
          分类:
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {categories.map((item) => (
            <div
              key={item.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 6px",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                background: "#fff",
                flexShrink: 0,
              }}
            >
              <Input
                defaultValue={item.name}
                onBlur={(e) => {
                  updateCategoryName(item.name!, (e.target as any).value);
                }}
                onPressEnter={(e) =>
                  updateCategoryName(item.name!, (e.target as any).value)
                }
                id={`category-${item.id}`}
                size="small"
                variant="borderless"
                style={{
                  width: widths[item.id!] ?? 100,
                  minWidth: 60,
                  maxWidth: 320,
                  padding: 0,
                  margin: 0,
                }}
              />
              <Popconfirm
                title="确认删除吗？"
                description="删除后将无法恢复"
                onConfirm={() => removeCategory(item.name!)}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  size="small"
                  type="text"
                  style={{ padding: "0 6px", marginLeft: 6 }}
                >
                  ×
                </Button>
              </Popconfirm>
            </div>
          ))}
          <Button
            onClick={() => {
              setAddTitle("新增分类");
              setIsModalOpen(true);
            }}
          >
            +
          </Button>
        </div>
      </div>

      {/* 标签容器 */}
      <div>
        <div style={{ marginBottom: 8, fontWeight: 1000, fontSize: 18 }}>
          标签:
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {tags.map((item) => (
            <div
              key={item.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 6px",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                background: "#fff",
                flexShrink: 0,
              }}
            >
              <Input
                defaultValue={item.name}
                onPressEnter={(e) =>
                  updateTagName(item.name!, (e.target as any).value)
                }
                onBlur={(e) => (e.target.value = item.name!)}
                id={`tag-${item.id}`}
                size="small"
                variant="borderless"
                style={{
                  width: widths[item.id!] ?? 100,
                  minWidth: 60,
                  maxWidth: 320,
                  padding: 0,
                  margin: 0,
                }}
              />
              <Popconfirm
                title="确认删除吗？"
                description="删除后将无法恢复"
                onConfirm={() => removeTag(item.name!)}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  size="small"
                  type="text"
                  style={{ padding: "0 6px", marginLeft: 6 }}
                >
                  ×
                </Button>
              </Popconfirm>
            </div>
          ))}
          <Button
            onClick={() => {
              setAddTitle("新增标签");
              setIsModalOpen(true);
            }}
          >
            +
          </Button>
        </div>
      </div>

      <Modal
        title={addTitle}
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <p>名称:</p>
        <Input
          id="new-name"
          value={addNewName}
          placeholder={`请输入${addTitle}`}
          onChange={(e) => setAddNewName(e.target.value)}
        ></Input>
      </Modal>
    </>
  );
};

export default NewCategory;

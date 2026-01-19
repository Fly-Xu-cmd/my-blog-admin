import MarkdownEditor from "@/components/MyEditor";
import { deleteDynamic, getDynamics, updateDynamic } from "@/services/nextjs";
import {
  ActionType,
  PageContainer,
  ProTable,
} from "@ant-design/pro-components";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { message, Modal, Space } from "antd";
import { useRef, useState } from "react";

export default function DynamicManage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detailContent, setDetailContent] = useState("");
  const [dynamicId, setDynamicId] = useState("");
  const [newContent, setNewContent] = useState("");

  const [messageApi, contextHolder] = message.useMessage();

  const actionRef = useRef<ActionType>(null);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {contextHolder}
      <PageContainer title="动态管理">
        <ProTable
          rowKey="id"
          actionRef={actionRef}
          columns={[
            {
              title: "动态",
              dataIndex: "title",
              editable: false,
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
                  key={`delete-${record.id}`}
                  onClick={() => {
                    deleteDynamic(record.id!).then((res) => {
                      if (res.ok) {
                        messageApi.success(`删除 ${record.title} 成功`);
                        action?.reload();
                      } else {
                        messageApi.error(res.error || "删除动态失败");
                      }
                    });
                  }}
                >
                  删除
                </a>,
                <a
                  key={`detail-${record.id}`}
                  onClick={() => {
                    setDetailContent(record.content!);
                    setTitle(record.title!);
                    setDynamicId(record.id!);
                    setIsDetailModalOpen(true);
                  }}
                >
                  详情
                </a>,
                <a
                  key={`edit-${record.id}`}
                  onClick={() => {
                    setNewContent(record.content!);
                    setTitle(record.title!);
                    setDynamicId(record.id!);
                    setIsModalOpen(true);
                  }}
                >
                  编辑
                </a>,
              ],
            },
          ]}
          request={async (params) => {
            const res = await getDynamics({
              ...params,
            });
            const { data } = res;
            return {
              data: data || [],
              success: true,
              total: res.total || 0,
            };
          }}
        />
        <Modal
          title="编辑动态"
          open={isModalOpen}
          width={"80%"}
          onOk={(e) => {
            e.preventDefault();
            updateDynamic(Number(dynamicId), {
              content: newContent,
            }).then((res) => {
              if (res.ok) {
                messageApi.success(`更新 ${title} 成功`);
                actionRef.current?.reload();
                setIsModalOpen(false);
              } else {
                messageApi.error(res.error || "更新动态失败");
              }
            });
          }}
          onCancel={handleCancel}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
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
        <Modal
          title="动态详情"
          open={isDetailModalOpen}
          width={"60%"}
          onCancel={() => {
            setIsDetailModalOpen(false);
          }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space
              style={{ width: "100%" }}
              direction="vertical"
              align="center"
            >
              <label
                style={{ fontSize: 16, fontWeight: "bold" }}
                htmlFor="title"
              ></label>
              <h2>{title}</h2>
            </Space>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div
                style={{ width: "100%", border: "1px solid #ccc", padding: 10 }}
              >
                <MarkdownPreview
                  source={detailContent}
                  style={{ padding: 10 }}
                />
              </div>
            </Space>
          </Space>
        </Modal>
      </PageContainer>
    </>
  );
}

import {
  type ActionType,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { PlusOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { App, Button, Input, Modal, Space, Typography } from 'antd';
import { useRef, useState } from 'react';
import MarkdownEditor from '@/components/MyEditor';
import { deleteDynamic, getDynamics, updateDynamic } from '@/services/nextjs';

export default function DynamicManage() {
  const { message, modal } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [detailContent, setDetailContent] = useState('');
  const [detailExcerpt, setDetailExcerpt] = useState('');
  const [dynamicId, setDynamicId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newContent, setNewContent] = useState('');

  const actionRef = useRef<ActionType>(null);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleDelete = (record: any) => {
    modal.confirm({
      title: '确认删除吗？',
      content: `删除「${record.title || '动态'}」后将无法恢复`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () =>
        deleteDynamic(record.id).then((res) => {
          if (res.ok) {
            message.success(`删除 ${record.title || '动态'} 成功`);
            actionRef.current?.reload();
          } else {
            message.error(res.error || '删除动态失败');
          }
        }),
    });
  };

  const handleSave = () => {
    if (!newContent) {
      message.error('请输入动态内容');
      return;
    }
    updateDynamic(Number(dynamicId), {
      title: newTitle,
      excerpt: newExcerpt,
      content: newContent,
    }).then((res) => {
      if (res.ok) {
        message.success(`更新 ${newTitle || '动态'} 成功`);
        actionRef.current?.reload();
        setIsModalOpen(false);
      } else {
        message.error(res.error || '更新动态失败');
      }
    });
  };

  return (
    <PageContainer
      title="动态管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => history.push('/new/dynamic')}
        >
          新增动态
        </Button>
      }
    >
      <ProTable
        rowKey="id"
        actionRef={actionRef}
        columns={[
          {
            title: '动态',
            dataIndex: 'title',
            editable: false,
            width: 320,
            ellipsis: true,
          },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            search: false,
            width: 170,
            sorter: (a, b) => {
              return Date.parse(a.createdAt) - Date.parse(b.createdAt);
            },
            render: (_, record: any) => (
              <span style={{ whiteSpace: 'nowrap' }}>
                {record.createdAt.split('.')[0].replace('T', ' ')}
              </span>
            ),
            editable: false,
          },
          {
            title: '操作',
            valueType: 'option',
            width: 160,
            render: (_text, record) => [
              <a
                key={`detail-${record.id}`}
                onClick={() => {
                  setDetailContent(record.content);
                  setDetailExcerpt(record.excerpt || '');
                  setTitle(record.title);
                  setIsDetailModalOpen(true);
                }}
              >
                详情
              </a>,
              <a
                key={`edit-${record.id}`}
                onClick={() => {
                  setNewTitle(record.title || '');
                  setNewExcerpt(record.excerpt || '');
                  setNewContent(record.content || '');
                  setDynamicId(record.id);
                  setIsModalOpen(true);
                }}
              >
                编辑
              </a>,
              <a
                key={`delete-${record.id}`}
                style={{ color: '#ff4d4f' }}
                onClick={() => handleDelete(record)}
              >
                删除
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
        width="80%"
        onOk={handleSave}
        onCancel={handleCancel}
        okText="保存修改"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text strong>标题</Typography.Text>
            <Input
              placeholder="请输入标题（可选）"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ marginTop: 8 }}
              allowClear
            />
          </div>
          <div>
            <Typography.Text strong>摘要</Typography.Text>
            <Input.TextArea
              placeholder="一句话摘要（可选）"
              value={newExcerpt}
              onChange={(e) => setNewExcerpt(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>内容</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <MarkdownEditor value={newContent} onChange={setNewContent} />
            </div>
          </div>
        </Space>
      </Modal>
      <Modal
        title="动态详情"
        open={isDetailModalOpen}
        width="60%"
        onCancel={() => {
          setIsDetailModalOpen(false);
        }}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space
            style={{ width: '100%' }}
            direction="vertical"
            align="center"
          >
            <h2 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
              {title}
            </h2>
            {detailExcerpt ? (
              <Typography.Text type="secondary">{detailExcerpt}</Typography.Text>
            ) : null}
          </Space>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div
              style={{ width: '100%', border: '1px solid #ccc', padding: 10 }}
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
  );
}

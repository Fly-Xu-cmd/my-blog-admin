import { useRef, useState } from 'react';
import { PageContainer, ProTable, ActionType } from '@ant-design/pro-components';
import { App, Button, Form, Input, Modal } from 'antd';
import { api } from '@/utils/api';
export default function SeriesManager() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const action = useRef<ActionType>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    try {
      const data = await form.validateFields();
      setBusy(true);
      await api('/api/series', {
        method: edit ? 'PUT' : 'POST',
        body: JSON.stringify(
          edit ? { id: edit.id, name: data.name, description: data.description } : data,
        ),
      });
      setOpen(false);
      action.current?.reload();
      message.success('保存成功');
    } catch (e: any) {
      if (e.message) message.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageContainer title="系列管理">
      <ProTable
        actionRef={action}
        rowKey="id"
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="new"
            onClick={() => {
              setEdit(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增系列
          </Button>,
        ]}
        columns={[
          { title: '系列', dataIndex: 'name' },
          { title: '链接', dataIndex: 'slug' },
          { title: '说明', dataIndex: 'description' },
          {
            title: '操作',
            valueType: 'option',
            render: (_, r) => [
              <a
                key="edit"
                onClick={() => {
                  setEdit(r);
                  form.setFieldsValue(r);
                  setOpen(true);
                }}
              >
                编辑
              </a>,
              <a
                key="order"
                onClick={async () => {
                  const all: any[] = [];
                  for (let current = 1; ; current++) {
                    const result = await api(
                      '/api/posts?scope=admin&pageSize=50&current=' + current,
                    );
                    all.push(...result.data.filter((p: any) => p.seriesId === r.id));
                    if (current >= result.pages) break;
                  }
                  all.sort((a, b) => a.seriesOrder - b.seriesOrder);
                  let ordered = all.map((p) => p.id).join(',');
                  modal.confirm({
                    title: '调整系列顺序',
                    content: (
                      <>
                        <p>{all.map((p) => p.id + ': ' + p.title).join('；')}</p>
                        <Input
                          defaultValue={ordered}
                          onChange={(e) => {
                            ordered = e.target.value;
                          }}
                          placeholder="按顺序输入文章 ID，用逗号分隔"
                        />
                      </>
                    ),
                    onOk: async () => {
                      await api('/api/series/' + r.id + '/reorder', {
                        method: 'POST',
                        body: JSON.stringify({
                          postIds: ordered.trim()
                            ? ordered.split(',').map((v) => Number(v.trim()))
                            : [],
                        }),
                      });
                      message.success('已重排');
                    },
                  });
                }}
              >
                调整顺序
              </a>,
              <a
                key="delete"
                onClick={() =>
                  modal.confirm({
                    title: '删除系列？',
                    content: '文章保留，并解除系列关联。',
                    onOk: async () => {
                      await api('/api/series', {
                        method: 'DELETE',
                        body: JSON.stringify({ id: r.id }),
                      });
                      action.current?.reload();
                    },
                  })
                }
              >
                删除
              </a>,
            ],
          },
        ]}
        request={async () => {
          const r = await api('/api/series?scope=admin');
          return { data: r.data, success: true };
        }}
      />
      <Modal
        title={edit ? '编辑系列' : '新增系列'}
        open={open}
        confirmLoading={busy}
        onOk={save}
        onCancel={() => setOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input maxLength={100} />
          </Form.Item>
          {!edit && (
            <Form.Item
              label="链接 slug"
              name="slug"
              rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }]}
            >
              <Input maxLength={160} />
            </Form.Item>
          )}
          <Form.Item label="说明" name="description">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

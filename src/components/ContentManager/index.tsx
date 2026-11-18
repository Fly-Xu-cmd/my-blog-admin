import { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable, ActionType } from '@ant-design/pro-components';
import { App, Button, Drawer, Form, Input, Select, Switch, Upload } from 'antd';
import type { UploadProps } from 'antd';
import MarkdownEditor from '@/components/MyEditor';
import Preview from '@/components/SafeMarkdown';
import { api, creationKey, uploadImage } from '@/utils/api';
import type { ContentDetail, ContentSummary, ContentList, Envelope } from '@/types/content';
type Resource = 'posts' | 'notes' | 'dynamics';
const labels = { posts: '文章', notes: '笔记', dynamics: '动态' };
export default function ContentManager({ resource }: { resource: Resource }) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const action = useRef<ActionType>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<{ categories: any[]; tags: any[]; series: any[] }>({
    categories: [],
    tags: [],
    series: [],
  });
  const key = useRef<{ key?: string; hash?: string }>({});
  const generation = useRef(0);
  const locked = useRef(false);
  const isNote = resource === 'notes';
  const isPost = resource === 'posts';
  const content = Form.useWatch('content', form) || '';
  useEffect(() => {
    if (!isPost) return;
    void Promise.all(
      ['/api/categories', '/api/tags'].map((r) => api(r + '?scope=admin')),
    )
      .then(([categories, tags]) =>
        setOptions({ categories: categories.data, tags: tags.data, series: [] }),
      )
      .catch((e) => message.error(e.message));
  }, [isPost, message]);
  const keyOf = (row: ContentSummary) => (resource === 'dynamics' ? row.id : row.slug!);
  const editRow = async (row: ContentSummary) => {
    const current = ++generation.current;
    setOpen(true);
    setLoading(true);
    setEdit(null);
    form.resetFields();
    key.current = {};
    try {
      const result = await api<Envelope<ContentDetail>>(
        '/api/' + resource + '/' + encodeURIComponent(keyOf(row)) + '?scope=admin',
      );
      if (current === generation.current) {
        setEdit(result.data);
        form.setFieldsValue({ ...result.data, categoryId: result.data.category?.id });
      }
    } catch (e: any) {
      if (current === generation.current) {
        setOpen(false);
        message.error(e.message);
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  };
  const close = () => {
    generation.current++;
    setOpen(false);
    setEdit(null);
    form.resetFields();
  };
  const create = () => {
    generation.current++;
    form.resetFields();
    form.setFieldsValue({ published: false, content: '', tags: [] });
    key.current = {};
    setEdit(null);
    setLoading(false);
    setOpen(true);
  };
  const save = async () => {
    if (loading || locked.current) return;
    try {
      const values = await form.validateFields();
      locked.current = true;
      setSaving(true);
      const payload = isNote
        ? { published: values.published, kind: values.kind }
        : isPost
          ? {
              title: values.title,
              content: values.content,
              excerpt: values.excerpt,
              cover: values.cover || null,
              published: values.published,
              categoryId: values.categoryId ?? null,
              tags: values.tags || [],
              seriesId: values.seriesId ?? null,
              seriesOrder: values.seriesId ? Number(values.seriesOrder) : null,
              ...(!edit && values.slug ? { slug: values.slug } : {}),
            }
          : {
              title: values.title,
              content: values.content,
              excerpt: values.excerpt,
              published: values.published,
            };
      await api('/api/' + resource + (edit ? '/' + encodeURIComponent(keyOf(edit)) : ''), {
        method: edit ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
        headers: !edit && isPost ? { 'Idempotency-Key': creationKey(key.current, payload) } : {},
      });
      key.current = {};
      close();
      action.current?.reload();
      message.success('保存成功');
    } catch (e: any) {
      if (e.message) message.error(e.message);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };
  const mutate = async (row: any, data: any) => {
    try {
      await api('/api/' + resource + '/' + encodeURIComponent(keyOf(row)), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      action.current?.reload();
    } catch (e: any) {
      message.error(e.message);
    }
  };
  const upload: UploadProps = {
    showUploadList: false,
    accept: '.jpg,.jpeg,.png,.gif,.webp',
    customRequest: async (opts) => {
      try {
        const url = await uploadImage(opts.file as File);
        form.setFieldValue('cover', url);
        opts.onSuccess?.({ url });
      } catch (e: any) {
        opts.onError?.(e);
        message.error(e.message);
      }
    },
  };
  return (
    <PageContainer title={labels[resource] + '管理'}>
      <ProTable<ContentSummary>
        actionRef={action}
        rowKey="id"
        pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 20, 50] }}
        toolBarRender={() =>
          isNote
            ? []
            : [
                <Button key="new" type="primary" onClick={create}>
                  新增{labels[resource]}
                </Button>,
              ]
        }
        columns={[
          { title: '标题', dataIndex: 'title' },
          {
            title: '发布状态',
            dataIndex: 'published',
            valueType: 'select',
            valueEnum: { true: '公开', false: '私有' },
            render: (_, r) => (r.published ? '公开' : '私有'),
          },
          ...(isNote
            ? [
                {
                  title: '类型',
                  dataIndex: 'kind',
                  valueType: 'select' as const,
                  valueEnum: { TECH: '技术笔记', ESSAY: '随笔' },
                },
              ]
            : []),
          { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', search: false },
          { title: '首次发布', dataIndex: 'publishedAt', valueType: 'dateTime', search: false },
          {
            title: '操作',
            valueType: 'option',
            render: (_, r) => [
              <a key="publish" onClick={() => mutate(r, { published: !r.published })}>
                {r.published ? '隐藏' : '发布'}
              </a>,
              <a key="edit" onClick={() => editRow(r)}>
                {isNote ? '预览与设置' : '编辑'}
              </a>,
              <a
                key="delete"
                onClick={() =>
                  modal.confirm({
                    title: '确认删除？',
                    content:
                      '删除后不会因旧创建请求重试而恢复。同步笔记需同时在本地处理，避免再次同步。',
                    onOk: async () => {
                      await api('/api/' + resource + '/' + encodeURIComponent(keyOf(r)), {
                        method: 'DELETE',
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
        request={async (params) => {
          const query = new URLSearchParams({
            scope: 'admin',
            current: String(params.current ?? 1),
            pageSize: String(params.pageSize ?? 10),
          });
          for (const k of ['title', 'published', 'kind'])
            if (params[k] !== undefined) query.set(k, String(params[k]));
          const r = await api<ContentList>('/api/' + resource + '?' + query);
          return { data: r.data, total: r.total, success: true };
        }}
      />
      <Drawer
        title={(edit ? '编辑' : '新增') + labels[resource]}
        open={open}
        onClose={close}
        width="80%"
        destroyOnClose
        extra={
          <Button type="primary" disabled={loading} loading={saving} onClick={save}>
            保存
          </Button>
        }
      >
        {loading ? (
          <p>正在读取完整内容…</p>
        ) : (
          <Form name={'content-' + resource} form={form} layout="vertical">
            {isNote ? (
              <>
                <p>正文、分类和标签请在本地修改后同步。发布状态与类型由后台保留。</p>
                <Form.Item name="kind" label="类型">
                  <Select
                    options={[
                      { value: 'TECH', label: '技术笔记' },
                      { value: 'ESSAY', label: '随笔' },
                    ]}
                  />
                </Form.Item>
                <Preview source={edit?.content || ''} skipHtml={false} />
              </>
            ) : (
              <>
                <Form.Item name="title" label="标题" rules={isPost ? [{ required: true }] : []}>
                  <Input maxLength={255} />
                </Form.Item>
                {isPost && !edit && (
                  <Form.Item
                    name="slug"
                    label="链接 slug（留空自动生成拼音）"
                    rules={[
                      {
                        pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                        message: '请使用小写英文、数字和连字符',
                      },
                    ]}
                  >
                    <Input maxLength={160} />
                  </Form.Item>
                )}
                <Form.Item name="excerpt" label="摘要">
                  <Input.TextArea />
                </Form.Item>
                <Form.Item name="content" label="正文" rules={[{ required: true }]}>
                  <MarkdownEditor
                    value={content}
                    onChange={(v: string | undefined) => form.setFieldValue('content', v)}
                  />
                </Form.Item>
                {isPost && (
                  <>
                    <Form.Item name="categoryId" label="分类">
                      <Select
                        allowClear
                        options={options.categories.map((c) => ({ label: c.name, value: c.id }))}
                      />
                    </Form.Item>
                    <Form.Item name="tags" label="标签">
                      <Select
                        mode="tags"
                        options={options.tags.map((t) => ({ label: t.name, value: t.name }))}
                      />
                    </Form.Item>
                    <Form.Item name="cover" label="封面 URL">
                      <Input />
                    </Form.Item>
                    <Upload {...upload}>
                      <Button>上传封面</Button>
                    </Upload>
                  </>
                )}
              </>
            )}
            <Form.Item name="published" label="公开发布" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </PageContainer>
  );
}

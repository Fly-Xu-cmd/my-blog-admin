import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import WritingGuard from '@/components/WritingGuard';
import { api } from '@/utils/api';

type Feedback = {
  id: number;
  resource: string;
  contentId: number;
  type: string;
  message: string;
  contact: string | null;
  status: string;
  createdAt: string;
  source: {
    title: string;
    slug: string;
    published: boolean;
    url: string | null;
  } | null;
};
type Settings = { githubUrl: string; revision: number };
export default function FeedbackPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [settings, setSettings] = useState<Settings | null>(null),
    [configError, setConfigError] = useState(''),
    [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Feedback[]>([]),
    [total, setTotal] = useState(0),
    [current, setCurrent] = useState(1),
    [status, setStatus] = useState('NEW'),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [updating, setUpdating] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const configLoad = useRef<AbortController | null>(null);
  const mounted = useRef(true),
    busy = useRef(false),
    dirty = useRef(false),
    edit = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      configLoad.current?.abort();
    };
  }, []);
  const loadSettings = async () => {
    if (busy.current) return;
    configLoad.current?.abort();
    const controller = new AbortController();
    configLoad.current = controller;
    setConfigError('');
    setSettings(null);
    try {
      const { data } = await api<{ data: Settings }>(
        '/api/feedback-settings?scope=admin',
        { signal: controller.signal },
      );
      if (!mounted.current || controller.signal.aborted) return;
      setSettings(data);
      form.setFieldsValue(data);
      dirty.current = false;
      setIsDirty(false);
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setConfigError(e instanceof Error ? e.message : '配置读取失败');
    }
  };
  useEffect(() => {
    void loadSettings();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<{ data: Feedback[]; total: number }>(
      '/api/feedback?' +
        new URLSearchParams({
          current: String(current),
          pageSize: '10',
          status,
        }),
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows(result.data);
          setTotal(result.total);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : '反馈读取失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [current, status, reload]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty.current || busy.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, []);
  const save = async (value: { githubUrl: string }) => {
    if (busy.current || !settings) return;
    busy.current = true;
    setSaving(true);
    const generation = edit.current;
    try {
      const { data } = await api<{ data: Settings }>('/api/feedback-settings', {
        method: 'PUT',
        body: JSON.stringify({ ...value, revision: settings.revision }),
      });
      if (mounted.current && generation === edit.current) {
        setSettings(data);
        form.setFieldsValue(data);
        dirty.current = false;
        setIsDirty(false);
        message.success('讨论入口已更新');
      }
    } catch (e) {
      if (mounted.current)
        setConfigError(
          (e instanceof Error ? e.message : '保存失败') + '。当前输入已保留。',
        );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const changeStatus = async (id: number, next: string) => {
    if (busy.current) return;
    busy.current = true;
    setUpdating(id);
    try {
      await api('/api/feedback', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: next }),
      });
      if (mounted.current) {
        message.success('反馈状态已更新');
        setReload((value) => value + 1);
      }
    } catch (e) {
      if (mounted.current)
        message.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      busy.current = false;
      if (mounted.current) setUpdating(null);
    }
  };
  return (
    <PageContainer
      title="私有反馈"
      subTitle="仅管理员可见；邮箱只用于作者手动联系，不自动发送通知"
    >
      <WritingGuard
        dirty={isDirty}
        busy={saving || updating !== null}
        localDraft={false}
      />
      <Card title="讨论配置（暂存）" style={{ marginBottom: 24 }}>
        <Typography.Paragraph type="secondary">
          前台讨论入口已暂时关闭，现有地址仅保留为配置，不会展示给读者。公开讨论方案确定后再启用。
        </Typography.Paragraph>
        {configError && <Alert type="error" showIcon message={configError} />}
        <Form
          form={form}
          layout="inline"
          onFinish={save}
          disabled={!settings || saving || updating !== null}
          onValuesChange={() => {
            dirty.current = true;
            setIsDirty(true);
            edit.current++;
          }}
        >
          <Form.Item
            name="githubUrl"
            label="讨论链接"
            style={{ flex: 1, minWidth: 200 }}
          >
            <Input
              placeholder="GitHub Issues 或 Discussions 地址；留空隐藏"
              maxLength={512}
              allowClear
            />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={!settings || updating !== null}
            >
              保存讨论入口
            </Button>
            <Button
              disabled={saving || updating !== null}
              onClick={() => {
                if (dirty.current)
                  modal.confirm({
                    title: '放弃未保存的讨论链接？',
                    onOk: loadSettings,
                  });
                else void loadSettings();
              }}
            >
              重新载入
            </Button>
          </Space>
        </Form>
      </Card>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Text>状态</Typography.Text>
        <Select
          aria-label="反馈状态"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setCurrent(1);
          }}
          options={[
            { value: 'NEW', label: '待处理' },
            { value: 'RESOLVED', label: '已处理' },
            { value: 'IGNORED', label: '已忽略' },
            { value: '', label: '全部' },
          ]}
        />
        <Button onClick={() => setReload((value) => value + 1)}>
          刷新反馈
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={error ? [] : rows}
        scroll={{ x: 800 }}
        pagination={{
          current,
          pageSize: 10,
          total,
          showSizeChanger: false,
          onChange: setCurrent,
        }}
        columns={[
          {
            title: '来源',
            dataIndex: 'resource',
            width: 230,
            render: (_, row) =>
              row.source ? (
                <div>
                  <Tag>{row.resource === 'post' ? '文章' : '笔记'}</Tag>
                  <a
                    href={
                      row.source.url ??
                      '/manage/content-preview?kind=' +
                        row.resource +
                        '&slug=' +
                        encodeURIComponent(row.source.slug)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {row.source.title} ↗
                  </a>
                  {!row.source.published && (
                    <Typography.Text type="secondary">
                      （后台预览）
                    </Typography.Text>
                  )}
                </div>
              ) : (
                <Typography.Text type="secondary">原内容已删除</Typography.Text>
              ),
          },
          {
            title: '反馈',
            dataIndex: 'message',
            render: (text, row) => (
              <div>
                <Tag>
                  {row.type === 'CORRECTION'
                    ? '纠错'
                    : row.type === 'QUESTION'
                      ? '疑问'
                      : '建议'}
                </Tag>
                <Typography.Paragraph
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    marginTop: 8,
                  }}
                >
                  {text}
                </Typography.Paragraph>
                {row.contact && (
                  <Typography.Text type="secondary">
                    联系邮箱：{row.contact}
                  </Typography.Text>
                )}
              </div>
            ),
          },
          {
            title: '提交时间',
            dataIndex: 'createdAt',
            width: 180,
            render: (text) =>
              new Date(text).toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
              }),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 180,
            render: (_, row) => (
              <Select
                aria-label={'反馈 ' + row.id + ' 状态'}
                value={row.status}
                loading={updating === row.id}
                disabled={saving || updating !== null}
                onChange={(value) => void changeStatus(row.id, value)}
                options={[
                  { value: 'NEW', label: '待处理' },
                  { value: 'RESOLVED', label: '已处理' },
                  { value: 'IGNORED', label: '已忽略' },
                ]}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
}

import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import MarkdownEditor from '@/components/MyEditor';
import { api, RequestError } from '@/utils/api';

type Fields = { title: string; subtitle: string; content: string };
type Config = Fields & { revision: number; updatedAt: string | null };
const fieldsOf = ({ title, subtitle, content }: Fields): Fields => ({
  title,
  subtitle,
  content,
});

export default function AboutSettings() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Fields>();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const dirtyRef = useRef(false);
  const busy = useRef(false);
  const confirming = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<{ data: Config }>('/api/about?scope=admin', {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setConfig(data);
        form.setFieldsValue(fieldsOf(data));
        dirtyRef.current = false;
        setDirty(false);
        setSaveError('');
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message || '关于页加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [form, loadKey]);

  const guard = useCallback(
    (action: () => void) => {
      if (busy.current) {
        message.info('正在保存，请稍候');
        return;
      }
      if (!dirtyRef.current) {
        action();
        return;
      }
      if (confirming.current) return;
      confirming.current = true;
      modal.confirm({
        title: '有尚未保存的修改',
        content: '继续后，本次关于页修改将丢失。',
        okText: '放弃修改并继续',
        cancelText: '继续编辑',
        onOk: () => {
          dirtyRef.current = false;
          setDirty(false);
          action();
        },
        afterClose: () => {
          confirming.current = false;
        },
      });
    },
    [message, modal],
  );

  useEffect(() => {
    if (!dirty && !saving) return;
    let active = true;
    let unblock = () => {};
    let unlisten = () => {};
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || busy.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    const blocker: Parameters<typeof history.block>[0] = (transition) => {
      const proceed = () => {
        unblock();
        unlisten();
        unlisten = history.listen(() => {
          unlisten();
          unlisten = () => {};
          if (active && (dirtyRef.current || busy.current))
            unblock = history.block(blocker);
        });
        transition.retry();
      };
      if (
        transition.location.pathname === '/user/login' ||
        transition.location.pathname === history.location.pathname
      ) {
        proceed();
        return;
      }
      guard(proceed);
    };
    unblock = history.block(blocker);
    return () => {
      active = false;
      unblock();
      unlisten();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [dirty, saving, guard]);

  const save = async (fields: Fields) => {
    if (busy.current || loading || error || !config) return;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await api<{ data: Config }>('/api/about', {
        method: 'PUT',
        body: JSON.stringify({ ...fields, revision: config.revision }),
      });
      if (!mounted.current) return;
      setConfig(data);
      form.setFieldsValue(fieldsOf(data));
      dirtyRef.current = false;
      setDirty(false);
      message.success('关于页已保存，前台已更新');
    } catch (e) {
      if (!mounted.current) return;
      setSaveError(
        e instanceof RequestError && e.status === 409
          ? '关于页已在其他窗口更新。当前输入已保留，请复制需要的内容，再重新载入最新版本。'
          : e instanceof Error
            ? e.message
            : '保存失败，请稍后重试',
      );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <PageContainer
      title="关于页设置"
      content="写下你想让读者认识的自己。保存后，关于页和搜索简介一起更新。"
    >
      <Card style={{ maxWidth: 1100 }}>
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
          wrap
        >
          <Typography.Text type="secondary">
            {dirty
              ? '有未保存的修改'
              : config?.updatedAt
                ? `上次更新：${new Date(config.updatedAt).toLocaleString('zh-CN')}`
                : '当前使用默认文案'}
          </Typography.Text>
          <Button
            disabled={loading || saving}
            onClick={() => guard(() => setLoadKey((key) => key + 1))}
          >
            重新载入
          </Button>
        </Space>
        {error && (
          <Alert
            type="error"
            showIcon
            message="关于页加载失败"
            description={error}
            style={{ marginBottom: 20 }}
            action={
              <Button onClick={() => guard(() => setLoadKey((key) => key + 1))}>
                重试
              </Button>
            }
          />
        )}
        {saveError && (
          <Alert
            type="error"
            showIcon
            message={saveError}
            style={{ marginBottom: 20 }}
          />
        )}
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            disabled={loading || saving || !!error || !config}
            onFinish={save}
            onValuesChange={(_, values) => {
              const changed =
                !!config &&
                JSON.stringify(fieldsOf(values)) !==
                  JSON.stringify(fieldsOf(config));
              dirtyRef.current = changed;
              setDirty(changed);
            }}
          >
            <fieldset
              disabled={loading || saving || !!error || !config}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <Form.Item
                name="title"
                label="页面标题"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入页面标题',
                  },
                  { max: 80 },
                ]}
              >
                <Input maxLength={80} showCount />
              </Form.Item>
              <Form.Item
                name="subtitle"
                label="一句话介绍"
                extra="显示在头像下方，也用于搜索引擎的页面简介。"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入一句话介绍',
                  },
                  { max: 240 },
                ]}
              >
                <Input maxLength={240} showCount />
              </Form.Item>
              <Form.Item
                name="content"
                label="正文"
                extra="支持 Markdown，右侧实时预览。原始 HTML 不会在前台执行；头像沿用当前头像。"
                rules={[
                  { required: true, whitespace: true, message: '请输入正文' },
                  { max: 100000, message: '正文不能超过 100000 个字符' },
                ]}
              >
                <MarkdownEditor height={540} />
              </Form.Item>
            </fieldset>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={loading || !!error || !config || !dirty}
            >
              保存并更新前台
            </Button>
          </Form>
        </Spin>
      </Card>
    </PageContainer>
  );
}

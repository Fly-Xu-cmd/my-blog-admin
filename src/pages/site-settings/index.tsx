import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Spin,
  Typography,
  Upload,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, RequestError, uploadImage } from '@/utils/api';
import SitePreview from './SitePreview';

const keys = [
  'name',
  'author',
  'description',
  'homeTitle',
  'homeIntro',
  'avatar',
  'email',
  'github',
  'wechatQr',
  'qqQr',
] as const;
type Fields = Record<(typeof keys)[number], string>;
type Config = Fields & {
  revision: number;
  updatedAt: string | null;
  publicOrigin?: string;
};
const fieldsOf = (value: Fields): Fields =>
  Object.fromEntries(keys.map((key) => [key, value[key]])) as Fields;

export default function SiteSettings() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Fields>();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [focused, setFocused] = useState('');
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
    api<{ data: Config }>('/api/site-settings?scope=admin', {
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
        if (!controller.signal.aborted)
          setError(e.message || '站点配置加载失败');
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
        content: '继续后，本次站点配置修改将丢失。',
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
    if (!dirty && !saving && !uploading) return;
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
  }, [dirty, saving, uploading, guard]);

  const save = async (fields: Fields) => {
    if (busy.current || loading || error || !config) return;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await api<{ data: Config }>('/api/site-settings', {
        method: 'PUT',
        body: JSON.stringify({ ...fields, revision: config.revision }),
      });
      if (!mounted.current) return;
      setConfig(data);
      form.setFieldsValue(fieldsOf(data));
      dirtyRef.current = false;
      setDirty(false);
      message.success('站点配置已保存，前台已更新');
    } catch (e) {
      if (!mounted.current) return;
      setSaveError(
        e instanceof RequestError && e.status === 409
          ? '站点配置已在其他窗口更新。当前输入已保留，请复制需要的内容，再重新载入最新版本。'
          : e instanceof Error
            ? e.message
            : '保存失败，请稍后重试',
      );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const values = Form.useWatch([], form) || config;
  const labels: Record<(typeof keys)[number], string> = {
    name: '站点名称',
    author: '作者称呼',
    description: '站点简介',
    homeTitle: '首页标题',
    homeIntro: '首页介绍',
    avatar: '头像地址',
    email: '联系邮箱',
    github: 'GitHub 地址',
    wechatQr: '微信二维码',
    qqQr: 'QQ 二维码',
  };
  const input = (key: (typeof keys)[number], required = false, max = 512) => (
    <Form.Item
      key={key}
      name={key}
      label={labels[key]}
      rules={[
        { required, whitespace: required, message: `请输入${labels[key]}` },
        { max },
      ]}
    >
      <Input maxLength={max} allowClear={!required} />
    </Form.Item>
  );
  const image = (key: 'avatar' | 'wechatQr' | 'qqQr') => (
    <div key={key}>
      {input(key, key === 'avatar')}
      <Upload
        showUploadList={false}
        accept=".jpg,.jpeg,.png,.gif,.webp"
        disabled={loading || saving || uploading || !config || !!error}
        customRequest={async (opts) => {
          if (busy.current) {
            opts.onError?.(new Error('请等待当前操作'));
            return;
          }
          busy.current = true;
          setUploading(true);
          try {
            const url = await uploadImage(opts.file as File);
            if (!mounted.current) return;
            form.setFieldValue(key, url);
            dirtyRef.current = true;
            setDirty(true);
            opts.onSuccess?.({ url });
          } catch (e) {
            opts.onError?.(e as Error);
            if (mounted.current) message.error('图片上传失败，请重试');
          } finally {
            busy.current = false;
            if (mounted.current) setUploading(false);
          }
        }}
      >
        <Button>上传{labels[key]}</Button>
      </Upload>
      {values?.[key] && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          已设置图片；保存后更新前台。清空二维码地址可隐藏入口。
        </Typography.Paragraph>
      )}
    </div>
  );
  return (
    <PageContainer title="站点配置" subTitle="站点身份、首页介绍与公开联系方式">
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button onClick={() => guard(() => setLoadKey(loadKey + 1))}>
              重新载入
            </Button>
          }
        />
      )}
      {saveError && (
        <Alert
          type="error"
          showIcon
          message={saveError}
          action={
            <Button onClick={() => guard(() => setLoadKey(loadKey + 1))}>
              重新载入
            </Button>
          }
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={loading || saving || uploading || !!error || !config}
        onFinish={save}
        onFocusCapture={(event) => {
          if (event.target instanceof HTMLInputElement) {
            const key = event.target.id;
            if (keys.includes(key as (typeof keys)[number])) setFocused(key);
          }
        }}
        onValuesChange={(_, current) => {
          const changed =
            !!config &&
            JSON.stringify(fieldsOf(current)) !==
              JSON.stringify(fieldsOf(config));
          dirtyRef.current = changed;
          setDirty(changed);
        }}
      >
        <Spin spinning={loading}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={15}>
              <Space
                direction="vertical"
                size="large"
                style={{ width: '100%' }}
              >
                <Card title="站点身份">
                  {input('name', true, 80)}
                  {input('author', true, 40)}
                  {input('description', true, 240)}
                  {image('avatar')}
                </Card>
                <Card title="首页介绍">
                  {input('homeTitle', true, 80)}
                  {input('homeIntro', true, 240)}
                </Card>
                <Card
                  title="公开联系方式"
                  extra={
                    <Typography.Text type="secondary">
                      不填的入口会隐藏
                    </Typography.Text>
                  }
                >
                  {input('email', false, 160)}
                  {input('github')}
                  {image('wechatQr')}
                  {image('qqQr')}
                </Card>
              </Space>
            </Col>
            <Col xs={24} lg={9}>
              <SitePreview
                values={values || {}}
                origin={config?.publicOrigin || location.origin}
                focused={focused}
                dirty={dirty}
                onSelect={() => setFocused('')}
              />
            </Col>
          </Row>
        </Spin>
        <Space style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            disabled={loading || uploading || !!error || !config || !dirty}
          >
            保存并更新前台
          </Button>
          <Button
            disabled={loading || saving || uploading}
            onClick={() => guard(() => setLoadKey(loadKey + 1))}
          >
            重新载入
          </Button>
        </Space>
      </Form>
    </PageContainer>
  );
}

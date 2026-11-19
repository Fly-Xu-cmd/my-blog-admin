import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Select,
  Space,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import WritingGuard from '@/components/WritingGuard';
import { api } from '@/utils/api';

type Fields = {
  featuredPostId: number | null;
  recommendedSeriesIds: number[];
  startPostIds: number[];
};
type Config = Fields & {
  revision: number;
  selectedPosts?: { id: number; title: string; published: boolean }[];
  selectedSeries?: { id: number; name: string }[];
};
type Option = { value: number; label: string };
export default function ReadingEntry() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Fields>();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [posts, setPosts] = useState<Option[]>([]);
  const [series, setSeries] = useState<Option[]>([]);
  const postLabels = useRef(new Map<number, string>());
  const busy = useRef(false);
  const mounted = useRef(true);
  const dirty = useRef(false);
  const search = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      search.current?.abort();
    };
  }, []);
  const load = async () => {
    if (busy.current) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api<{ data: Config }>(
        '/api/reading-entry?scope=admin',
      );
      if (!mounted.current) return;
      setConfig(data);
      form.setFieldsValue(data);
      dirty.current = false;
      setIsDirty(false);
      setSaveError('');
      postLabels.current = new Map(
        (data.selectedPosts || []).map((p) => [
          p.id,
          p.title + (p.published ? '' : '（已隐藏，请移除）'),
        ]),
      );
      setPosts([]);
      setSeries(
        (data.selectedSeries || []).map((s) => ({
          value: s.id,
          label: s.name,
        })),
      );
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : '读取失败');
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current || busy.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, []);
  const findPosts = async (q: string) => {
    search.current?.abort();
    const controller = new AbortController();
    search.current = controller;
    try {
      const { data } = await api<{ data: { id: number; title: string }[] }>(
        '/api/posts?scope=admin&published=true&pageSize=50&q=' +
          encodeURIComponent(q),
        { signal: controller.signal },
      );
      if (mounted.current && !controller.signal.aborted) {
        const selected = new Set([
          form.getFieldValue('featuredPostId'),
          ...(form.getFieldValue('startPostIds') || []),
        ]);
        postLabels.current = new Map(
          [...postLabels.current].filter(([id]) => selected.has(id)),
        );
        for (const post of data) postLabels.current.set(post.id, post.title);
        setPosts(data.map((post) => ({ value: post.id, label: post.title })));
      }
    } catch (e) {
      if (!controller.signal.aborted && mounted.current)
        message.error(e instanceof Error ? e.message : '搜索失败');
    }
  };
  const findSeries = async () => {
    try {
      const { data } = await api<{ data: { id: number; name: string }[] }>(
        '/api/series?pageSize=50',
      );
      if (mounted.current)
        setSeries((previous) => [
          ...new Map(
            [
              ...previous,
              ...data.map((s) => ({ value: s.id, label: s.name })),
            ].map((s) => [s.value, s]),
          ).values(),
        ]);
    } catch {
      if (mounted.current) message.error('系列读取失败，请重试');
    }
  };
  const save = async (value: Fields) => {
    if (busy.current || loading || error || !config) return;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await api<{ data: Config }>('/api/reading-entry', {
        method: 'PUT',
        body: JSON.stringify({
          ...value,
          featuredPostId: value.featuredPostId ?? null,
          revision: config.revision,
        }),
      });
      if (!mounted.current) return;
      setConfig(data);
      form.setFieldsValue(data);
      dirty.current = false;
      setIsDirty(false);
      message.success('阅读入口已更新');
    } catch (e) {
      if (mounted.current)
        setSaveError(e instanceof Error ? e.message : '保存失败，输入已保留');
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const reload = () => {
    if (dirty.current)
      modal.confirm({
        title: '放弃未保存的修改？',
        okText: '重新载入',
        cancelText: '继续编辑',
        onOk: load,
      });
    else void load();
  };
  return (
    <PageContainer
      title="首页阅读入口"
      subTitle="精选公开内容，给第一次来的读者一个起点"
    >
      <WritingGuard
        dirty={isDirty}
        busy={saving || loading}
        localDraft={false}
      />
      {error && <Alert type="error" showIcon message={error} />}
      {saveError && (
        <Alert
          type="error"
          showIcon
          message={saveError + '。当前输入已保留。'}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={loading || saving || !!error || !config}
        onFinish={save}
        onValuesChange={() => {
          dirty.current = true;
          setIsDirty(true);
        }}
      >
        <Card title="从这里开始" style={{ maxWidth: 800 }}>
          <Typography.Paragraph type="secondary">
            选择顺序就是展示顺序；下线或删除的内容自动从前台隐藏，不会重新发布。
          </Typography.Paragraph>
          <Form.Item name="featuredPostId" label="主推文章">
            <Select
              allowClear
              showSearch
              filterOption={false}
              options={posts}
              labelRender={({ value, label }) =>
                postLabels.current.get(value as number) ??
                label ??
                `#${value}（已移除）`
              }
              placeholder="搜索公开文章，最多一篇"
              onSearch={findPosts}
              onFocus={() => void findPosts('')}
            />
          </Form.Item>
          <Form.Item
            name="startPostIds"
            label="先读这几篇"
            rules={[{ type: 'array', max: 3 }]}
          >
            <Select
              mode="multiple"
              maxCount={3}
              showSearch
              filterOption={false}
              options={posts}
              labelRender={({ value, label }) =>
                postLabels.current.get(value as number) ??
                label ??
                `#${value}（已移除）`
              }
              placeholder="按阅读顺序选择，最多三篇"
              onSearch={findPosts}
              onFocus={() => void findPosts('')}
            />
          </Form.Item>
          <Form.Item
            name="recommendedSeriesIds"
            label="推荐系列"
            rules={[{ type: 'array', max: 3 }]}
          >
            <Select
              mode="multiple"
              maxCount={3}
              showSearch
              optionFilterProp="label"
              options={series}
              placeholder="最多三个含公开文章的系列"
              onFocus={() => void findSeries()}
            />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={loading || !!error || !config}
            >
              保存阅读入口
            </Button>
            <Button disabled={loading || saving} onClick={reload}>
              重新载入
            </Button>
          </Space>
        </Card>
      </Form>
    </PageContainer>
  );
}

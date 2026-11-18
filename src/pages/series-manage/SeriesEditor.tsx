import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BookOutlined,
  DeleteOutlined,
  HolderOutlined,
  MoreOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Avatar,
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, RequestError } from '@/utils/api';
import { moveItem, sameOrder } from './order';
import styles from './style.less';

export type Series = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
};
export type SeriesPost = {
  id: number;
  title: string;
  slug: string;
  cover: string | null;
  published: boolean;
  seriesOrder: number | null;
};
type Fields = { name: string; slug?: string; description?: string };
type Props = {
  series: Series | null;
  onSave: (series: Series) => void;
  onDelete: (id: number) => void;
  onDirty: (value: boolean) => void;
  onBusy: (value: boolean) => void;
};
const normalized = (value: Fields) => ({
  name: value.name?.trim() ?? '',
  slug: value.slug ?? '',
  description: value.description?.trim() ?? '',
});
const coverUrl = (cover: string | null) => {
  if (!cover) return undefined;
  try {
    const url = new URL(
      cover,
      process.env.BASE_API_URL || window.location.origin,
    );
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};

export default function SeriesEditor({
  series,
  onSave,
  onDelete,
  onDirty,
  onBusy,
}: Props) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Fields>();
  const [tab, setTab] = useState(series ? 'articles' : 'info');
  const [baseline, setBaseline] = useState<Fields>({
    name: series?.name ?? '',
    description: series?.description ?? '',
    slug: series ? undefined : '',
  });
  const [infoDirty, setInfoDirty] = useState(false);
  const [posts, setPosts] = useState<SeriesPost[]>([]);
  const [original, setOriginal] = useState<SeriesPost[]>([]);
  const [loading, setLoading] = useState(!!series);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const dragging = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const orderDirty = !sameOrder(posts, original);
  const seriesId = series?.id;

  useEffect(() => {
    if (!seriesId) return;
    const controller = new AbortController();
    setLoading(true);
    setLoaded(false);
    setLoadError('');
    setSaveError('');
    api<{ data: SeriesPost[] }>(`/api/series/${seriesId}/posts`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setPosts(result.data);
        setOriginal(result.data);
        setLoaded(true);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted)
          setLoadError(e.message || '文章加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [seriesId, revision]);

  useEffect(() => {
    onDirty(infoDirty || orderDirty);
  }, [infoDirty, orderDirty, onDirty]);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  const lock = () => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    onBusy(true);
    return true;
  };
  const unlock = () => {
    locked.current = false;
    setBusy(false);
    onBusy(false);
  };

  const saveInfo = async () => {
    if (!lock()) return;
    try {
      const values = normalized(await form.validateFields());
      const result = await api<{ data: Series }>('/api/series', {
        method: series ? 'PUT' : 'POST',
        body: JSON.stringify(
          series
            ? {
                id: series.id,
                name: values.name,
                description: values.description,
              }
            : {
                name: values.name,
                description: values.description,
                ...(values.slug ? { slug: values.slug } : {}),
              },
        ),
      });
      setBaseline(values);
      form.setFieldsValue(values);
      setInfoDirty(false);
      onSave(result.data);
      message.success(
        series ? '系列信息已保存' : '系列已创建，现在可以在文章管理中加入文章',
      );
    } catch (e) {
      if (e instanceof Error)
        message.error(
          e.message === 'CONFLICT' ? '系列名称或链接已被使用' : e.message,
        );
    } finally {
      unlock();
    }
  };
  const saveOrder = async () => {
    if (!loaded || !orderDirty || !lock()) return;
    setSaveError('');
    try {
      await api(`/api/series/${seriesId}/reorder`, {
        method: 'POST',
        body: JSON.stringify({ postIds: posts.map((post) => post.id) }),
      });
      setOriginal(posts);
      setAnnouncement('阅读顺序已保存');
      message.success('阅读顺序已保存');
    } catch (e) {
      setSaveError(
        e instanceof RequestError && e.status === 409
          ? '系列文章已被其他操作修改。本次顺序仍保留，请重新载入后再编排。'
          : '保存未完成，当前顺序已保留。请检查连接后重试。',
      );
    } finally {
      unlock();
    }
  };
  const move = (from: number, to: number) => {
    if (locked.current || !loaded) return;
    const next = moveItem(posts, from, to);
    setPosts(next);
    if (next !== posts)
      setAnnouncement(
        `已将「${posts[from].title}」移至第 ${to + 1} 篇，尚未保存`,
      );
  };
  const reload = () => {
    if (locked.current) return;
    if (orderDirty)
      modal.confirm({
        title: '重新载入文章？',
        content: '本次尚未保存的排序将被替换，系列信息修改会保留。',
        okText: '重新载入',
        cancelText: '继续编排',
        onOk: () => setRevision((value) => value + 1),
      });
    else setRevision((value) => value + 1);
  };
  const remove = () => {
    if (!series || locked.current) return;
    modal.confirm({
      title: `删除「${series.name}」？`,
      content: '文章会保留，并解除与该系列的关联；尚未保存的修改会丢弃。',
      okText: '删除系列',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        if (!lock()) return;
        try {
          await api('/api/series', {
            method: 'DELETE',
            body: JSON.stringify({ id: series.id }),
          });
          onDelete(series.id);
          message.success('系列已删除，文章已保留');
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败，请重试');
          throw e;
        } finally {
          unlock();
        }
      },
    });
  };

  const information = (
    <Form
      form={form}
      initialValues={baseline}
      layout="vertical"
      disabled={busy}
      className={styles.infoForm}
      onValuesChange={(_, values) =>
        setInfoDirty(
          JSON.stringify(normalized(values)) !==
            JSON.stringify(normalized(baseline)),
        )
      }
    >
      <Form.Item
        label="系列名称"
        name="name"
        rules={[
          { required: true, whitespace: true, message: '请输入系列名称' },
        ]}
      >
        <Input placeholder="例如：博客工程实践" maxLength={100} showCount />
      </Form.Item>
      {series ? (
        <Form.Item
          label="系列路径"
          extra="创建后保持固定，修改名称不会影响链接。"
        >
          <Input value={`/series/${series.slug}`} readOnly />
        </Form.Item>
      ) : (
        <Form.Item
          label="系列路径（可选）"
          name="slug"
          extra="留空时根据名称自动生成拼音路径；也可填写小写英文、数字和连字符。创建后保持固定。"
          rules={[
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: '例如 blog-engineering，不含空格或中文',
            },
          ]}
        >
          <Input
            addonBefore="/series/"
            placeholder="留空，根据系列名称自动生成"
            maxLength={160}
          />
        </Form.Item>
      )}
      <Form.Item label="系列简介" name="description">
        <Input.TextArea
          placeholder="这一组文章会带读者了解什么？"
          autoSize={{ minRows: 3, maxRows: 7 }}
          maxLength={65535}
        />
      </Form.Item>
      <div className={styles.formFooter}>
        <Typography.Text type="secondary">
          {infoDirty
            ? '有未保存的修改'
            : series
              ? '信息已保存'
              : '创建后，在文章编辑中选择这个系列'}
        </Typography.Text>
        <Space>
          <Button
            disabled={busy || !infoDirty}
            onClick={() => {
              form.setFieldsValue(baseline);
              setInfoDirty(false);
            }}
          >
            撤销修改
          </Button>
          <Button
            type="primary"
            aria-label={series ? '保存信息' : '创建系列'}
            icon={<SaveOutlined />}
            loading={busy}
            disabled={!!series && !infoDirty}
            onClick={saveInfo}
          >
            {series ? '保存信息' : '创建系列'}
          </Button>
        </Space>
      </div>
    </Form>
  );
  const articles = (
    <>
      <div className={styles.articleIntro}>
        <div>
          <Typography.Text strong>阅读顺序</Typography.Text>
          <Typography.Paragraph type="secondary">
            <span className={styles.desktopHint}>拖动左侧手柄，或</span>
            用箭头调整。草稿参与编排，公开页只展示已发布文章。
          </Typography.Paragraph>
        </div>
        <Button size="small" disabled={loading || busy} onClick={reload}>
          重新载入
        </Button>
      </div>
      {loading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : loadError ? (
        <Alert
          type="error"
          message="文章加载失败"
          description={loadError}
          action={<Button onClick={reload}>重试</Button>}
        />
      ) : posts.length ? (
        <ol className={styles.postList} aria-label="系列文章顺序">
          {posts.map((post, index) => (
            <li
              key={post.id}
              className={`${styles.postRow} ${dropIndex === index ? styles.dropTarget : ''}`}
              onDragOver={(event) => {
                if (dragging.current !== null && !busy) {
                  event.preventDefault();
                  setDropIndex(index);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging.current !== null) move(dragging.current, index);
                dragging.current = null;
                setDropIndex(null);
              }}
            >
              <span
                className={styles.dragHandle}
                draggable={!busy}
                aria-hidden="true"
                title="拖动调整顺序"
                onDragStart={(event) => {
                  dragging.current = index;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(post.id));
                }}
                onDragEnd={() => {
                  dragging.current = null;
                  setDropIndex(null);
                }}
              >
                <HolderOutlined />
              </span>
              <span className={styles.ordinal}>
                {String(index + 1).padStart(2, '0')}
              </span>
              {posts.some((item) => item.cover) && (
                <Avatar
                  shape="square"
                  className={styles.cover}
                  src={coverUrl(post.cover)}
                  icon={<BookOutlined />}
                />
              )}
              <div className={styles.postTitle}>
                <Typography.Text strong>{post.title}</Typography.Text>
                <span>
                  <Tag color={post.published ? 'green' : 'default'}>
                    {post.published ? '已发布' : '草稿'}
                  </Tag>
                  <Typography.Text type="secondary">
                    第 {index + 1} 篇
                  </Typography.Text>
                </span>
              </div>
              <Space size={0} className={styles.postActions}>
                <Tooltip title="上移">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    aria-label={`上移「${post.title}」`}
                    disabled={busy || index === 0}
                    onClick={() => move(index, index - 1)}
                  />
                </Tooltip>
                <Tooltip title="下移">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    aria-label={`下移「${post.title}」`}
                    disabled={busy || index === posts.length - 1}
                    onClick={() => move(index, index + 1)}
                  />
                </Tooltip>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      {
                        key: 'first',
                        label: '移至开头',
                        disabled: index === 0,
                      },
                      {
                        key: 'last',
                        label: '移至末尾',
                        disabled: index === posts.length - 1,
                      },
                    ],
                    onClick: ({ key }) =>
                      move(index, key === 'first' ? 0 : posts.length - 1),
                  }}
                  disabled={busy}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    aria-label={`更多排序操作「${post.title}」`}
                  />
                </Dropdown>
              </Space>
            </li>
          ))}
        </ol>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="这个系列还没有文章"
        >
          <Button onClick={() => history.push('/manage/post')}>
            去文章管理添加
          </Button>
        </Empty>
      )}
      {saveError && (
        <Alert
          className={styles.saveError}
          type="error"
          showIcon
          message={saveError}
        />
      )}
      <div className={styles.orderFooter}>
        <Typography.Text type="secondary">
          {orderDirty
            ? '顺序已调整，尚未保存'
            : loaded
              ? `共 ${posts.length} 篇 · 已发布 ${posts.filter((post) => post.published).length} 篇`
              : '等待文章载入'}
        </Typography.Text>
        <Space>
          <Button
            disabled={busy || !orderDirty || !loaded}
            onClick={() => {
              setPosts(original);
              setSaveError('');
              setAnnouncement('已撤销排序，恢复已保存的顺序');
            }}
          >
            撤销排序
          </Button>
          <Button
            type="primary"
            aria-label="保存顺序"
            icon={<SaveOutlined />}
            disabled={!loaded || !orderDirty}
            loading={busy}
            onClick={saveOrder}
          >
            保存顺序
          </Button>
        </Space>
      </div>
      <output className={styles.srOnly} aria-live="polite">
        {announcement}
      </output>
    </>
  );

  return (
    <>
      <header className={styles.editorHead}>
        <div>
          <Typography.Title level={4}>
            {series?.name ?? '新建系列'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {series
              ? `/series/${series.slug}`
              : '给一组文章起个名字，再安排阅读顺序'}
          </Typography.Text>
        </div>
        {series && (
          <Tooltip title="删除系列，保留文章">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="删除当前系列"
              disabled={busy}
              onClick={remove}
            />
          </Tooltip>
        )}
      </header>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={
          series
            ? [
                {
                  key: 'articles',
                  label: (
                    <>
                      文章编排{' '}
                      {loaded && (
                        <span className={styles.tabCount}>{posts.length}</span>
                      )}
                      {orderDirty && ' · 待保存'}
                    </>
                  ),
                  children: articles,
                },
                {
                  key: 'info',
                  label: `系列信息${infoDirty ? ' · 待保存' : ''}`,
                  children: information,
                },
              ]
            : [{ key: 'info', label: '系列信息', children: information }]
        }
      />
    </>
  );
}

import { BookOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Empty,
  Input,
  Space,
  Spin,
  Typography,
  theme,
} from 'antd';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { api } from '@/utils/api';
import SeriesEditor, { type Series } from './SeriesEditor';
import styles from './style.less';

export default function SeriesManager() {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const [series, setSeries] = useState<Series[]>([]);
  const [selected, setSelected] = useState<number | 'new' | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [blocking, setBlocking] = useState(false);
  const dirty = useRef(false);
  const busy = useRef(false);
  const confirming = useRef(false);
  const reportDirty = useCallback((value: boolean) => {
    dirty.current = value;
    setBlocking(value || busy.current);
  }, []);
  const reportBusy = useCallback((value: boolean) => {
    busy.current = value;
    setBlocking(value || dirty.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<{ data: Series[] }>('/api/series?scope=admin', {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setSeries(result.data);
        setSelected((previous) =>
          previous === 'new' || result.data.some((item) => item.id === previous)
            ? previous
            : (result.data[0]?.id ?? null),
        );
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message || '系列加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const guard = useCallback(
    (action: () => void) => {
      if (busy.current) {
        message.info('正在保存，请稍候');
        return;
      }
      if (!dirty.current) {
        action();
        return;
      }
      if (confirming.current) return;
      confirming.current = true;
      modal.confirm({
        title: '有尚未保存的修改',
        content: '离开后，本次系列信息或文章顺序修改将丢失。',
        okText: '放弃修改并离开',
        cancelText: '继续编辑',
        onOk: () => {
          dirty.current = false;
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
    // history.block also installs beforeunload: register only while needed.
    if (!blocking) return;
    let unblock = () => {};
    let unlisten = () => {};
    let active = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current || busy.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    const blocker: Parameters<typeof history.block>[0] = (transition) => {
      const proceed = () => {
        unblock();
        unlisten();
        // POP retries are asynchronous. Restore protection after applyTx,
        // rather than intercepting the still-pending history.go again.
        unlisten = history.listen(() => {
          unlisten();
          unlisten = () => {};
          if (active && (dirty.current || busy.current))
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
  }, [guard, blocking]);

  const refresh = () =>
    guard(() => {
      dirty.current = false;
      setRevision((value) => value + 1);
    });
  const choose = (id: number | 'new') => {
    if (id === selected) return;
    guard(() => {
      dirty.current = false;
      setSelected(id);
    });
  };
  const active = series.find((item) => item.id === selected);
  const visible = series.filter((item) =>
    `${item.name} ${item.slug}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const update = (item: Series) => {
    setSeries((previous) =>
      [...previous.filter((entry) => entry.id !== item.id), item].sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN'),
      ),
    );
    setSelected(item.id);
    if (selected === 'new') setQuery('');
  };
  const remove = (id: number) => {
    const rest = series.filter((item) => item.id !== id);
    setSeries(rest);
    dirty.current = false;
    setSelected(rest[0]?.id ?? null);
  };

  return (
    <PageContainer title="系列管理" content="把文章编成一条连贯的阅读路径。">
      <div
        className={styles.workspace}
        style={
          {
            '--series-bg': token.colorBgContainer,
            '--series-border': token.colorBorderSecondary,
            '--series-muted': token.colorTextSecondary,
            '--series-active': token.colorPrimaryBg,
            '--series-primary': token.colorPrimary,
            '--series-hover': token.colorFillTertiary,
          } as CSSProperties
        }
      >
        <aside className={styles.sidebar} aria-label="系列列表">
          <div className={styles.sidebarHead}>
            <Typography.Text strong>
              全部系列{' '}
              <Typography.Text type="secondary">
                {series.length}
              </Typography.Text>
            </Typography.Text>
            <Space size={4}>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                aria-label="刷新系列列表"
                disabled={loading}
                onClick={refresh}
              />
            </Space>
          </div>
          <Input.Search
            placeholder="搜索系列名称或链接"
            allowClear
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={styles.seriesList}>
            {loading ? (
              <div className={styles.loading}>
                <Spin />
              </div>
            ) : error ? (
              <Alert
                type="error"
                message="系列加载失败"
                description={error}
                action={
                  <Button aria-label="重试系列列表" onClick={refresh}>
                    重试
                  </Button>
                }
              />
            ) : visible.length ? (
              visible.map((item) => (
                <button
                  type="button"
                  className={`${styles.seriesButton} ${selected === item.id ? styles.selected : ''}`}
                  key={item.id}
                  aria-pressed={selected === item.id}
                  onClick={() => choose(item.id)}
                >
                  <BookOutlined />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.slug}</small>
                  </span>
                </button>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={query ? '没有匹配的系列' : '还没有系列'}
              />
            )}
          </div>
          <Button
            block
            aria-label="新建系列"
            icon={<PlusOutlined />}
            onClick={() => choose('new')}
          >
            新建系列
          </Button>
        </aside>
        <section className={styles.editor} aria-label="系列工作区">
          {selected === 'new' || (active && !loading) ? (
            <SeriesEditor
              key={`${selected}:${revision}`}
              series={active ?? null}
              onSave={update}
              onDelete={remove}
              onDirty={reportDirty}
              onBusy={reportBusy}
            />
          ) : (
            <div className={styles.blank}>
              <Empty
                description={
                  loading ? '正在载入系列' : '选择一个系列，开始编排文章'
                }
              />
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

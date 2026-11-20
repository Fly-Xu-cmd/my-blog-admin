import { Alert, App, Button, Modal, List, Space, Spin } from 'antd';
import { useEffect, useState } from 'react';
import Preview from '@/components/SafeMarkdown';
import { api } from '@/utils/api';

type Version = { revision: number; actor: string; createdAt: string };
export default function PostHistory({
  slug,
  disabled,
  onRestore,
}: {
  slug: string;
  disabled: boolean;
  onRestore: (fields: Record<string, any>) => void;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setCurrent(null);
    setSnapshot(null);
    setVersions([]);
    api(
      `/api/posts/${encodeURIComponent(slug)}/versions?current=${page}&pageSize=10`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!controller.signal.aborted) {
          setVersions(r.data);
          setTotal(r.total);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, slug, page, reload]);
  useEffect(() => {
    setSnapshot(null);
    if (!open || current === null) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api(`/api/posts/${encodeURIComponent(slug)}/versions/${current}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!controller.signal.aborted) setSnapshot(r.data.snapshot);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, slug, current]);
  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          setPage(1);
          setOpen(true);
        }}
      >
        历史版本
      </Button>
      <Modal
        title="文章历史版本"
        width={960}
        style={{ maxWidth: 'calc(100vw - 32px)', top: 40 }}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
        footer={null}
        open={open}
        onCancel={() => setOpen(false)}
      >
        <Alert
          type="info"
          message="载入历史内容只修改编辑器，确认保存后生效。当前链接和发布状态保持。"
        />
        {error && (
          <Alert
            type="error"
            message={error}
            action={<Button onClick={() => setReload(reload + 1)}>重试</Button>}
          />
        )}
        <Spin spinning={loading}>
          <List
            locale={{
              emptyText: '暂无历史版本；旧文章首次修改时会保留修改前的正文。',
            }}
            dataSource={versions}
            pagination={{
              current: page,
              pageSize: 10,
              total,
              onChange: setPage,
            }}
            renderItem={(v) => (
              <List.Item>
                <Space>
                  版本 {v.revision} · {new Date(v.createdAt).toLocaleString()} ·{' '}
                  {v.actor}
                  <Button
                    disabled={loading}
                    onClick={() => setCurrent(v.revision)}
                  >
                    预览版本 {v.revision}
                  </Button>
                </Space>
              </List.Item>
            )}
          />
          {snapshot && !error && (
            <>
              <h3>{snapshot.title}</h3>
              <Preview source={snapshot.content || ''} skipHtml={false} />
              <Button
                type="primary"
                disabled={loading || disabled}
                onClick={() => {
                  onRestore(snapshot);
                  setOpen(false);
                  message.info('历史内容已载入，请检查后保存');
                }}
              >
                载入编辑器
              </Button>
            </>
          )}
        </Spin>
      </Modal>
    </>
  );
}

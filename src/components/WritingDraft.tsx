import { Alert, Button, Select, Space, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { draftSession, type RequestKey } from '@/utils/writing-draft';

export function useWritingDraft(
  slot: string | null,
  fields: Record<string, any>,
  dirty: boolean,
  request: React.MutableRefObject<RequestKey>,
  restore: (fields: Record<string, any>) => void,
  disabled = false,
) {
  const session = useRef<ReturnType<typeof draftSession> | null>(null);
  const [candidates, setCandidates] = useState<
    ReturnType<typeof draftSession>['candidates']
  >([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const serial = JSON.stringify(fields);
  useEffect(() => {
    session.current = null;
    setCandidates([]);
    setSaved(false);
    setError('');
    if (!slot) return;
    try {
      session.current = draftSession(slot);
      setCandidates(session.current.candidates);
    } catch (e) {
      setError(e instanceof Error ? e.message : '本地草稿不可用');
    }
  }, [slot]);
  const persist = () => {
    if (!session.current) return;
    try {
      session.current.write(fields, request.current);
      setSaved(true);
      setError('');
    } catch {
      setError(
        '本地草稿保存失败（空间不足或浏览器限制），请手动保存到服务器或复制正文。',
      );
    }
  };
  useEffect(() => {
    if (slot && dirty) {
      try {
        if (session.current) {
          session.current.write(JSON.parse(serial), request.current);
          setSaved(true);
          setError('');
        }
      } catch {
        setError('本地草稿保存失败，请手动保存或复制正文。');
      }
    }
  }, [serial, dirty, slot, request]);
  return {
    persist,
    clear() {
      try {
        session.current?.clear();
        setSaved(false);
      } catch {
        setError('本地草稿清理失败');
      }
    },
    notice: (
      <DraftNotice
        candidates={candidates}
        error={error}
        saved={saved}
        disabled={disabled}
        onRecover={(index) => {
          const candidate = candidates[index];
          if (!candidate || !session.current) return;
          request.current = { ...candidate.value.request };
          restore(candidate.value.fields);
          try {
            session.current.write(candidate.value.fields, request.current);
            session.current.discard(candidate);
          } catch {
            setError('恢复内容已载入，但本地草稿保存失败。');
          }
          setCandidates(candidates.filter((_, i) => i !== index));
        }}
        onDiscard={(index) => {
          try {
            session.current?.discard(candidates[index]);
            setCandidates(candidates.filter((_, i) => i !== index));
          } catch {
            setError('本地草稿清理失败');
          }
        }}
      />
    ),
  };
}
function DraftNotice({
  candidates,
  error,
  saved,
  disabled,
  onRecover,
  onDiscard,
}: {
  candidates: ReturnType<typeof draftSession>['candidates'];
  error: string;
  saved: boolean;
  disabled: boolean;
  onRecover: (index: number) => void;
  onDiscard: (index: number) => void;
}) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, candidates.length - 1));
  return (
    <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
      {error && <Alert type="warning" showIcon message={error} />}
      {!!candidates.length && (
        <Alert
          type="info"
          showIcon
          message="发现本浏览器未提交的草稿"
          description={
            <Space wrap>
              <Select
                disabled={disabled}
                aria-label="可恢复草稿"
                value={index}
                onChange={setSelected}
                options={candidates.map((c, i) => ({
                  value: i,
                  label: `${c.value.fields.title || '未命名'} · ${new Date(c.value.updatedAt).toLocaleString()}`,
                }))}
                style={{ minWidth: 260 }}
              />
              <Button disabled={disabled} onClick={() => onRecover(index)}>
                恢复草稿
              </Button>
              <Button disabled={disabled} onClick={() => onDiscard(index)}>
                丢弃草稿
              </Button>
            </Space>
          }
        />
      )}
      <Typography.Text type="secondary">
        {saved ? '本浏览器草稿已保存' : '本地草稿仅保存在当前浏览器'}
        ，不等于服务器保存或发布。
      </Typography.Text>
    </Space>
  );
}

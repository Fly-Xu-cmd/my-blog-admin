import { history } from '@umijs/max';
import { App } from 'antd';
import { useEffect, useRef } from 'react';

export default function WritingGuard({
  dirty,
  busy,
  localDraft = true,
}: {
  dirty: boolean;
  busy: boolean;
  localDraft?: boolean;
}) {
  const { modal, message } = App.useApp();
  const state = useRef({ dirty, busy });
  state.current = { dirty, busy };
  useEffect(() => {
    if (!dirty && !busy) return;
    let active = true,
      confirming = false;
    let unblock = () => {},
      unlisten = () => {};
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (state.current.dirty || state.current.busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const blocker: Parameters<typeof history.block>[0] = (transition) => {
      const proceed = () => {
        unblock();
        unlisten();
        unlisten = history.listen(() => {
          unlisten();
          unlisten = () => {};
          if (active && (state.current.dirty || state.current.busy))
            unblock = history.block(blocker);
        });
        transition.retry();
      };
      if (
        transition.location.pathname === '/user/login' ||
        transition.location.pathname === history.location.pathname
      )
        return proceed();
      if (state.current.busy) {
        message.info('正在保存，请稍候');
        return;
      }
      if (!state.current.dirty) return proceed();
      if (confirming) return;
      confirming = true;
      modal.confirm({
        title: '离开当前编辑器？',
        content: localDraft
          ? '尚未提交的内容可从本浏览器草稿恢复；请确认本地草稿已保存。'
          : '尚未提交的修改将丢失。',
        okText: '离开',
        cancelText: '继续编辑',
        onOk: proceed,
        afterClose: () => {
          confirming = false;
        },
      });
    };
    unblock = history.block(blocker);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      active = false;
      unblock();
      unlisten();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [dirty, busy, modal, message, localDraft]);
  return null;
}

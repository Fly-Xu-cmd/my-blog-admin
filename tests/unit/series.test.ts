import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import { App, ConfigProvider } from 'antd';
import { createBrowserHistory } from 'history';
import React from 'react';
import type { SeriesPost } from '../../src/pages/series-manage/SeriesEditor';
import * as apiModule from '../../src/utils/api';
import { RequestError } from '../../src/utils/api';

jest.setTimeout(15000);

jest.doMock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));
// The lightweight TypeScript transform does not hoist jest.mock calls.
const request = jest.spyOn(apiModule, 'api') as jest.Mock;
const SeriesManager = require('../../src/pages/series-manage').default;
const SeriesEditor =
  require('../../src/pages/series-manage/SeriesEditor').default;

const series = {
  id: 1,
  name: '工程实践',
  slug: 'engineering',
  description: '简介',
};
const posts: SeriesPost[] = [
  {
    id: 11,
    title: '第一篇',
    slug: 'one',
    cover: null,
    published: true,
    seriesOrder: 1,
  },
  {
    id: 12,
    title: '第二篇',
    slug: 'two',
    cover: null,
    published: false,
    seriesOrder: 2,
  },
  {
    id: 13,
    title: '第三篇',
    slug: 'three',
    cover: null,
    published: true,
    seriesOrder: 3,
  },
];
const mount = (element: React.ReactNode) =>
  render(
    React.createElement(
      ConfigProvider,
      { theme: { token: { motion: false } } },
      React.createElement(App, null, element),
    ),
  );
const editor = (overrides = {}) =>
  mount(
    React.createElement(SeriesEditor, {
      series,
      onSave: jest.fn(),
      onDelete: jest.fn(),
      onDirty: jest.fn(),
      onBusy: jest.fn(),
      ...overrides,
    }),
  );
const titles = () =>
  within(screen.getByRole('list', { name: '系列文章顺序' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
const deferred = () => {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

beforeAll(() => {
  // These queries span two async React/AntD render passes on shared CI runners.
  configure({ asyncUtilTimeout: 5000 });
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // jsdom does not implement pseudo-element computed styles used by AntD scroll locks.
  const original = window.getComputedStyle;
  window.getComputedStyle = (element) => original(element);
});
beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
  history.location.pathname = '/manage/series';
  request.mockResolvedValue({ data: posts });
});
afterEach(cleanup);

test('loading failure prevents ordering saves and shows a retry', async () => {
  request.mockRejectedValue(new Error('offline'));
  editor();
  await screen.findByText('文章加载失败');
  expect(
    (screen.getByRole('button', { name: '保存顺序' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
});

test('failed save retains the complete local order; double submit sends one request', async () => {
  const pending = deferred();
  request
    .mockResolvedValueOnce({ data: posts })
    .mockImplementationOnce(() => pending.promise);
  editor();
  fireEvent.click(
    await screen.findByRole('button', { name: '下移「第一篇」' }),
  );
  const button = screen.getByRole('button', { name: '保存顺序' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(request).toHaveBeenCalledTimes(2);
  expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({
    postIds: [12, 11, 13],
  });
  await act(async () =>
    pending.resolve(Promise.reject(new RequestError('SERIES_CHANGED', 409))),
  );
  await screen.findByText(/系列文章已被其他操作修改/);
  expect(titles()[0]).toContain('第二篇');
  expect((button as HTMLButtonElement).disabled).toBe(false);
});

test('dragging changes only order and undo restores the full membership', async () => {
  editor();
  await screen.findByText('第一篇');
  const list = screen.getByRole('list', { name: '系列文章顺序' });
  const rows = within(list).getAllByRole('listitem');
  fireEvent.dragStart(within(rows[0]).getByTitle('拖动调整顺序'), {
    dataTransfer: { setData: jest.fn(), effectAllowed: '' },
  });
  fireEvent.dragOver(rows[2]);
  fireEvent.drop(rows[2]);
  expect(titles()[2]).toContain('第一篇');
  fireEvent.click(screen.getByRole('button', { name: '撤销排序' }));
  expect(titles()[0]).toContain('第一篇');
  expect(
    (screen.getByRole('button', { name: '保存顺序' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

test('switching series aborts and ignores an older response', async () => {
  const pending = deferred();
  request.mockImplementation((route: string) =>
    route.endsWith('scope=admin')
      ? Promise.resolve({
          data: [series, { ...series, id: 2, name: '另一系列' }],
        })
      : route === '/api/series/1/posts'
        ? pending.promise
        : Promise.resolve({ data: [posts[2]] }),
  );
  mount(React.createElement(SeriesManager));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/api/series/1/posts',
      expect.anything(),
    ),
  );
  const signal = request.mock.calls.find(
    ([route]) => route === '/api/series/1/posts',
  )[1].signal;
  fireEvent.click(screen.getByRole('button', { name: /另一系列/ }));
  await screen.findByText('第三篇');
  expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve({ data: [posts[0]] }));
  expect(screen.queryByText('第一篇')).toBeNull();
});

test('saving series information does not discard pending order; cancelling leave retains it', async () => {
  request.mockImplementation((route: string, options?: RequestInit) =>
    route.endsWith('scope=admin')
      ? Promise.resolve({ data: [series] })
      : options?.method === 'PUT'
        ? Promise.resolve({ data: { ...series, name: '新名称' } })
        : Promise.resolve({ data: posts }),
  );
  mount(React.createElement(SeriesManager));
  fireEvent.click(
    await screen.findByRole('button', { name: '下移「第一篇」' }),
  );
  fireEvent.click(screen.getByRole('tab', { name: '系列信息' }));
  fireEvent.change(screen.getByRole('textbox', { name: '系列名称' }), {
    target: { value: '新名称' },
  });
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: '保存信息' })),
  );
  await screen.findByText('系列信息已保存');
  fireEvent.click(screen.getByRole('button', { name: '新建系列' }));
  await screen.findByRole('dialog', { name: '有尚未保存的修改' });
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
  fireEvent.click(screen.getByRole('tab', { name: /文章编排/ }));
  expect(titles()[0]).toContain('第二篇');
});

test('route leave is guarded but expired identity can still navigate to login', async () => {
  request.mockImplementation((route: string) =>
    Promise.resolve({ data: route.endsWith('scope=admin') ? [series] : posts }),
  );
  mount(React.createElement(SeriesManager));
  fireEvent.click(
    await screen.findByRole('button', { name: '下移「第一篇」' }),
  );
  const blocker = (history.block as jest.Mock).mock.calls.at(-1)[0];
  const retry = jest.fn();
  act(() => blocker({ location: { pathname: '/manage/post' }, retry }));
  await screen.findByRole('dialog', { name: '有尚未保存的修改' });
  expect(retry).not.toHaveBeenCalled();
  act(() => blocker({ location: { pathname: '/user/login' }, retry }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test('validation errors do not send a create request', async () => {
  editor({ series: null });
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: '创建系列' })),
  );
  await screen.findByText('请输入系列名称');
  expect(request).not.toHaveBeenCalled();
});

test('new series can be created from a Chinese name with the path left empty', async () => {
  const onSave = jest.fn();
  const receipt = {
    ...series,
    name: '博客工程实践',
    slug: 'bo-ke-gong-cheng-shi-jian',
  };
  request.mockResolvedValue({ data: receipt });
  editor({ series: null, onSave });
  fireEvent.change(screen.getByRole('textbox', { name: '系列名称' }), {
    target: { value: '博客工程实践' },
  });
  fireEvent.click(screen.getByRole('button', { name: '创建系列' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(receipt));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][1].method).toBe('POST');
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
    name: '博客工程实践',
    description: '',
  });
});

test('invalid manual paths prevent requests and a corrected path is sent unchanged', async () => {
  request.mockResolvedValue({ data: series });
  editor({ series: null });
  fireEvent.change(screen.getByRole('textbox', { name: '系列名称' }), {
    target: { value: '工程实践' },
  });
  const path = screen.getByRole('textbox', { name: '系列路径（可选）' });
  fireEvent.change(path, { target: { value: '中文/路径' } });
  fireEvent.click(screen.getByRole('button', { name: '创建系列' }));
  await screen.findByText('例如 blog-engineering，不含空格或中文');
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(path, { target: { value: 'engineering' } });
  fireEvent.click(screen.getByRole('button', { name: '创建系列' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(JSON.parse(request.mock.calls[0][1].body).slug).toBe('engineering');
});

test('failed automatic creation preserves the name and allows retry with a manual path', async () => {
  request
    .mockRejectedValueOnce(new RequestError('服务暂不可用', 503))
    .mockResolvedValue({ data: series });
  editor({ series: null });
  const name = screen.getByRole('textbox', { name: '系列名称' });
  fireEvent.change(name, { target: { value: '工程实践' } });
  fireEvent.click(screen.getByRole('button', { name: '创建系列' }));
  await screen.findByText('服务暂不可用');
  expect((name as HTMLInputElement).value).toBe('工程实践');
  fireEvent.change(screen.getByRole('textbox', { name: '系列路径（可选）' }), {
    target: { value: 'engineering' },
  });
  fireEvent.click(screen.getByRole('button', { name: '创建系列' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(JSON.parse(request.mock.calls[1][1].body).slug).toBe('engineering');
});
test('retrying a failed series list does not discard a new series draft', async () => {
  request
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: [] });
  mount(React.createElement(SeriesManager));
  await screen.findByText('系列加载失败');
  fireEvent.click(screen.getByRole('button', { name: '新建系列' }));
  await act(async () =>
    fireEvent.change(screen.getByRole('textbox', { name: '系列名称' }), {
      target: { value: '未保存的新系列' },
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: '重试系列列表' }));
  await screen.findByRole('dialog', { name: '有尚未保存的修改' });
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
  expect(
    (screen.getByRole('textbox', { name: '系列名称' }) as HTMLInputElement)
      .value,
  ).toBe('未保存的新系列');
});
test('clean editors do not block navigation or register the library unload prompt', async () => {
  request.mockImplementation((route: string) =>
    Promise.resolve({ data: route.endsWith('scope=admin') ? [series] : posts }),
  );
  mount(React.createElement(SeriesManager));
  await screen.findByText('第一篇');
  expect(history.block).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '下移「第一篇」' }));
  expect(history.block).toHaveBeenCalledTimes(1);
  const unblock = (history.block as jest.Mock).mock.results[0].value;
  fireEvent.click(screen.getByRole('button', { name: '撤销排序' }));
  expect(unblock).toHaveBeenCalled();
});
test('same-page navigation preserves dirty data and reinstalls its blocker', async () => {
  request.mockImplementation((route: string) =>
    Promise.resolve({ data: route.endsWith('scope=admin') ? [series] : posts }),
  );
  mount(React.createElement(SeriesManager));
  fireEvent.click(
    await screen.findByRole('button', { name: '下移「第一篇」' }),
  );
  const retry = jest.fn();
  const blocker = (history.block as jest.Mock).mock.calls.at(-1)[0];
  act(() => blocker({ location: { pathname: '/manage/series' }, retry }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(titles()[0]).toContain('第二篇');
  expect(history.block).toHaveBeenCalledTimes(1);
  act(() => (history.listen as jest.Mock).mock.calls.at(-1)[0]());
  expect(history.block).toHaveBeenCalledTimes(2);
  const newBlocker = (history.block as jest.Mock).mock.calls.at(-1)[0];
  act(() => newBlocker({ location: { pathname: '/manage/post' }, retry }));
  await screen.findByRole('dialog', { name: '有尚未保存的修改' });
  expect(retry).toHaveBeenCalledTimes(1);
});
test('real browser history completes async POP without a reblocking loop and retains dirty edits', async () => {
  const umi = require('@umijs/max');
  const mockedHistory = umi.history;
  const realHistory = createBrowserHistory({ window });
  const block = jest.spyOn(realHistory, 'block');
  realHistory.replace('/manage/series?older');
  realHistory.push('/manage/series?current');
  umi.history = realHistory;
  request.mockImplementation((route: string) =>
    Promise.resolve({ data: route.endsWith('scope=admin') ? [series] : posts }),
  );
  try {
    mount(React.createElement(SeriesManager));
    fireEvent.click(
      await screen.findByRole('button', { name: '下移「第一篇」' }),
    );
    expect(block).toHaveBeenCalledTimes(1);
    act(() => realHistory.back());
    await waitFor(() => expect(realHistory.location.search).toBe('?older'));
    expect(block).toHaveBeenCalledTimes(2);
    expect(titles()[0]).toContain('第二篇');
    act(() => realHistory.forward());
    await waitFor(() => expect(realHistory.location.search).toBe('?current'));
    expect(block).toHaveBeenCalledTimes(3);
    act(() => realHistory.push('/manage/post'));
    await screen.findByRole('dialog', { name: '有尚未保存的修改' });
    expect(realHistory.location.pathname).toBe('/manage/series');
  } finally {
    cleanup();
    umi.history = mockedHistory;
    block.mockRestore();
  }
});

import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { history } from '@umijs/max';
import { App, ConfigProvider } from 'antd';
import React from 'react';
import * as apiModule from '../../src/utils/api';
import { RequestError } from '../../src/utils/api';

jest.setTimeout(15000);
jest.doMock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));
jest.doMock('../../src/components/MyEditor', () => ({
  __esModule: true,
  default: (props: {
    value: string;
    id: string;
    onChange: (value: string) => void;
  }) =>
    React.createElement('textarea', {
      id: props.id,
      value: props.value || '',
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        props.onChange(e.target.value),
    }),
}));
const request = jest.spyOn(apiModule, 'api') as jest.Mock;
const AboutSettings = require('../../src/pages/about-settings').default;
const config = {
  title: '关于我',
  subtitle: '一句介绍',
  content: '原来正文',
  revision: 3,
  updatedAt: null,
};
const mount = () =>
  render(
    React.createElement(
      ConfigProvider,
      { theme: { token: { motion: false } } },
      React.createElement(App, null, React.createElement(AboutSettings)),
    ),
  );
const saveButton = () =>
  screen.getByRole('button', { name: '保存并更新前台' }) as HTMLButtonElement;
const changeTitle = async () =>
  fireEvent.change(await screen.findByRole('textbox', { name: '页面标题' }), {
    target: { value: '更新后的标题' },
  });
beforeAll(() => {
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
  const original = window.getComputedStyle;
  window.getComputedStyle = (element) => original(element);
});
beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
  request.mockResolvedValue({ data: config });
  history.location.pathname = '/manage/about';
});
afterEach(cleanup);

test('initial read failure disables saving and retry loads the actual saved version', async () => {
  request
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: config });
  mount();
  await screen.findByText('关于页加载失败');
  expect(saveButton().disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
  await waitFor(() =>
    expect(
      (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
        .value,
    ).toBe(config.title),
  );
  expect(saveButton().disabled).toBe(true);
});

test('sends loaded revision, blocks duplicate submissions and updates saved baseline', async () => {
  let resolve!: (data: unknown) => void;
  request.mockResolvedValueOnce({ data: config }).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  mount();
  await waitFor(() =>
    expect(
      (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
        .value,
    ).toBe(config.title),
  );
  await changeTitle();
  fireEvent.click(saveButton());
  fireEvent.click(saveButton());
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({
    ...config,
    title: '更新后的标题',
    updatedAt: undefined,
  });
  expect(
    (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  await act(async () =>
    resolve({ data: { ...config, title: '更新后的标题', revision: 4 } }),
  );
  await screen.findByText('关于页已保存，前台已更新');
  expect(saveButton().disabled).toBe(true);
});

test('conflict preserves edits and reloading them requires confirmation', async () => {
  request
    .mockResolvedValueOnce({ data: config })
    .mockRejectedValueOnce(new RequestError('changed', 409))
    .mockResolvedValue({ data: config });
  mount();
  await waitFor(() =>
    expect(
      (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
        .value,
    ).toBe(config.title),
  );
  await changeTitle();
  fireEvent.click(saveButton());
  await screen.findByText(/当前输入已保留/);
  expect(
    (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
      .value,
  ).toBe('更新后的标题');
  fireEvent.click(screen.getByRole('button', { name: '重新载入' }));
  await screen.findByRole('dialog', { name: '有尚未保存的修改' });
  expect(request).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(
    (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
      .value,
  ).toBe('更新后的标题');
});

test('route leave is guarded while login redirect remains possible', async () => {
  mount();
  await waitFor(() =>
    expect(
      (screen.getByRole('textbox', { name: '页面标题' }) as HTMLInputElement)
        .value,
    ).toBe(config.title),
  );
  await changeTitle();
  const blocker = (history.block as jest.Mock).mock.calls.at(-1)[0];
  const retry = jest.fn();
  act(() => blocker({ location: { pathname: '/manage/post' }, retry }));
  await screen.findByRole('dialog', { name: '有尚未保存的修改' });
  expect(retry).not.toHaveBeenCalled();
  act(() => blocker({ location: { pathname: '/user/login' }, retry }));
  expect(retry).toHaveBeenCalledTimes(1);
});

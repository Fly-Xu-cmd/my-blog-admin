module.exports = {
  history: {
    location: { pathname: '/manage/post' },
    push: jest.fn(),
    block: jest.fn(() => jest.fn()),
    listen: jest.fn(() => jest.fn()),
  },
};

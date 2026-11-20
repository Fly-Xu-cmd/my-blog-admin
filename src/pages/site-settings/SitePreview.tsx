import { Card, Segmented, Space, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import styles from './preview.module.css';
type Values = Partial<
  Record<
    | 'name'
    | 'author'
    | 'description'
    | 'homeTitle'
    | 'homeIntro'
    | 'avatar'
    | 'email'
    | 'github'
    | 'wechatQr'
    | 'qqQr',
    string
  >
>;
const imageUrl = (value: string | undefined, origin: string) => {
  try {
    const url = new URL(value ?? '', origin);
    return value &&
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};
export default function SitePreview({
  values,
  origin,
  focused,
  dirty,
  onSelect,
}: {
  values: Values;
  origin: string;
  focused: string;
  dirty: boolean;
  onSelect: () => void;
}) {
  const [device, setDevice] = useState('desktop'),
    [theme, setTheme] = useState('light'),
    [tab, setTab] = useState('home');
  const field = (key: keyof Values) => (focused === key ? styles.active : '');
  const effective = ['name', 'avatar'].includes(focused)
    ? 'header'
    : ['description'].includes(focused)
      ? 'seo'
      : ['email', 'github', 'wechatQr', 'qqQr'].includes(focused)
        ? 'contact'
        : focused
          ? 'home'
          : tab;
  const picture = (key: 'avatar' | 'wechatQr' | 'qqQr', label: string) => {
    const src = imageUrl(values[key], origin);
    return src ? (
      <img
        src={src}
        alt={label}
        referrerPolicy="no-referrer"
        className={key === 'avatar' ? styles.avatar : styles.qr}
      />
    ) : (
      <span className={styles.placeholder}>{label}未设置</span>
    );
  };
  return (
    <Card
      title="前台位置预览"
      extra={
        <Tag color={dirty ? 'orange' : 'default'}>
          {dirty ? '未保存预览' : '已保存配置'}
        </Tag>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Segmented
            aria-label="预览设备"
            options={[
              { label: '桌面', value: 'desktop' },
              { label: '手机', value: 'mobile' },
            ]}
            value={device}
            onChange={setDevice}
          />
          <Segmented
            aria-label="预览主题"
            options={[
              { label: '浅色', value: 'light' },
              { label: '暗色', value: 'dark' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </Space>
        <Tabs
          activeKey={effective}
          onChange={(key) => {
            setTab(key);
            onSelect();
          }}
          items={[
            { key: 'header', label: '顶部导航' },
            { key: 'home', label: '首页介绍' },
            { key: 'contact', label: '联系方式' },
            { key: 'seo', label: '搜索摘要' },
          ]}
        />
        <section
          aria-label="前台位置预览画布"
          className={
            styles.preview +
            ' ' +
            (theme === 'dark' ? styles.dark : '') +
            ' ' +
            (device === 'mobile' ? styles.mobile : '')
          }
        >
          {effective === 'header' && (
            <div className={styles.header}>
              <span className={field('avatar')}>
                {picture('avatar', '作者头像')}
              </span>
              <strong className={field('name')}>
                {values.name || '站点名称'}
              </strong>
              <span className={styles.nav}>首页 · 博客 · 笔记</span>
            </div>
          )}
          {effective === 'home' && (
            <div className={styles.home}>
              <span className={field('author')}>
                你好，我是{values.author || '作者'}
              </span>
              <h2 className={field('homeTitle')}>
                {values.homeTitle || '首页主标题'}
              </h2>
              <p className={field('homeIntro')}>
                {values.homeIntro || '首页介绍文案'}
              </p>
              <small>RSS 订阅 ↗　文章归档 ↗</small>
            </div>
          )}
          {effective === 'contact' && (
            <div className={styles.contacts}>
              {!values.email &&
              !values.github &&
              !values.wechatQr &&
              !values.qqQr ? (
                <p>未设置联系方式，前台会隐藏对应入口。</p>
              ) : (
                <>
                  {values.email && (
                    <p className={field('email')}>邮箱　{values.email}</p>
                  )}
                  {values.github && (
                    <p className={field('github')}>GitHub　{values.github}</p>
                  )}
                  {values.wechatQr && (
                    <div className={field('wechatQr')}>
                      <small>微信入口打开此二维码</small>
                      {picture('wechatQr', '微信二维码')}
                    </div>
                  )}
                  {values.qqQr && (
                    <div className={field('qqQr')}>
                      <small>QQ 入口打开此二维码</small>
                      {picture('qqQr', 'QQ二维码')}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {effective === 'seo' && (
            <div className={styles.seo}>
              <small>{origin || '博客域名'}</small>
              <h3>示例文章标题 · {values.name || '站点名称'}</h3>
              <p className={field('description')}>
                {values.description || '站点描述'}
              </p>
            </div>
          )}
        </section>
        <Typography.Text type="secondary">
          {effective === 'header'
            ? '对应前台顶部头像与站点名称。'
            : effective === 'home'
              ? '对应首页开头；站点描述不会重复显示在这里。'
              : effective === 'contact'
                ? '不填写的入口隐藏；二维码在读者点击联系方式后展示。'
                : '站点描述用于页面 metadata 等位置，搜索引擎可能调整实际摘要。'}{' '}
          字段高亮指示正在编辑的位置，保存后才更新前台。
        </Typography.Text>
      </Space>
    </Card>
  );
}

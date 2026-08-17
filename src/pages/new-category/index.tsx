import { PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Col, Flex, Input, Modal, Row, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import {
  addCategory,
  addTag,
  deleteCategory,
  deleteTag,
  getCategories,
  getTags,
  updateCategory,
  updateTag,
} from '../../services/nextjs';

type Kind = 'category' | 'tag';

interface EditState {
  kind: Kind;
  id?: number;
  name: string;
}

const NewCategory: React.FC = () => {
  const { message, modal } = App.useApp();

  const [tags, setTags] = useState<API.Tag[]>([]);
  const [categories, setCategories] = useState<API.Category[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<EditState | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    getTags().then((res) => setTags(res.data || []));
    getCategories().then((res) => setCategories(res.data || []));
  }, []);

  const addName = (kind: Kind, name: string) =>
    kind === 'category' ? addCategory({ name }) : addTag({ name });

  const updateName = (kind: Kind, name: string, newName: string) =>
    kind === 'category'
      ? updateCategory({ name, newName })
      : updateTag({ name, newName });

  const removeName = (kind: Kind, name: string) =>
    kind === 'category' ? deleteCategory({ name }) : deleteTag({ name });

  const handleAdd = (kind: Kind) => {
    const name = draft.trim();
    if (!name) {
      message.warning('请输入名称');
      return;
    }
    addName(kind, name).then((res: any) => {
      if (res.ok) {
        message.success('新增成功');
        if (kind === 'category') {
          setCategories((prev) => [...prev, { id: res.data?.id || 0, name }]);
        } else {
          setTags((prev) => [...prev, { id: res.data?.id || 0, name }]);
        }
        setDraft('');
      } else {
        message.error(res.message || '新增失败');
      }
    });
  };

  const openRename = (kind: Kind, item: { id?: number; name?: string }) => {
    setEditing({ kind, id: item.id, name: item.name || '' });
    setRenameValue(item.name || '');
  };

  const confirmRename = () => {
    if (!editing) return;
    const value = renameValue.trim();
    if (!value) {
      message.warning('名称不能为空');
      return;
    }
    updateName(editing.kind, editing.name, value).then((res: any) => {
      if (res.ok) {
        message.success('更新成功');
        const patch = { name: value };
        if (editing.kind === 'category') {
          setCategories((prev) =>
            prev.map((c) => (c.id === editing.id ? { ...c, ...patch } : c)),
          );
        } else {
          setTags((prev) =>
            prev.map((t) => (t.id === editing.id ? { ...t, ...patch } : t)),
          );
        }
        setEditing(null);
      } else {
        message.error(res.message || '更新失败');
      }
    });
  };

  const confirmDelete = (kind: Kind, name: string) => {
    modal.confirm({
      title: '确认删除吗？',
      content: `删除「${name}」后将无法恢复`,
      okText: '确认',
      cancelText: '取消',
      onOk: () =>
        removeName(kind, name).then((res: any) => {
          if (res.ok) {
            message.success('删除成功');
            if (kind === 'category') {
              setCategories((prev) => prev.filter((c) => c.name !== name));
            } else {
              setTags((prev) => prev.filter((t) => t.name !== name));
            }
          } else {
            message.error(res.message || '删除失败');
          }
        }),
    });
  };

  const renderSection = (
    kind: Kind,
    title: string,
    items: API.Category[] | API.Tag[],
    color: string,
  ) => (
    <Card
      title={
        <Flex justify="space-between" align="center">
          <span>{title}</span>
          <Typography.Text type="secondary">{items.length} 个</Typography.Text>
        </Flex>
      }
      styles={{ body: { paddingTop: 16 } }}
    >
      <Flex gap={8} wrap>
        {items.length === 0 && (
          <Typography.Text type="secondary">暂无{title}，添加一个吧</Typography.Text>
        )}
        {items.map((item) => (
          <Tag
            key={item.id}
            color={color}
            closable
            onClose={(e) => {
              e.preventDefault();
              confirmDelete(kind, item.name || '');
            }}
            onClick={() => openRename(kind, item)}
            style={{
              padding: '4px 10px',
              fontSize: 14,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {item.name}
          </Tag>
        ))}
      </Flex>
      <Flex gap={8} style={{ marginTop: 16 }}>
        <Input
          placeholder={`输入${title}名称，回车确认`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={() => handleAdd(kind)}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(kind)}>
          添加
        </Button>
      </Flex>
    </Card>
  );

  return (
    <PageContainer
      title="分类与标签"
      subTitle="点击标签可重命名，点右上角 × 删除"
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          {renderSection('category', '分类', categories, 'blue')}
        </Col>
        <Col xs={24} lg={12}>
          {renderSection('tag', '标签', tags, 'geekblue')}
        </Col>
      </Row>

      <Modal
        title={`重命名${editing?.kind === 'category' ? '分类' : '标签'}`}
        open={!!editing}
        onOk={confirmRename}
        onCancel={() => setEditing(null)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={confirmRename}
          placeholder="输入新名称"
          autoFocus
        />
      </Modal>
    </PageContainer>
  );
};

export default NewCategory;

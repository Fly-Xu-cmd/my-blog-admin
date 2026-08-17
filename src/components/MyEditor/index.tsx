import { commands } from '@uiw/react-md-editor';
import remarkGfm from 'remark-gfm';
import MDEditor from '@uiw/react-md-editor';
import { useId } from 'react';

export default function MarkdownEditor(props: {
  value: string;
  onChange: any;
  height?: number;
  baseUrl?: string;
  id?: string;
}) {
  const {
    value: initialValue,
    onChange,
    height = 420,
    id,
  } = props;

  const uploadImageTitleId = useId();

  const uploadImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-qiniu', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.ok && data.url) return data.url;
      throw new Error('无效的上传响应');
    } catch (err) {
      console.error('上传失败:', err);
      return null;
    }
  };

  const uploadCommand = {
    name: 'upload-image',
    keyCommand: 'upload-image',
    buttonProps: { 'aria-label': 'upload image' },
    icon: (
      <svg
        viewBox="0 0 1024 1024"
        width="14"
        height="14"
        fill="currentColor"
        role="img"
        aria-labelledby={uploadImageTitleId}
      >
        <title id={uploadImageTitleId}>上传图片</title>
        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 810.7c-200.8 0-362.7-161.9-362.7-362.7S311.2 149.3 512 149.3 874.7 311.2 874.7 512 712.8 874.7 512 874.7zM512 277.3c-19.2 0-34.7 15.5-34.7 34.7v165.3H312c-19.2 0-34.7 15.5-34.7 34.7s15.5 34.7 34.7 34.7h165.3V746c0 19.2 15.5 34.7 34.7 34.7s34.7-15.5 34.7-34.7V546.7H746c19.2 0 34.7-15.5 34.7-34.7s-15.5-34.7-34.7-34.7H546.7V312c0-19.2-15.5-34.7-34.7-34.7z" />
      </svg>
    ),
    execute: async (_state: any, api: any) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const url = await uploadImage(file);
        if (url) {
          api.replaceSelection(`![image](${url})\n`);
        } else {
          api.replaceSelection('![image]()\n');
        }
      };
      input.click();
    },
  };

  return (
    <div className="container" data-color-mode="light">
      <MDEditor
        id={id}
        value={initialValue}
        onChange={onChange}
        height={height}
        preview="live"
        previewOptions={{
          remarkPlugins: [remarkGfm],
        }}
        commands={[
          ...commands.getCommands(),
          commands.divider,
          uploadCommand,
        ]}
      />
    </div>
  );
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export default function SafeMarkdown({ source }: { source: string; skipHtml?: boolean }) {
  return (
    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
      {source}
    </ReactMarkdown>
  );
}

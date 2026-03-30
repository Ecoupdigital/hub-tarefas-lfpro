import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import DOMPurify from 'dompurify';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, UnderlineIcon, Strikethrough, List, ListOrdered, Code } from 'lucide-react';

interface RichTextEditorProps {
  value?: string;
  onChange: (html: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const ToolbarButton: React.FC<{
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={e => { e.preventDefault(); onClick(); }}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active
        ? 'bg-primary/15 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    {children}
  </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Escreva aqui...',
  className = '',
  minHeight = '80px',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Ctrl+Enter ou Cmd+Enter para enviar
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={`rich-editor-wrapper ${className}`}>
      {/* Toolbar fixa */}
      <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border/50 flex-wrap">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-0.5" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com marcadores"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-0.5" />
        <ToolbarButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Código inline"
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citação"
        >
          <span className="text-xs font-bold leading-none">"</span>
        </ToolbarButton>

        {onSubmit && (
          <span className="ml-auto font-density-tiny text-muted-foreground/60 hidden sm:block">
            Ctrl+Enter para enviar
          </span>
        )}
      </div>

      {/* Área de edição */}
      <EditorContent
        editor={editor}
        className="rich-editor-content px-3 py-2 text-sm text-foreground outline-none"
        style={{ minHeight }}
      />

      {/* BubbleMenu — aparece ao selecionar texto */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg p-1">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrito"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Itálico"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Sublinhado"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Tachado"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      </BubbleMenu>
    </div>
  );
};

// Renderiza conteúdo salvo: HTML (do editor ou migrado) ou texto plano (com quebras de linha)
export const RichTextDisplay: React.FC<{ html: string; className?: string }> = ({ html, className = '' }) => {
  if (!html) return null;

  // Se começa com tag HTML, renderizar como HTML (sanitizado contra XSS)
  const isHtml = html.trimStart().startsWith('<');
  if (isHtml) {
    return (
      <div
        className={`rich-text-display text-sm ${className}`}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    );
  }

  // Texto plano — preservar quebras de linha
  return (
    <div className={`text-sm ${className}`}>
      {html.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line || <br />}
          {i < html.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default RichTextEditor;

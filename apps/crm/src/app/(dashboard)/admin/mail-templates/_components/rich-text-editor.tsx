'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Heading3,
  Code,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type RichTextEditorProps = {
  name: string;
  defaultValue?: string;
  variables?: string[];
  label?: string;
};

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  name,
  defaultValue = '',
  variables = [],
  label,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [html, setHtml] = useState(defaultValue);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  }, []);

  const insertVariable = useCallback(
    (varName: string) => {
      const token = `{{${varName}}}`;
      if (mode === 'source') {
        setHtml((prev) => prev + token);
        return;
      }
      editorRef.current?.focus();
      document.execCommand('insertText', false, token);
      if (editorRef.current) {
        setHtml(editorRef.current.innerHTML);
      }
    },
    [mode]
  );

  const syncFromEditor = () => {
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  };

  const switchToSource = () => {
    syncFromEditor();
    setMode('source');
  };

  const switchToVisual = () => {
    setMode('visual');
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <input type="hidden" name={name} value={html} />

      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 p-1">
        <ToolbarButton onClick={() => exec('bold')} title="Félkövér">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Dőlt">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Aláhúzás">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <span className="bg-border mx-1 h-5 w-px" />
        <ToolbarButton onClick={() => exec('formatBlock', 'h2')} title="Címsor 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'h3')} title="Címsor 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'p')} title="Bekezdés">
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <span className="bg-border mx-1 h-5 w-px" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Lista">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Számozott lista">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('URL');
            if (url) exec('createLink', url);
          }}
          title="Link"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="bg-border mx-1 h-5 w-px" />
        <Button
          type="button"
          variant={mode === 'visual' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 text-xs"
          onMouseDown={(e) => {
            e.preventDefault();
            if (mode === 'source') switchToVisual();
          }}
        >
          Szerkesztő
        </Button>
        <Button
          type="button"
          variant={mode === 'source' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 text-xs"
          onMouseDown={(e) => {
            e.preventDefault();
            if (mode === 'visual') switchToSource();
          }}
        >
          <Code className="mr-1 h-3 w-3" />
          Forráskód
        </Button>
      </div>

      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'border-input bg-background min-h-[200px] rounded-b-md border px-3 py-2 text-sm',
            'prose prose-sm dark:prose-invert focus-visible:ring-ring max-w-none focus:outline-none focus-visible:ring-2'
          )}
          dangerouslySetInnerHTML={{ __html: defaultValue }}
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
        />
      ) : (
        <Textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          className="min-h-[200px] rounded-t-none font-mono text-xs"
          rows={12}
        />
      )}

      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-muted-foreground w-full text-xs">
            Változók (kattintás beszúráshoz):
          </span>
          {variables.map((v) => (
            <Button
              key={v}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 font-mono text-xs"
              onClick={() => insertVariable(v)}
            >
              {`{{${v}}}`}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

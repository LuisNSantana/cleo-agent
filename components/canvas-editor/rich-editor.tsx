"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { createLowlight, common } from 'lowlight'
import { useEffect } from 'react'
import './editor-styles.css'
import { markdownToHtml } from '@/lib/markdown-to-html'

interface RichEditorProps {
  htmlValue?: string
  textValue?: string
  onChange: (html: string, plain: string) => void
  editorRef?: (instance: any) => void
}

// Simple rich editor: builds paragraphs from plain text if no html provided
export function RichEditor({ htmlValue, textValue, onChange, editorRef }: RichEditorProps) {
  const initialContent = htmlValue
    ? htmlValue
    : convertTextToHtml(textValue || '')

  // Create a scoped lowlight instance only once.
  // Lowlight common bundle already includes popular languages (js, ts, json, markdown, etc.)
  const ll = createLowlight(common)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({ lowlight: ll }),
      Typography, // Better typography with smart quotes, em dashes, etc.
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'table-auto border-collapse border border-gray-300 dark:border-gray-600',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-semibold p-2',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-gray-600 p-2',
        },
      }),
      Link.configure({ 
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300',
        },
      }),
      Placeholder.configure({ placeholder: 'Empieza a escribir tu documento...' }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate({ editor }) {
      const html = editor.getHTML()
      const plain = editor.getText()
      onChange(html, plain)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-full p-6 leading-relaxed'
      }
    }
  })

  useEffect(() => {
    if (editor && editorRef) editorRef(editor)
  }, [editor, editorRef])

  // When external html changes (like reset) update (avoid loop by comparing)
  useEffect(() => {
    if (!editor) return
    if (htmlValue && htmlValue !== editor.getHTML()) {
      editor.commands.setContent(htmlValue)
    } else if (!htmlValue && typeof textValue === 'string') {
      const generated = convertTextToHtml(textValue)
      if (generated !== editor.getHTML()) editor.commands.setContent(generated)
    }
  }, [htmlValue, textValue, editor])

  return (
    <div className="h-full bg-background">
      <EditorContent 
        editor={editor} 
        className="h-full overflow-auto"
        style={{ minHeight: 'calc(100vh - 8rem)' }}
      />
    </div>
  )
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildParagraphsFromPlain(text: string) {
  if (!text) return ''
  const blocks = text.trim().split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
  return blocks.join('')
}

function isLikelyMarkdown(text: string) {
  if (!text) return false
  const mdSignals = [
    /^\s{0,3}#{1,6}\s/m,        // headings
    /\*\*[^*]+\*\*/m,         // bold
    /\*[^*]+\*/m,              // italics
    /^\s*[-*+]\s+/m,           // unordered list
    /^\s*\d+\.\s+/m,         // ordered list
    /```[\s\S]*?```/m,        // fenced code block
    /^>\s.+/m,                 // blockquote
  ]
  return mdSignals.some(rx => rx.test(text))
}

function convertTextToHtml(text: string) {
  if (!text) return ''
  // If it looks like Markdown, convert to HTML to preserve styling in the rich editor
  if (isLikelyMarkdown(text)) {
    try {
      return markdownToHtml(text)
    } catch {
      // Fallback to plain paragraphs if conversion fails
      return buildParagraphsFromPlain(text)
    }
  }
  return buildParagraphsFromPlain(text)
}

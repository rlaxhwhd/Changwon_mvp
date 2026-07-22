import { useEffect, useRef } from 'react'
import $ from './summernote-init'
import './RichEditor.css'

/* eslint-disable @typescript-eslint/no-explicit-any */

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

interface Props {
  value: string
  onChange: (html: string) => void
  height?: number
  placeholder?: string
}

/**
 * Summernote(WYSIWYG) 래퍼 — React 19 + jQuery 플러그인 안전 패턴.
 * DOM(textarea)을 직접 만들어 붙이고, cleanup에서 summernote('destroy')로 정리한다.
 * (JobBus-main RichEditor 미러)
 */
export default function RichEditor({ value, onChange, height = 320, placeholder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value || '')
  const initializedRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return
    if (!$ || !$.fn || !$.fn.summernote) {
      console.error('Summernote plugin failed to register on jQuery. (admin.html CDN 로드 확인)')
      return
    }

    const textarea = document.createElement('textarea')
    containerRef.current.appendChild(textarea)
    textareaRef.current = textarea

    const $note = $(textarea)
    $note.summernote({
      placeholder: placeholder || '내용을 입력하거나 이미지를 끌어다 놓으세요.',
      tabsize: 2,
      height,
      dialogsInBody: true,
      toolbar: [
        ['style', ['bold', 'italic', 'underline', 'clear']],
        ['fontsize', ['fontsize']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['insert', ['picture', 'link', 'hr']],
        ['view', ['fullscreen', 'codeview']],
      ],
      callbacks: {
        onChange: (contents: string) => {
          valueRef.current = contents || ''
          onChangeRef.current?.(contents || '')
        },
        onImageUpload: async (files: FileList) => {
          for (const file of Array.from(files)) {
            try {
              const dataUrl = await fileToBase64(file)
              $note.summernote('insertImage', dataUrl, file.name)
            } catch (err) {
              console.error('image embed failed', err)
            }
          }
        },
      },
    })

    if (valueRef.current) {
      $note.summernote('code', valueRef.current)
    }
    initializedRef.current = true

    const container = containerRef.current
    return () => {
      try {
        $note.summernote('destroy')
      } catch {
        /* ignore */
      }
      if (container && textarea.parentNode === container) {
        container.removeChild(textarea)
      }
      textareaRef.current = null
      initializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부 value 변경분 동기화 (내부 편집분과 다를 때만)
  useEffect(() => {
    const next = value || ''
    if (!initializedRef.current || !textareaRef.current) return
    if (next === valueRef.current) return
    valueRef.current = next
    $(textareaRef.current).summernote('code', next)
  }, [value])

  return <div ref={containerRef} className="rich-editor" />
}

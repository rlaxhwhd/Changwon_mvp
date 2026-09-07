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

/**
 * 본문 이미지 저장 규격 — **폭** 기준이다. 상세 화면이 1010px 안쪽에서 그린다.
 *
 * 긴 변으로 재면 안 된다: 채용 포스터는 세로로 길어서 1000x3000 이 533px 폭으로,
 * 800x4000 은 320px 폭으로 찌그러진다. 본문에서 다시 늘려 그리게 되니 그만큼 뭉개진다.
 * 화면이 제약하는 건 폭 하나뿐이라 폭만 맞추고 높이는 비율대로 따라가게 둔다.
 */
const IMAGE_MAX_PX = 1600
/**
 * 이미지 한 장이 차지해도 되는 최대 용량(data URL 문자 수 ≒ 1.43MB).
 * 파일을 올려둘 서버가 없어 이미지가 본문 HTML 안에 data URL 로 통째로 들어간다.
 * 그 본문은 localStorage(출처당 5MB 안팎)에 저장되므로, 한 장이 이보다 커지면
 * 공고·프로그램 목록 전체의 저장이 거부된다.
 * 기업 로고(JobForm.LOGO_MAX_BYTES)와 같은 이유의 같은 규칙이다.
 */
const IMAGE_MAX_CHARS = 1_500_000

/** 한 번 그려서 JPEG 로 뽑는다. 투명한 자리는 흰색으로 — 안 메우면 검은 배경이 깔린다. */
function renderJpeg(img: HTMLImageElement, width: number, quality: number): string | null {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round((img.height * w) / img.width))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * 올린 이미지를 IMAGE_MAX_PX 폭 · IMAGE_MAX_CHARS 용량 **둘 다** 안에 들어오게 맞춘다.
 *
 * 폭만 맞추면 충분하지 않다: 세로로 아주 긴 포스터(예: 2992x22441)는 폭을 1600 으로
 * 줄여도 12000px 높이가 남아 5MB 가 넘는다. 예전엔 그런 이미지를 그냥 거부했고,
 * 올린 사람에게는 「넣었는데 그대로다」로 보였다.
 * 그래서 넘치면 거부하는 대신 넘친 만큼 폭을 더 줄여 다시 뽑는다.
 * 용량은 대략 픽셀 수에 비례하므로 줄일 선형 배율은 그 제곱근이다 — 두세 번이면 수렴한다.
 *
 * 다시 쓴 쪽이 원본보다 크면(작은 아이콘·단순 PNG) 원본을 그대로 둔다 — 괜히 화질만 버린다.
 */
function shrinkImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('이미지 파일만 넣을 수 있습니다.'))
    img.onload = () => {
      let width = Math.min(IMAGE_MAX_PX, img.width)
      let quality = 0.82
      let out: string | null = null
      for (let attempt = 0; attempt < 5; attempt += 1) {
        out = renderJpeg(img, width, quality)
        if (!out) { resolve(dataUrl); return }
        if (out.length <= IMAGE_MAX_CHARS) break
        // 0.95 는 여유분 — 딱 맞게 겨냥하면 경계에서 한 번 더 돌게 된다.
        width *= Math.sqrt(IMAGE_MAX_CHARS / out.length) * 0.95
        quality = 0.7
      }
      resolve(out && out.length < dataUrl.length ? out : dataUrl)
    }
    img.src = dataUrl
  })
}

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
              const dataUrl = await shrinkImage(await fileToBase64(file))
              // 줄이고도 한도를 넘으면 넣지 않는다. 넣어 두면 저장할 때
              // 「본문이 통째로 안 들어간다」로 뒤늦게 터진다 — 올린 자리에서 바로 알린다.
              if (dataUrl.length > IMAGE_MAX_CHARS) {
                window.alert(`'${file.name}' 은(는) 줄여도 너무 큽니다.\n이미지를 더 작게 만들어 다시 넣어주세요.`)
                continue
              }
              $note.summernote('insertImage', dataUrl, file.name)
            } catch (err) {
              console.error('image embed failed', err)
              window.alert(`'${file.name}' 을(를) 넣지 못했습니다. 이미지 파일인지 확인해주세요.`)
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

import { useEffect, useState } from 'react'
import { apiResponse } from './api'

interface Props {
  /** `/api/v1/...` 로 시작하는 파일 경로 */
  src: string
  alt: string
  /** 로드가 끝나면(실패 포함) 부른다 — 인쇄는 이 뒤에 해야 사진이 빠지지 않는다. */
  onSettled?: () => void
}

/** 파일 API 는 사용자 인증 헤더가 필요해 <img src> 로 열리지 않는다. blob 으로 읽어 넘긴다. */
export default function ProtectedImage({ src, alt, onSettled }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    let objectUrl: string | undefined
    setUrl(null)
    setFailed(false)
    apiResponse(src.replace(/^\/api\/v1/, ''))
      .then(response => response.blob())
      .then(blob => {
        if (!live) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => { if (live) { setFailed(true); onSettled?.() } })
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
    // onSettled 는 호출마다 새 함수다. 이미지를 다시 읽을 이유가 아니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])
  if (failed) return <span role="img" aria-label={alt}>사진을 불러오지 못했습니다.</span>
  return url ? <img src={url} alt={alt} onLoad={() => onSettled?.()} /> : <span role="status">사진 로딩 중</span>
}

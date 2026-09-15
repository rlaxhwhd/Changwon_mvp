import { useEffect, useState } from 'react'

/** 파일 API는 사용자 인증 헤더가 필요하므로 blob으로 읽어 이미지에 전달한다. */
export default function JobLogo({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState<{ src: string; url: string } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const protectedFile = src.startsWith('/api/v1/job-files/')
  useEffect(() => {
    if (!protectedFile) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    const admin = location.pathname.startsWith('/admin')
    const identity = localStorage.getItem(admin ? 'dc_active_staff' : 'dc_active_student')
    const headers = new Headers({ 'X-DC-Portal': admin ? 'admin' : 'student' })
    if (identity) headers.set('X-DC-Identity', identity)
    void fetch(src, { headers, signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('로고를 불러오지 못했습니다.')
      const blob = await response.blob()
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setLoaded({ src, url: objectUrl })
    }).catch(() => { if (!controller.signal.aborted) setFailed(src) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, protectedFile])
  if (failed === src) return <span role="img" aria-label={alt || '기업 로고'}>로고 확인 필요</span>
  const url = protectedFile ? loaded?.src === src ? loaded.url : null : src
  return url ? <img src={url} alt={alt} onError={() => setFailed(src)} /> : <span role="status">로고 로딩 중</span>
}

// jQuery + summernote-lite 는 admin.html 에서 CDN 으로 전역 로드된다(앱 모듈보다 먼저).
// React 19에서 jQuery 플러그인을 직접 import 하면 모듈 평가 순서 문제가 생기므로,
// 여기서는 전역 window.jQuery 참조만 노출한다. (JobBus-main summernote-init 미러)
/* eslint-disable @typescript-eslint/no-explicit-any */
const $ = (typeof window !== 'undefined' ? (window as any).jQuery || (window as any).$ : undefined) as any

export default $

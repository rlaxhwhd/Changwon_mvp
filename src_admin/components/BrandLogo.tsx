// DREAMCATCH 브랜드 로고 — 교직원 포털(상담사·교수·조교) 전 화면 공용.
// 로고 이미지/대체텍스트는 여기 한 곳에서만 관리한다(교체 시 이 파일만 수정).
// 위치별 크기·정렬은 className 으로 주입한다.
export default function BrandLogo({ className, alt = 'DREAMCATCH' }: { className?: string; alt?: string }) {
  return <img src="/Dream_logo.png" alt={alt} className={className} />
}

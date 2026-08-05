// DREAMCATCH 브랜드 로고 — 학생 포털 공용. 로고 이미지/대체텍스트는 여기서만 관리한다.
// (admin 포털의 src_admin/components/BrandLogo 와 같은 역할 — SPA가 분리돼 파일만 별도, 자산 /Dream_logo.png 은 공유)
export default function BrandLogo({ className, alt = 'DREAMCATCH' }: { className?: string; alt?: string }) {
  return <img src="/Dream_logo.png" alt={alt} className={className} />
}

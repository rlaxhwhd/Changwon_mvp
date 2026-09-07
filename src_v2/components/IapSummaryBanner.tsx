import { getActiveStudent, getStudentTypeMeta } from '../data/students'
import './IapSummaryBanner.css'

interface IapSummaryBannerProps {
  /** 좌측 안내 문구 (예: "상담 시 참고할 내 진단 요약") */
  note?: string
}

/**
 * 진단유형 · 계층 요약 배너.
 * careerProcess.ts(STUDENT_TYPE_MAP)를 단일 소스로 읽어
 * 상담센터·라운지 등 진단 맥락이 필요한 화면에 일관되게 노출한다.
 */
export default function IapSummaryBanner({ note = '내 진단 요약' }: IapSummaryBannerProps) {
  const profile = getActiveStudent()
  const type = getStudentTypeMeta(profile)

  // 진단 전 학생은 요약할 유형이 없다. 빈 칩을 그리지 않고 무엇을 하면 채워지는지 말한다.
  if (!type) {
    return (
      <div className="iap-banner">
        <span className="iap-banner-ico"><i className="fa-solid fa-user-check" /></span>
        <div className="iap-banner-body">
          <span className="iap-banner-note">{note}</span>
          <div className="iap-banner-chips">
            <span className="iap-bchip iap-bchip-ghost">
              C-CORE 핵심진단을 마치면 유형·계층이 여기 표시됩니다.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="iap-banner">
      <span className="iap-banner-ico"><i className="fa-solid fa-user-check" /></span>
      <div className="iap-banner-body">
        <span className="iap-banner-note">{note}</span>
        <div className="iap-banner-chips">
          <span className="iap-bchip iap-bchip-main">
            <i className="fa-solid fa-user-tag" />{type.label}
          </span>
          <span className="iap-bchip iap-bchip-iap">
            <i className="fa-solid fa-layer-group" />{type.tierLabel} 계층
          </span>
          <span className="iap-bchip">
            <i className="fa-solid fa-clipboard-check" />후속진단 {type.followUpTest}
          </span>
          <span className="iap-bchip iap-bchip-ghost">
            진로명확도 {profile.typeScores.진로명확도} · 역량 {profile.typeScores.역량준비도} · 취업 {profile.typeScores.취업준비도}
          </span>
        </div>
      </div>
    </div>
  )
}

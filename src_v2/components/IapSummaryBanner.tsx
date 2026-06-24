import { getActiveStudent, getStudentIap } from '../data/students'
import './IapSummaryBanner.css'

interface IapSummaryBannerProps {
  /** 좌측 안내 문구 (예: "상담 시 참고할 내 진단 요약") */
  note?: string
}

/**
 * 학생유형 · IAP유형 요약 배너.
 * careerProcess.ts(STUDENT_PROFILE)를 단일 소스로 읽어
 * 상담센터·라운지 등 진단 맥락이 필요한 화면에 일관되게 노출한다.
 */
export default function IapSummaryBanner({ note = '내 진단 요약' }: IapSummaryBannerProps) {
  const profile = getActiveStudent()
  const iap = getStudentIap(profile)

  return (
    <div className="iap-banner">
      <span className="iap-banner-ico"><i className="fa-solid fa-user-check" /></span>
      <div className="iap-banner-body">
        <span className="iap-banner-note">{note}</span>
        <div className="iap-banner-chips">
          <span className="iap-bchip iap-bchip-main">
            <i className="fa-solid fa-user-tag" />{profile.studentType}
          </span>
          <span className="iap-bchip iap-bchip-iap">
            <i className="fa-solid fa-diagram-project" />IAP {iap.label}
          </span>
          <span className="iap-bchip">
            <i className="fa-solid fa-graduation-cap" />{profile.grade}학년 · {iap.track} 트랙
          </span>
          <span className="iap-bchip iap-bchip-ghost">
            진로명확도 {profile.typeScores.진로명확도} · 역량 {profile.typeScores.역량준비도} · 취업 {profile.typeScores.취업준비도}
          </span>
        </div>
      </div>
    </div>
  )
}

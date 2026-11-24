import type { ReactNode } from 'react'
import './ProgramConsentForm.css'

/**
 * 비교과 신청서의 「개인정보 제 3자 제공 동의서」 — 현행 드림캐치 신청 시 추가정보 팝업(EpMnAddReqArt.do)의 문구를
 * 그대로 옮겼다. 상담(CounselConsentModal)·AI 자소서(DeepConsent) 동의서와 별개 양식이다.
 * 제공받는 자 중 앞 두 줄은 고정이고 세 번째 줄만 공고마다 상담사가 적는다(현행 SUPP_COMP).
 * 상담사 설정 화면은 `recipientInput` 으로 입력칸을 끼워 넣고, 학생 신청서는 `recipient` 문자열을 보여 준다.
 */
export default function ProgramConsentForm({ recipient, recipientInput, children }: {
  recipient: string; recipientInput?: ReactNode; children?: ReactNode
}) {
  return <div className="program-consent">
    <p>국립창원대학교 취업전략센터 및 대학일자리플러스센터는 이 프로그램과 관련하여 아래와 같이 개인정보를 제 3자에게 제공하고자 합니다.<br />내용을 자세히 읽으신 후 동의 여부를 결정하여 주십시오.</p>
    <p className="program-consent-h">□ 개인정보 제 3자 제공 내역</p>
    <table className="program-consent-table">
      <thead><tr><th>제공받는자</th><th>항목</th><th>제공목적</th><th>보유이용기간</th></tr></thead>
      <tbody>
        <tr>
          <td>한국고용정보원</td>
          <td rowSpan={3}>(신청일 기준) 성명, 연락처, 소속 대학, 주소(주민등록상, 실거주지), 신청일 기준 학년, 졸업 예정년월, 전공(학과, 계열), 주민 등록번호 등</td>
          <td>고용보험 피보험자격 현황 조회</td>
          <td rowSpan={3}>졸업(예정)일로부터 5년</td>
        </tr>
        <tr><td>고용노동부<br />(고용복지+센터)</td><td>취업정보, 컨설팅 등 취업지원 서비스 안내</td></tr>
        <tr><td>{recipientInput ?? recipient}</td><td>진로‧취업지원 프로그램 운영 및 학생지도</td></tr>
      </tbody>
    </table>
    <p className="program-consent-law">본인은 「개인정보보호법」 제 17조에 따라 본인의 개인정보를 제 3자에게 제공하는 것을 동의합니다.</p>
    {children}
  </div>
}

import './ProgramConsentForm.css'

/**
 * 비교과 신청서의 「개인정보 동의서」 — 현행 드림캐치 신청 시 추가정보 팝업(EpMnAddReqArt.do)의 양식을 그대로 옮겼다
 * (수집·이용 동의서 · 고유식별정보 제공 동의 · 불이익 안내 확인 · 안내사항 · 신청자). 문구는 고정이라 상담사가 적는 값이 없다.
 * 상담(CounselConsentModal)·AI 자소서(DeepConsent) 동의서와 별개 양식이다.
 * `onChange` 없이 부르면 예/아니오 없이 양식만 보여 준다(상담사 미리보기).
 */
export type ProgramConsentKey = 'agreeCollect' | 'agreeIdent' | 'agreeNotice'
export type ProgramConsentAnswers = Partial<Record<ProgramConsentKey, 'yes' | 'no'>>
export const PROGRAM_CONSENT_KEYS: ProgramConsentKey[] = ['agreeCollect', 'agreeIdent', 'agreeNotice']

export default function ProgramConsentForm({ value = {}, onChange, applicantName }: {
  value?: ProgramConsentAnswers; onChange?: (next: ProgramConsentAnswers) => void; applicantName?: string
}) {
  const yesNo = (name: ProgramConsentKey) => <div className="program-consent-yn">
    <span>동의하십니까?</span>
    {onChange
      ? (['yes', 'no'] as const).map(v => <label key={v}><input type="radio" name={`program-consent-${name}`} checked={value[name] === v} onChange={() => onChange({ ...value, [name]: v })} />{v === 'yes' ? '예' : '아니오'}</label>)
      : <span>예 / 아니오</span>}
  </div>
  return <div className="program-consent">
    <section className="program-consent-box">
      <h4>개인정보 수집·이용 동의서</h4>
      <p>국립창원대학교 취업전략센터 및 대학일자리플러스센터는 이 프로그램과 관련하여 아래와 같이 개인정보를 수집‧이용하고자 합니다.<br />내용을 자세히 읽으신 후 동의 여부를 결정하여 주십시오.</p>
      <p>본인은 많은 취업 기회를 가질 수 있도록 대학‧고용복지플러스센터를 통하여 취업정보‧컨설팅, 채용연계 등 고용서비스를 제공받기 위해 「개인정보보호법」 제 15조에 따라 개인정보 제공(개인정보처리자로부터 수집‧이용 및 제공을 포함)에 동의 합니다.</p>
      <p className="program-consent-h">□ 개인정보 수집‧이용 목적</p>
      <table className="program-consent-table">
        <thead><tr><th>항목</th><th>수집‧이용 목적</th><th>보유‧이용기간</th></tr></thead>
        <tbody><tr>
          <td>(신청일 기준) 성명, 주민등록번호, 주소(주민등록상, 실거주지), 연락처, 신청일 기준 학년, 졸업예정년월, 전공(학과, 계열)</td>
          <td>취업지원 서비스 제공</td>
          <td>졸업(예정)일로부터 5년</td>
        </tr></tbody>
      </table>
      {yesNo('agreeCollect')}
    </section>
    <section className="program-consent-box">
      <h4>고유식별정보 제공에 대한 동의 여부</h4>
      <p>본인은 취업지원서비스를 받으려는 자로서 「개인정보보호법」 제 24조에 따라 본인의 고유식별정보 제공(개인정보처리자로부터 수집‧이용 및 제공을 포함)에 동의합니다.</p>
      {yesNo('agreeIdent')}
    </section>
    <section className="program-consent-box">
      <h4>불이익 안내 확인 여부</h4>
      <p>참여자는 "국립창원대학교 취업전략센터 및 대학일자리플러스센터"에서 수집하는 고유식별정보에 대해 동의를 거부할 권리가 있으며 동의 거부 시에는 취업지원 서비스 안내가 제한 됩니다.</p>
      {yesNo('agreeNotice')}
    </section>
    <div className="program-consent-notice">
      <p className="program-consent-h">※ 안내사항</p>
      <ol>
        <li>1. 정보 관리 및 보호의 주체는 국립대학교 취업전략센터 및 대학일자리플러스센터 관련 종사자입니다.</li>
        <li>2. 동의한 정보는 본인확인(전자서명)을 통해 열람 및 동의 내역에 대한 정정이 가능하며, 동의의 정정 및 취소를 원할 경우 처리 절차에 따라 처리 됩니다.</li>
        <li>3. 수집된 개인정보는 원칙적으로 보유기간 경과 후 지체 없이 파기 합니다. 단, 관계 법령(공공기록에 관한 법률)에 따라 필요시 일정기간 저장 후 파기 됩니다.</li>
        <li>4. 국립창원대학교 취업전략센터 및 대학일자리플러스센터는 수집된 정보를 통해 동의자의 재학 중 고용서비스를 안내‧제공하고 졸업 후 취업현황을 파악하여 미취업 상태의 동의자에게 고용서비스를 제공합니다.<br />본인은 위 개인정보 수집‧이용‧제3자 제공, 불이익 안내의 동의 또는 확인 여부에 대하여 위와 같이 선택하였음을 확인 합니다.</li>
      </ol>
    </div>
    <p className="program-consent-applicant">신청자 : <strong>{applicantName ?? ''}</strong></p>
  </div>
}

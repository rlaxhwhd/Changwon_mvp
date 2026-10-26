import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import { studentDisplayName } from '../../shared/studentDisplayName'
import './CounselConsentModal.css'

/** 동의서 서식 — 진로취업(취업전략센터)과 심리상담·심리검사(학생상담센터)가 다르다. */
export type ConsentForm = 'career' | 'psych'

/** 신청과 함께 서버에 남는 동의 기록(dc.counsel_consent, 146). 문구를 바꾸면 version 을 서버
 *  backend/app/counsel_consent.py FORMS 와 함께 올린다. */
export interface CounselConsent {
  form: 'CAREER' | 'PSYCH'
  version: string
  answers: Record<string, 'yes' | 'no'>
  signature: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** 동의 완료 후 다음 단계로 진행 (오프라인은 예약 모달, 온라인은 바로 신청) */
  onAgree: (consent: CounselConsent) => void
  /** 신청자 이름 (기본: 현재 활성 학생) */
  applicantName?: string
  /** 기본은 진로취업 상담 동의서 */
  form?: ConsentForm
}

type Answer = 'yes' | 'no' | null

interface ConsentItem {
  id: string
  title: string
  required: boolean
  body: React.ReactNode
}

interface ConsentFormContent {
  code: CounselConsent['form']
  version: string
  title: string
  items: ConsentItem[]
  info?: React.ReactNode
  pledge: string
  warn: string
}

const CAREER: ConsentFormContent = {
  code: 'CAREER',
  version: '2026-10-26',
  title: '상담 신청 동의서',
  items: [
    {
      id: 'privacy',
      title: '개인정보 수집·이용 동의서',
      required: true,
      body: (
        <>
          <p>
            국립창원대학교 취업전략센터 및 대학일자리플러스센터는 상담과 관련하여 아래와 같이 개인정보를
            수집·이용하고자 합니다. 내용을 자세히 읽으신 후 동의 여부를 결정하여 주십시오.
          </p>
          <p>
            본인은 많은 취업 기회를 가질 수 있도록 대학·고용복지플러스센터를 통하여 취업정보·컨설팅, 채용
            연계 등 고용서비스를 제공받기 위해 「개인정보보호법」 제15조에 따라 개인정보 제공(개인정보처리
            자로부터 수집·이용 및 제공을 포함)에 동의합니다.
          </p>
          <div className="ccm-subtitle">□ 개인정보 수집·이용 목적</div>
          <table className="ccm-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>수집·이용 목적</th>
                <th>보유·이용기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  (신청일 기준) 성명, 주민등록번호, 주소(주민등록상, 실거주지), 연락처, 신청일 기준 학년,
                  졸업예정년월, 전공(학과, 계열)
                </td>
                <td>취업지원 서비스 제공</td>
                <td>졸업(예정)일로부터 5년</td>
              </tr>
            </tbody>
          </table>
          <div className="ccm-subtitle">□ 다음과 같은 경우에 내담자의 개인정보와 상담 내용의 일부가 공개될 수 있습니다.</div>
          <ul className="ccm-list">
            <li>내담자의 신변에 위험이 있거나 내담자가 다른 사람들을 해칠 위험이 있는 경우</li>
            <li>내담자와 관련된 법적인 절차에 의해 심리검사(치료)가 진행되는 경우</li>
            <li>
              내담자의 치료(심리검사)와 치료기록이 공적인 업무나 공공기관과 연관되어 있어서 공무집행에 필요한
              자료로 제출되는 경우
            </li>
            <li>내담자가 비밀 보장권을 포기하거나 특정 내용을 공개하도록 상담자와 합의한 경우</li>
            <li>
              국립창원대학교 취업전략센터 및 대학일자리플러스센터 내 사례회의에서 내담자의 개인적인 신상정보
              공개 없이 심리검사 내용을 논의할 수 있으며, 심리검사자는 슈퍼바이저로부터 사례에 대한 슈퍼비전을
              받을 수 있습니다.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'uid',
      title: '고유식별정보 제공에 대한 동의 여부',
      required: true,
      body: (
        <p>
          본인은 취업지원서비스를 받으려는 자로서 「개인정보보호법」 제24조에 따라 본인의 고유식별정보
          제공(개인정보처리자로부터 수집·이용 및 제공을 포함)에 동의합니다.
        </p>
      ),
    },
    {
      id: 'notice',
      title: '불이익 안내 확인 여부',
      required: true,
      body: (
        <p>
          참여자는 "국립창원대학교 취업전략센터 및 대학일자리플러스센터"에서 수집하는 고유식별정보에 대해
          동의를 거부할 권리가 있으며 동의 거부 시에는 취업지원 서비스 안내가 제한됩니다.
        </p>
      ),
    },
  ],
  info: (
    <section className="ccm-info">
      <h4>※ 안내사항</h4>
      <ol>
        <li>정보 관리 및 보호의 주체는 국립창원대학교 취업전략센터 및 대학일자리플러스센터 관련 종사자입니다.</li>
        <li>
          동의한 정보는 본인확인(전자서명)을 통해 열람 및 동의 내역에 대한 정정이 가능하며, 동의의 정정
          및 취소를 원할 경우 처리 절차에 따라 처리됩니다.
        </li>
        <li>
          수집된 개인정보는 원칙적으로 보유기간 경과 후 지체 없이 파기합니다. 단, 관계 법령(공공기록에
          관한 법률)에 따라 필요시 일정기간 저장 후 파기됩니다.
        </li>
        <li>
          국립창원대학교 취업전략센터 및 대학일자리플러스센터는 수집된 정보를 통해 동의자의 재학 중
          고용서비스를 안내·제공하고 졸업 후 취업현황을 파악하여 미취업 상태의 동의자에게 고용서비스를
          제공합니다.
        </li>
      </ol>
    </section>
  ),
  pledge: '본인은 위 개인정보 수집·이용·제3자 제공, 불이익 안내의 동의 또는 확인 여부에 대하여 위와 같이 선택하였음을 확인합니다.',
  warn: '상담 신청을 위해서는 모든 동의 항목에',
}

// 학생상담센터 [붙임 9] 상담 및 개인정보 수집·이용 동의서 원문(2026-10-26 사용자 제공).
const PSYCH: ConsentFormContent = {
  code: 'PSYCH',
  version: '2026-10-26',
  title: '상담 및 개인정보 수집·이용 동의서',
  items: [
    {
      id: 'privacy',
      title: '개인정보 및 민감정보 수집·이용에 대한 동의',
      required: true,
      body: (
        <>
          <table className="ccm-table ccm-table-rows">
            <tbody>
              <tr>
                <th>수집·이용하는 개인정보 및 민감정보 항목</th>
                <td>
                  성명, 생년월일, 성별, 학사정보, 주소, 이메일, 핸드폰번호, 휴학여부, 주거지, 종교, 상담 및
                  검사경험, 현재의 어려움, 가족관계 및 친밀도, 심리검사 결과
                </td>
              </tr>
              <tr>
                <th>개인정보의 수집 및 이용목적</th>
                <td>
                  <ul className="ccm-list">
                    <li>심리검사 및 심리상담을 제공하는데 있어 본인 확인 및 연락 등의 절차에 이용</li>
                    <li>상담 현황 파악 및 신규 서비스 개발을 위한 통계 분석에 활용</li>
                    <li>
                      상담 진행 및 기록을 위하여 상담 내용을 상담일지·메모 등의 방법으로 기록할 수 있음. 다만
                      녹음·녹화 등 별도의 자료 활용이 필요한 경우에는 사전에 목적과 활용 범위를 설명하고 별도의
                      동의를 받음.
                    </li>
                    <li>상담 서비스의 질적 향상을 위해 학생상담센터의 수련감독자가 사례에 대해 지도 및 감독할 수 있음</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <th>개인정보의 보유 및 이용기간</th>
                <td>
                  보유이유: 향후 내방 시 효과적 심리상담 진행 및 편의 제공 위함
                  <br />
                  동의일로부터 일정기간(5년)까지 보관 후 폐기
                </td>
              </tr>
            </tbody>
          </table>
          <p className="ccm-note">
            ※ 제공된 개인정보는 정보주체가 동의한 목적 외의 용도로 이용하지 않으며, 정보주체는 개인정보
            관리책임자를 통해 개인정보의 열람, 정정, 삭제 및 동의 철회를 요구할 수 있습니다.
          </p>
          <p>본인은 「개인정보 보호법」, 같은 법 시행령 및 시행규칙에 따라 위와 같이 개인정보 수집·이용에 동의합니다.</p>
        </>
      ),
    },
    {
      id: 'outsourcing',
      title: '개인정보 처리업무 위탁에 관한 동의',
      required: true,
      body: (
        <>
          <table className="ccm-table ccm-table-rows">
            <tbody>
              <tr><th>수탁업체</th><td>㈜ 미래소프트</td></tr>
              <tr><th>위탁업무 내용</th><td>상담관리시스템 운영 및 유지보수를 위한 최소한의 범위 내 데이터 접근</td></tr>
              <tr><th>위탁기간</th><td>위탁계약 종료 시 또는 시스템 이용 종료 시까지</td></tr>
            </tbody>
          </table>
          <p className="ccm-note">
            ※ 국립창원대학교 학생상담센터는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행
            목적 외 개인정보 처리 금지, 재위탁 금지, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을
            계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다. 수탁업체는
            시스템 운영·유지보수 목적 범위 내에서 최소한의 접근 권한만을 부여받으며, 위탁받은 개인정보를 목적
            외로 이용하거나 제3자에게 제공하지 않습니다.
          </p>
          <p>본인은 위와 같이 개인정보 처리업무를 외부업체에 위탁하는 것에 동의합니다.</p>
        </>
      ),
    },
    {
      id: 'rules',
      title: '학생상담센터 상담 및 심리검사 규정에 대한 동의',
      required: true,
      body: (
        <>
          <ol className="ccm-rules">
            <li>
              상담은 1회에 50분이며, 상담의 회기 수는 상담자와 내담자가 의논하여 10회기 진행을 기준으로
              조정됩니다.
              <ul className="ccm-list">
                <li>필요 시 상담회기 수는 조정될 수 있음. 내부 논의를 통하여 1번당 10회기, 총 2번 연장 가능함.</li>
                <li>상담 종결 시 3개월간 상담을 재신청할 수 없음(단, 응급 및 위기 상황에서는 기간이 조정될 수 있음)</li>
              </ul>
            </li>
            <li>
              학생상담센터의 상담내용은 비밀보장을 원칙으로 하며, 내담자의 동의 없이 타인에게 알리지 않습니다.
              <ul className="ccm-list">
                <li>
                  다만 다음의 경우에는 내담자의 안전 확보 또는 관련 절차에 필요한 최소한의 정보를 보호자·비상연락
                  대상자, 112·119 및 관련 기관 등에 제공할 수 있습니다.
                  <ol className="ccm-sub">
                    <li>내담자의 생명이나 사회의 안전을 위협하는 경우 비밀을 공개하여 안전을 확보한다.</li>
                    <li>법적으로 정보의 공개가 요구되는 경우 내담자의 허락을 득하고 최소한의 정보만을 공유한다.</li>
                    <li>내담자에게 감염성이 있는 치명적인 질병이 있을 경우 그 질병에 노출되어 있는 제3자에게 정보를 공개할 수 있다.</li>
                  </ol>
                </li>
              </ul>
            </li>
            <li>
              상담 진행과정
              <ul className="ccm-list">
                <li>일정 예약 후에 3회 이상 상담시간 이전까지 연락 없이 상담에 오지 않을 경우에는 센터에서 전체 상담을 종료할 수 있습니다.</li>
                <li>
                  상담을 진행하는 중에 상담자에 대한 욕설, 폭력, 위협행위 등으로 상담의 안전성 확보가 어려운
                  경우에는 안전 확보를 우선하며, 센터 내부 논의를 통해 상담 제한·종결 또는 추가 조치가 이루어질 수
                  있습니다.
                </li>
                <li>상담의 원활한 진행을 위하여 복용하고 있는, 혹은 복용 예정인 정신건강의학과 약물에 대해 복약지도에 따라주십시오.</li>
                <li>
                  상담 중 외부상담전문기관(예: 정신건강의학과, 정신건강복지센터)과 연계가 필요한 경우 상담자는 연계
                  목적과 필요성 및 절차를 안내하며, 내담자의 동의를 바탕으로 연계를 진행합니다.
                  <br />※ 연계에 동의하였을 경우에 원활한 진료를 위해서 검사 및 상담 내용 등이 전달될 수 있습니다.
                </li>
              </ul>
            </li>
            <li>
              내담자의 개인정보 제공 및 활용 관련(수퍼비전)
              <ul className="ccm-list">
                <li>학생상담센터에서 운영하고 있는 프로그램에 참가할 때 작성한 신청서, 상담정보를 기록, 녹음 등의 형태로 수집할 수 있습니다.</li>
                <li>
                  수집된 정보는 개인의 신상정보 공개 없이 상담의 성과를 높이기 위하여 사례 자문을 위한 자료로 활용될
                  수 있습니다. (개인정보 수집을 원하지 않을 경우 상담자와 충분한 논의를 하신 후에 결정할 수 있습니다.)
                </li>
                <li>수집된 개인정보는 일정기간(5년)이 지나면 파쇄하여 폐기합니다.</li>
                <li>
                  상담 서비스의 질 향상을 위해 사례 자문 또는 수퍼비전을 실시할 수 있으며, 상담 내용의 녹음·녹화 등
                  별도의 자료 활용이 필요한 경우 사전에 목적과 범위를 설명하고 별도의 동의를 받습니다.
                </li>
              </ul>
            </li>
          </ol>
          <p className="ccm-note">
            귀하는 이에 대한 동의를 거부할 수 있으며, 다만, 동의가 없을 경우 원활한 심리검사 및 심리상담의
            진행이 불가능할 수 있음을 알려드립니다.
          </p>
        </>
      ),
    },
  ],
  pledge: '본인은 위 개인정보 및 민감정보 수집·이용, 개인정보 처리업무 위탁, 학생상담센터 상담 및 심리검사 규정에 대한 동의 여부를 위와 같이 선택하였음을 확인합니다.',
  warn: '심리상담·심리검사 신청을 위해서는 모든 동의 항목에',
}

const FORMS: Record<ConsentForm, ConsentFormContent> = { career: CAREER, psych: PSYCH }

const emptyAnswers = (content: ConsentFormContent) =>
  Object.fromEntries(content.items.map(item => [item.id, null])) as Record<string, Answer>

export default function CounselConsentModal({ open, onClose, onAgree, applicantName, form = 'career' }: Props) {
  const content = FORMS[form]
  const name = applicantName ?? getActiveStudent().name
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => emptyAnswers(content))
  const [signature, setSignature] = useState('')

  useEffect(() => {
    if (open) {
      setAnswers(emptyAnswers(content))
      setSignature('')
    }
  }, [open, content])

  const allAgreed = content.items.every(item => answers[item.id] === 'yes')
  const canSubmit = allAgreed && signature.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onAgree({
      form: content.code, version: content.version, signature: signature.trim(),
      answers: Object.fromEntries(content.items.map(item => [item.id, answers[item.id] ?? 'no'])) as CounselConsent['answers'],
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={content.title} size="lg">
      <div className="ccm-wrap">
        {content.items.map((item, idx) => (
          <section key={item.id} className="ccm-section">
            <header className="ccm-section-head">
              <span className="ccm-section-num">{idx + 1}</span>
              <h3>
                {item.title}
                {item.required && <span className="ccm-required">(필수)*</span>}
              </h3>
            </header>
            <div className="ccm-section-body">{item.body}</div>
            <div className="ccm-answer">
              <span className="ccm-answer-q">동의하십니까?</span>
              <label className={answers[item.id] === 'yes' ? 'on' : ''}>
                <input
                  type="radio"
                  name={`consent-${item.id}`}
                  checked={answers[item.id] === 'yes'}
                  onChange={() => setAnswers(prev => ({ ...prev, [item.id]: 'yes' }))}
                />
                <span>예</span>
              </label>
              <label className={answers[item.id] === 'no' ? 'on' : ''}>
                <input
                  type="radio"
                  name={`consent-${item.id}`}
                  checked={answers[item.id] === 'no'}
                  onChange={() => setAnswers(prev => ({ ...prev, [item.id]: 'no' }))}
                />
                <span>아니오</span>
              </label>
            </div>
          </section>
        ))}

        {content.info}

        <section className="ccm-pledge">
          <p>{content.pledge}</p>
          <div className="ccm-signature">
            <span className="ccm-signature-label">신청자</span>
            <span className="ccm-signature-name">{studentDisplayName(name, getActiveStudent().id)}</span>
            <input
              className="ccm-signature-input"
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="서명"
            />
          </div>
          {!allAgreed && (
            <p className="ccm-warn">
              <i className="fa-solid fa-circle-exclamation" />
              {content.warn} <strong>예</strong>로 응답하셔야 합니다.
            </p>
          )}
        </section>

        <div className="ccm-actions">
          <button className="ccm-btn-ghost" onClick={onClose}>
            상담신청 닫기
          </button>
          {/* 여기서 신청이 끝나지 않는다 — 다음 단계(예약 신청)가 이어진다. */}
          <button className="ccm-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            다음 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    </Modal>
  )
}

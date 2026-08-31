import { useEffect, useState } from 'react'
import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import './CounselConsentModal.css'

interface Props {
  open: boolean
  onClose: () => void
  /** 동의 완료 후 다음 단계로 진행 (오프라인은 예약 모달, 온라인은 바로 신청) */
  onAgree: () => void
  /** 신청자 이름 (기본: 현재 활성 학생) */
  applicantName?: string
}

type Answer = 'yes' | 'no' | null

interface ConsentItem {
  id: 'privacy' | 'uid' | 'notice'
  title: string
  required: boolean
  body: React.ReactNode
}

const ITEMS: ConsentItem[] = [
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
]

export default function CounselConsentModal({ open, onClose, onAgree, applicantName }: Props) {
  const name = applicantName ?? getActiveStudent().name
  const [answers, setAnswers] = useState<Record<string, Answer>>({ privacy: null, uid: null, notice: null })
  const [signature, setSignature] = useState('')

  useEffect(() => {
    if (open) {
      setAnswers({ privacy: null, uid: null, notice: null })
      setSignature('')
    }
  }, [open])

  const allAgreed = ITEMS.every(item => answers[item.id] === 'yes')
  const canSubmit = allAgreed && signature.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onAgree()
  }

  return (
    <Modal open={open} onClose={onClose} title="상담 신청 동의서" size="lg">
      <div className="ccm-wrap">
        {ITEMS.map((item, idx) => (
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

        <section className="ccm-pledge">
          <p>
            본인은 위 개인정보 수집·이용·제3자 제공, 불이익 안내의 동의 또는 확인 여부에 대하여 위와 같이
            선택하였음을 확인합니다.
          </p>
          <div className="ccm-signature">
            <span className="ccm-signature-label">신청자</span>
            <span className="ccm-signature-name">{name}</span>
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
              상담 신청을 위해서는 모든 동의 항목에 <strong>예</strong>로 응답하셔야 합니다.
            </p>
          )}
        </section>

        <div className="ccm-actions">
          <button className="ccm-btn-ghost" onClick={onClose}>
            상담신청 닫기
          </button>
          {/* 여기서 신청이 끝나지 않는다 — 다음 단계(예약·문진표)가 이어진다. */}
          <button className="ccm-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            다음 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    </Modal>
  )
}

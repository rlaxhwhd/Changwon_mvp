import { useState } from 'react'
import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import { collegeOf } from '../../src_admin/data/colleges'
import './ProgramApplyModal.css'

interface Props {
  open: boolean
  onClose: () => void
  programTitle: string
  onSubmit: (payload: {
    path: string
    motive: string
    agree3rd: 'yes' | 'no'
    agreeCollect: 'yes' | 'no'
    agreeIdent: 'yes' | 'no'
    agreeNotice: 'yes' | 'no'
  }) => void
}

type YN = 'yes' | 'no' | ''

export default function ProgramApplyModal({ open, onClose, programTitle, onSubmit }: Props) {
  // 신청서에 뜨는 인적사항은 학사 데이터에서 온다. 없는 값을 지어내지 않는다
  // (CLAUDE.md 규칙 1 — 학사 유래 데이터는 읽기 전용이다).
  const active = getActiveStudent()
  const STUDENT = {
    name: active.name,
    studentId: active.studentNo,
    grade: String(active.grade),
    phone: active.phone || '—',
    email: '—',
    college: collegeOf(active.major),
    dept: active.major,
  }
  const [path, setPath] = useState('')
  const [motive, setMotive] = useState('')
  const [agree3rd, setAgree3rd] = useState<YN>('')
  const [agreeCollect, setAgreeCollect] = useState<YN>('')
  const [agreeIdent, setAgreeIdent] = useState<YN>('')
  const [agreeNotice, setAgreeNotice] = useState<YN>('')

  const reset = () => {
    setPath(''); setMotive('')
    setAgree3rd(''); setAgreeCollect(''); setAgreeIdent(''); setAgreeNotice('')
  }

  const handleClose = () => { reset(); onClose() }

  const allAnswered = agree3rd && agreeCollect && agreeIdent && agreeNotice
  const canSubmit = path.trim() !== '' && motive.trim() !== '' && allAnswered

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      path: path.trim(),
      motive: motive.trim(),
      agree3rd: agree3rd as 'yes' | 'no',
      agreeCollect: agreeCollect as 'yes' | 'no',
      agreeIdent: agreeIdent as 'yes' | 'no',
      agreeNotice: agreeNotice as 'yes' | 'no',
    })
    reset()
  }

  const YesNo = ({ value, onChange, name }: { value: YN; onChange: (v: YN) => void; name: string }) => (
    <div className="pam-yn">
      <label>
        <input type="radio" name={name} checked={value === 'yes'} onChange={() => onChange('yes')} />
        예
      </label>
      <label>
        <input type="radio" name={name} checked={value === 'no'} onChange={() => onChange('no')} />
        아니오
      </label>
    </div>
  )

  return (
    <Modal open={open} onClose={handleClose} title="비교과 프로그램 신청서" size="lg">
      <p className="pam-intro">
        <strong>{programTitle}</strong> 참가 신청을 하세요.
      </p>

      {/* ── 학생 기본정보 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-user" /> 학생 기본정보
        </div>
        <table className="pam-table">
          <tbody>
            <tr>
              <th>이름</th><td>{STUDENT.name}</td>
              <th>학번</th><td>{STUDENT.studentId}</td>
            </tr>
            <tr>
              <th>학년</th><td>{STUDENT.grade}</td>
              <th>연락처</th><td>{STUDENT.phone}</td>
            </tr>
            <tr>
              <th>E-Mail</th><td colSpan={3}>{STUDENT.email}</td>
            </tr>
            <tr>
              <th>대학</th><td>{STUDENT.college}</td>
              <th>학부(과)</th><td>{STUDENT.dept}</td>
            </tr>
          </tbody>
        </table>
        <p className="pam-note">
          본인 사용 번호가 아니라면, 와글/개인정보에 전화번호 꼭 변경하세요.
        </p>
      </div>

      {/* ── 지원경로 ── */}
      <div className="pam-section">
        <label className="pam-section-title" htmlFor="pam-path">
          <i className="fa-regular fa-compass" /> 이 프로그램을 어떻게 알게 되었습니까? <span className="pam-req">*</span>
        </label>
        <textarea
          id="pam-path"
          className="pam-textarea"
          value={path}
          onChange={e => setPath(e.target.value)}
          placeholder="지원경로를 입력해주세요. (예: 학과 공지, 와글, 친구 추천 등)"
        />
      </div>

      {/* ── 지원동기 ── */}
      <div className="pam-section">
        <label className="pam-section-title" htmlFor="pam-motive">
          <i className="fa-regular fa-pen-to-square" /> 이 프로그램에 신청한 동기가 무엇입니까? <span className="pam-req">*</span>
        </label>
        <textarea
          id="pam-motive"
          className="pam-textarea"
          value={motive}
          onChange={e => setMotive(e.target.value)}
          placeholder="지원동기를 자유롭게 작성해 주세요."
        />
      </div>

      {/* ── 개인정보 제3자 제공 동의서 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-id-card" /> 개인정보 제3자 제공 동의서
        </div>
        <div className="pam-doc">
          <p>
            국립창원대학교 취업전략센터 및 대학일자리플러스센터는 이 프로그램과 관련하여 아래와 같이
            개인정보를 제 3자에게 제공하고자 합니다. 내용을 자세히 읽으신 후 동의 여부를 결정하여 주십시오.
          </p>
          <p className="pam-doc-h">□ 개인정보 제 3자 제공 내역</p>
          <table className="pam-table pam-table-doc">
            <thead>
              <tr><th>제공받는자</th><th>항목</th><th>제공목적</th><th>보유이용기간</th></tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan={2}>한국고용정보원<br />고용노동부<br />(고용복지+센터)</td>
                <td rowSpan={2}>
                  (신청일 기준) 성명, 연락처, 소속 대학, 주소(주민등록상, 실거주지),
                  신청일 기준 학년, 졸업 예정년월, 전공(학과, 계열), 주민등록번호 등
                </td>
                <td>고용보험 피보험자격 현황 조회</td>
                <td rowSpan={2}>졸업(예정)일로부터 5년</td>
              </tr>
              <tr>
                <td>취업정보, 컨설팅 등 취업지원 서비스 안내</td>
              </tr>
              <tr>
                <td>국립창원대학교 국립대학육성사업단, 위탁업체</td>
                <td colSpan={2}>진로·취업지원 프로그램 운영 및 학생지도</td>
                <td>졸업(예정)일로부터 5년</td>
              </tr>
            </tbody>
          </table>
          <p>
            본인은 「개인정보보호법」 제 17조에 따라 본인의 개인정보를 제 3자에게 제공하는 것을 동의합니다.
          </p>
          <YesNo value={agree3rd} onChange={setAgree3rd} name="pam-agree-3rd" />
        </div>
      </div>

      {/* ── 개인정보 수집·이용 동의서 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-file-lines" /> 개인정보 수집·이용 동의서
        </div>
        <div className="pam-doc">
          <p>
            국립창원대학교 취업전략센터 및 대학일자리플러스센터는 이 프로그램과 관련하여 아래와 같이
            개인정보를 수집·이용하고자 합니다. 내용을 자세히 읽으신 후 동의 여부를 결정하여 주십시오.
          </p>
          <p>
            본인은 많은 취업 기회를 가질 수 있도록 대학·고용복지플러스센터를 통하여 취업정보·컨설팅,
            채용연계 등 고용서비스를 제공받기 위해 「개인정보보호법」 제 15조에 따라 개인정보 제공
            (개인정보처리자로부터 수집·이용 및 제공을 포함)에 동의합니다.
          </p>
          <p className="pam-doc-h">□ 개인정보 수집·이용 목적</p>
          <table className="pam-table pam-table-doc">
            <thead>
              <tr><th>항목</th><th>수집·이용 목적</th><th>보유·이용기간</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  (신청일 기준) 성명, 주민등록번호, 주소(주민등록상, 실거주지), 연락처,
                  신청일 기준 학년, 졸업예정년월, 전공(학과, 계열)
                </td>
                <td>취업지원 서비스 제공</td>
                <td>졸업(예정)일로부터 5년</td>
              </tr>
            </tbody>
          </table>
          <p className="pam-q">동의하십니까?</p>
          <YesNo value={agreeCollect} onChange={setAgreeCollect} name="pam-agree-collect" />
        </div>
      </div>

      {/* ── 고유식별정보 제공 동의 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-shield-halved" /> 고유식별정보 제공에 대한 동의 여부
        </div>
        <div className="pam-doc">
          <p>
            본인은 취업지원서비스를 받으려는 자로서 「개인정보보호법」 제 24조에 따라 본인의
            고유식별정보 제공(개인정보처리자로부터 수집·이용 및 제공을 포함)에 동의합니다.
          </p>
          <p className="pam-q">동의하십니까?</p>
          <YesNo value={agreeIdent} onChange={setAgreeIdent} name="pam-agree-ident" />
        </div>
      </div>

      {/* ── 불이익 안내 확인 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-circle-exclamation" /> 불이익 안내 확인 여부
        </div>
        <div className="pam-doc">
          <p>
            참여자는 "국립창원대학교 취업전략센터 및 대학일자리플러스센터"에서 수집하는 고유식별정보에
            대해 동의를 거부할 권리가 있으며, 동의 거부 시에는 취업지원 서비스 안내가 제한됩니다.
          </p>
          <p className="pam-q">동의하십니까?</p>
          <YesNo value={agreeNotice} onChange={setAgreeNotice} name="pam-agree-notice" />
        </div>
      </div>

      {/* ── 안내사항 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-circle-info" /> 안내사항
        </div>
        <ol className="pam-notice-list">
          <li>정보 관리 및 보호의 주체는 국립창원대학교 취업전략센터 및 대학일자리플러스센터 관련 종사자입니다.</li>
          <li>동의한 정보는 본인확인(전자서명)을 통해 열람 및 동의 내역에 대한 정정이 가능하며, 동의의 정정 및 취소를 원할 경우 처리 절차에 따라 처리됩니다.</li>
          <li>수집된 개인정보는 원칙적으로 보유기간 경과 후 지체 없이 파기합니다. 단, 관계 법령(공공기록에 관한 법률)에 따라 필요시 일정기간 저장 후 파기됩니다.</li>
          <li>국립창원대학교 취업전략센터 및 대학일자리플러스센터는 수집된 정보를 통해 동의자의 재학 중 고용서비스를 안내·제공하고, 졸업 후 취업현황을 파악하여 미취업 상태의 동의자에게 고용서비스를 제공합니다.</li>
        </ol>
        <p className="pam-confirm">
          본인은 위 개인정보 수집·이용·제3자 제공, 불이익 안내의 동의 또는 확인 여부에 대하여
          위와 같이 선택하였음을 확인합니다.
        </p>
        <p className="pam-sign">
          신청자: <strong>{STUDENT.name}</strong> <span className="pam-sign-mark">(서명)</span>
        </p>
      </div>

      <div className="pam-actions">
        <button className="pam-btn-ghost" onClick={handleClose}>닫기</button>
        <button className="pam-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          신청
        </button>
      </div>
    </Modal>
  )
}

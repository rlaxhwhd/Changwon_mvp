import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import DiagnosisResultReport from './DiagnosisResultReport'
import { getModuleByTestId, typeLabel, type StudentType } from '../data/careerProcess'
import { getDiagnosisResult, levelOf } from '../data/diagnosisResults'

interface CRAReportProps {
  open: boolean
  onClose: () => void
  examDate: string
}

const sectionTitle: React.CSSProperties = { fontSize: 19, fontWeight: 800, color: 'var(--color-navy)', marginBottom: 16, paddingBottom: 8, borderBottom: '3px solid var(--color-warning)' }
const subTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 15, marginBottom: 16 }
const th: React.CSSProperties = { background: 'var(--color-surface)', padding: '8px 12px', border: '1px solid var(--color-border)', fontWeight: 700, textAlign: 'center', color: 'var(--color-navy)' }
const td: React.CSSProperties = { padding: '8px 12px', border: '1px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-sub)' }
const tdLeft: React.CSSProperties = { ...td, textAlign: 'left' }

/** 요인 설명 표 — 요인 정의는 careerProcess 단일 소스에서 온다(여기 다시 적지 않는다). */
function FactorLegend({ testId, codes }: { testId: string; codes?: string[] }) {
  const factors = getModuleByTestId(testId)?.factors ?? []
  return (
    <table style={tbl}>
      <thead>
        <tr>
          {codes && <th style={th}>구분</th>}
          <th style={th}>요인</th>
          <th style={th}>특징</th>
        </tr>
      </thead>
      <tbody>
        {factors.map((f, i) => (
          <tr key={f.name}>
            {codes && <td style={td}>{codes[i]}</td>}
            <td style={td}>{f.name}</td>
            <td style={tdLeft}>{f.desc ?? '요인 설명이 아직 등록되지 않았습니다.'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 6유형별 SMART 지원체계·진로개발 방안 — 검사지 정본 표기. 유형명은 typeLabel 에서 온다. */
const TYPE_GUIDE: { code: StudentType; smart: string; trait: string; actions: string[] }[] = [
  {
    code: 'T1', smart: 'Start 집중형',
    trait: '진로탐색의 필요성을 느끼고 있으나 진로에 대한 인식과 이해가 부족함',
    actions: ['흥미·관심 분야에 대한 자가 점검 수행', '전공 및 직무 정보 탐색 활동 시도', '진로 관련 기록(메모·일지) 작성 시작'],
  },
  {
    code: 'T2', smart: 'Make 진입형',
    trait: '자신의 진로목표를 어느정도 설정하여 준비 중이나 구체적인 준비가 부족함',
    actions: ['설정한 진로 목표의 구체성 점검', '목표 진로에 필요한 역량 목록 정리', '부족 역량에 대한 보완 과제 설정'],
  },
  {
    code: 'T3', smart: 'Action 집중형',
    trait: '진로목표도 어느 정도 있고 역량도 개발하고 있으나 취업준비가 부족함',
    actions: ['보유 역량의 직무 활용 가능성 점검', '경험 활동을 역량 중심으로 재정리', '경험을 성과 중심으로 정리하는 연습'],
  },
  {
    code: 'T4', smart: 'Run 진입형',
    trait: '구체적인 방향성을 가지고 취업준비를 하고 있는 취업 직전 단계임',
    actions: ['취업 준비 현황에 대한 종합 점검', '이력서·자기소개서 초안 작성 시도', '경험을 직무 언어로 변환하는 연습'],
  },
  {
    code: 'T6', smart: 'Top 관리형',
    trait: '전반적인 역량 및 준비도가 우수하여 성과확산의 대상임',
    actions: ['직무 맞춤형 경험 정리 및 고도화', '성과 중심 포트폴리오 완성도 제고', '중장기 진로 경로 점검'],
  },
  {
    code: 'T5', smart: 'Care 집중관리형',
    trait: '진로에 대한 역량이나 준비 뿐만 아니라 진로동기가 부족함',
    actions: ['진로에 대한 불안·회피 인식 점검', '부담 없는 탐색 활동부터 단계적 시도', '일상 속 흥미·성취 경험 기록'],
  },
]

/**
 * 진로몰입 매트릭스 판정 — 바로 위 '유형 설명' 표에 인쇄된 규칙 그대로다.
 * 진로명확성 ↑/↓ × 진로동기 ↑/↓ 의 2×2 (검사지가 정의한 규칙이며 우리가 만든 판정식이 아니다).
 *
 * ↑/↓ 의 기준은 수준 밴드(낮음/보통/높음)가 아니라 T점수 평균 50 이다.
 * 근거 — 결과표 정본: 진로명확성 41.67(보통)·진로동기 37.17 → '미래 유보형'(↓↓),
 *        직무적합성 64.26 ↑ · 조직적합성 47.32(보통) ↓ → '직무열정 유형'.
 *        즉 41.67·47.32 처럼 '보통'이어도 50 미만이면 ↓ 로 읽는다.
 */
const T_MEAN = 50
const ENGAGEMENT_TYPE: Record<string, { name: string; color: string; tips: string[] }> = {
  'up|up': {
    name: '비전실행형', color: 'var(--color-success)',
    tips: ['목표 실행 계획을 학기 단위로 구체화하기', '관심 직무의 실무 경험(인턴·프로젝트) 확보하기'],
  },
  'up|down': {
    name: '망설임형', color: 'var(--color-warning)',
    tips: ['목표는 분명하니 첫 실행 과제를 작게 쪼개 시작하기', '동기를 끌어올릴 롤모델·현직자 인터뷰 진행하기'],
  },
  'down|up': {
    name: '의욕 만렙형', color: 'var(--color-warning)',
    tips: ['높은 에너지를 한 방향으로 모을 목표 직무 3개로 좁히기', '직무 탐색 활동을 기록해 흥미 패턴 확인하기'],
  },
  'down|down': {
    name: '미래 유보형', color: 'var(--color-warning)',
    tips: [
      '기초 진로 탐색: 학교 상담, 직무 박람회, 각종 체험 프로그램 참여하기',
      '작은 성공 경험: 동아리·봉사 등 흥미 있는 활동에서 의미 있는 경험해보기',
      '멘토링·네트워크: 다양한 분야 선배·현직자와 교류 확대하기',
    ],
  },
}

function EngagementMatrix({ studentId }: { studentId: string }) {
  const result = getDiagnosisResult(studentId, 'ccore')
  const scoreOf = (name: string) => result?.factors.find(f => f.name === name)?.tScore
  const clarity = scoreOf('진로명확성')
  const motive = scoreOf('진로동기')
  if (clarity == null || motive == null) return null

  const arrow = (t: number) => (t >= T_MEAN ? 'up' : 'down')
  const type = ENGAGEMENT_TYPE[`${arrow(clarity)}|${arrow(motive)}`]
  const cell = (label: string, t: number) => (
    <div>
      {label}: <strong style={levelOf(t) === '낮음' ? { color: 'var(--color-danger)' } : undefined}>{levelOf(t)}</strong>{' '}
      ({t.toFixed(2)})
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
        <div style={{ fontSize: 15, color: 'var(--color-text-sub)', marginBottom: 8 }}>유형 판정</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: type.color, marginBottom: 12 }}>{type.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          {cell('진로명확성', clarity)}
          {cell('진로동기', motive)}
        </div>
      </div>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-navy)' }}>{type.name} 강화 방안</div>
        <div style={{ fontSize: 15, color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
          {type.tips.map(t => <div key={t}>· {t}</div>)}
        </div>
      </div>
    </div>
  )
}

export default function CRAReport({ open, onClose, examDate }: CRAReportProps) {
  const student = getActiveStudent()
  return (
    <Modal open={open} onClose={onClose} title="CRA 진로준비도 진단검사 결과표" size="lg">
      <div>
        {/* 상단 정보 */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: 'var(--color-text-sub)' }}>검사일시</span> <strong>{examDate}</strong></div>
          <div><span style={{ color: 'var(--color-text-sub)' }}>소속대학</span> <strong>국립창원대학교</strong></div>
          <div><span style={{ color: 'var(--color-text-sub)' }}>학과</span> <strong>{student.major}</strong></div>
          <div><span style={{ color: 'var(--color-text-sub)' }}>학번</span> <strong>20250001</strong></div>
          <div><span style={{ color: 'var(--color-text-sub)' }}>학년</span> <strong>{student.grade}학년</strong></div>
          <div><span style={{ color: 'var(--color-text-sub)' }}>성명</span> <strong>{student.name}</strong></div>
        </div>

        {/* ─── 1. 종합 결과 ─── */}
        <div style={sectionTitle}>종합 결과</div>

        <div style={subTitle}><i className="fa-solid fa-circle-info" /> 요인 설명</div>
        <FactorLegend testId="ccore" />

        <div style={subTitle}><i className="fa-solid fa-chart-column" /> 점수 결과</div>
        {/* 결과표는 상담사 포털과 공유하는 단일 컴포넌트가 그린다 — 여기에 점수를 박지 않는다. */}
        <div style={{ marginBottom: 16 }}>
          <DiagnosisResultReport studentId={student.id} testId="ccore" />
        </div>

        <div style={subTitle}><i className="fa-solid fa-lightbulb" /> 유형별 진로개발 방안</div>
        {/* 강조 행은 이 학생의 6유형을 따른다 — 특정 유형을 고정 강조하지 않는다. */}
        <table style={tbl}>
          <thead><tr><th style={th}>유형</th><th style={th}>SMART 지원체계</th><th style={th}>유형특징</th><th style={th}>진로개발 방안</th></tr></thead>
          <tbody>
            {TYPE_GUIDE.map(g => {
              const mine = g.code === student.studentType
              return (
                <tr key={g.code} style={mine ? { background: 'var(--color-primary-bg)' } : undefined}>
                  <td style={mine ? { ...td, fontWeight: 800 } : td}>{typeLabel(g.code)}</td>
                  <td style={td}>{g.smart}</td>
                  <td style={tdLeft}>{g.trait}</td>
                  <td style={tdLeft}>{g.actions.map(a => <div key={a}>· {a}</div>)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ─── 2. 진로몰입 매트릭스 ─── */}
        <div style={{ ...sectionTitle, marginTop: 32 }}>진로몰입 매트릭스</div>

        <div style={subTitle}><i className="fa-solid fa-table-cells" /> 유형 설명</div>
        <table style={tbl}>
          <thead><tr><th style={th}>유형명</th><th style={th}>진로명확성</th><th style={th}>진로동기</th><th style={th}>특징</th></tr></thead>
          <tbody>
            <tr><td style={td}>비전실행형</td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={tdLeft}>원하는 직무·분야가 분명하고, 이를 성취하려는 열정이 높습니다.</td></tr>
            <tr><td style={td}>망설임형</td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={tdLeft}>무엇을 목표로 할지는 명확하나, 의욕이나 열정이 낮아 적극성이 부족할 수 있습니다.</td></tr>
            <tr><td style={td}>의욕 만렙형</td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={tdLeft}>에너지가 높고 다양한 활동에 도전하려는 의지는 강합니다. 구체적 진로가 정해지지 않았습니다.</td></tr>
            <tr style={{ background: '#FEF3C7' }}><td style={{ ...td, fontWeight: 800 }}>미래 유보형</td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={tdLeft}>진로 목표도 불분명하고, 열정이나 의지도 낮은 상태입니다.</td></tr>
          </tbody>
        </table>

        <EngagementMatrix studentId={student.id} />

        {/* ─── 3. 역량 준비도 ─── */}
        <div style={{ ...sectionTitle, marginTop: 32 }}>역량 준비도</div>

        <div style={subTitle}><i className="fa-solid fa-circle-info" /> 요인 설명</div>
        <table style={tbl}>
          <thead><tr><th style={th}>요인</th><th style={th}>특징</th></tr></thead>
          <tbody>
            <tr><td style={td}>직무적합성 (Job Fit)</td><td style={tdLeft}>개인의 능력, 기술, 경험, 성격 등의 개인역량이 직무요구사항과 일치하는 정도</td></tr>
            <tr><td style={td}>조직적합성 (Organization Fit)</td><td style={tdLeft}>개인의 다양한 특성과 직무 수행 방식이 조직의 문화나 환경에서 효율적으로 적응할 수 있는 정도</td></tr>
          </tbody>
        </table>

        <div style={subTitle}><i className="fa-solid fa-table-cells" /> 유형 설명</div>
        <table style={tbl}>
          <thead><tr><th style={th}>유형명</th><th style={th}>직무적합성</th><th style={th}>조직적합성</th><th style={th}>특징</th></tr></thead>
          <tbody>
            <tr><td style={td}>육각형 인재 유형</td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={tdLeft}>직무와 조직 모두에 잘 적응하며 성과를 잘 낼 가능성이 큽니다.</td></tr>
            <tr style={{ background: 'var(--color-primary-bg)' }}><td style={{ ...td, fontWeight: 800 }}>직무열정 유형</td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={tdLeft}>직무 수행에 필요한 전문지식과 기술이 뛰어나나, 팀 내 협업이나 갈등 해결에 어려움이 있을 수 있습니다.</td></tr>
            <tr><td style={td}>조직융합 유형</td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={td}><i className="fa-solid fa-arrow-up" style={{ color: 'var(--color-success)' }} /></td><td style={tdLeft}>조직의 문화에는 잘 적응하나, 직무 수행에 필요한 기술이나 지식이 부족할 수 있습니다.</td></tr>
            <tr><td style={td}>미래 준비 유형</td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={td}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-danger)' }} /></td><td style={tdLeft}>직무에 필요한 역량이나 경험이 부족해 자신감을 잃기도 합니다.</td></tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
            <div style={{ fontSize: 15, color: 'var(--color-text-sub)', marginBottom: 8 }}>유형 판정</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12 }}>직무열정 유형</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div>직무적합성: <strong style={{ color: 'var(--color-success)' }}>높음</strong> (64.26)</div>
              <div>조직적합성: <strong>보통</strong> (47.32)</div>
            </div>
          </div>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-navy)' }}>직무열정 유형 보완 방안</div>
            <div style={{ fontSize: 15, color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
              <div>· 조직 문화 이해: 다양한 산업군의 회사 탐방, 문화 체험 등을 통해 조직의 규범을 익히기</div>
              <div>· 프로그램 참여: 의사소통/대인관계 관련 프로그램에 참여하여 약점 개선하기</div>
            </div>
          </div>
        </div>

        {/* ─── 4. 취업역량 준비도 ─── */}
        <div style={{ ...sectionTitle, marginTop: 32 }}>취업역량 준비도</div>

        <div style={subTitle}><i className="fa-solid fa-circle-info" /> 요인 설명</div>
        {/* PRIT — 4요인의 머리글자. 요인명·설명은 careerProcess 가 준다. */}
        <FactorLegend testId="c4" codes={['P', 'R', 'I', 'T']} />

        <div style={subTitle}><i className="fa-solid fa-chart-column" /> 점수 결과</div>
        <div style={{ marginBottom: 16 }}>
          <DiagnosisResultReport
            studentId={student.id}
            testId="c4"
            emptyMessage="C-4 구직역량 진단을 아직 응시하지 않았습니다."
          />
        </div>

        <div style={subTitle}><i className="fa-solid fa-screwdriver-wrench" /> 취약 시 구체적 개선 방안</div>
        <table style={tbl}>
          <thead><tr><th style={th}>요인</th><th style={th}>내용</th></tr></thead>
          <tbody>
            <tr><td style={td}>개인 브랜딩</td><td style={tdLeft}>
              <div>· 경쟁 분석과 차별화 전략을 강화하기 위한 구체적인 훈련하기</div>
              <div>· 경험을 구체적으로 서술하고 결과를 수치화하는 연습하기</div>
              <div>· 기업 조사 후 이를 자기소개서에 반영할 수 있는 훈련 강화하기</div>
              <div>· 실패를 어떻게 발전적으로 설명할지 구체적인 사례를 통한 훈련하기</div>
            </td></tr>
            <tr><td style={td}>정보탐색 및 분석</td><td style={tdLeft}>
              <div>· 온라인 자료정기 확인: 주요 채용 포털과 기업 채용 페이지를 매주 방문하여 최신 공고와 트렌드를 분석하기</div>
              <div>· 산업 관련 포럼 및 세미나 참여: 관심 산업의 컨퍼런스, 포럼, 세미나에 참석하여 전문가 의견과 네트워킹 기회를 활용하기</div>
              <div>· 직무 설명회 및 현장 방문: 취업 박람회나 기업 설명회에 참여하거나, 인턴십 기회를 통해서 실제 직무 환경을 체험하기</div>
            </td></tr>
            <tr><td style={td}>면접역량</td><td style={tdLeft}>
              <div>· 비언어적 요소 점검 및 개선 훈련하기</div>
              <div>· 더듬거리지 않도록 발음 연습, 녹음 후 피드백 받기</div>
              <div>· 직무 관련 경험을 쌓아 경험내용을 잘 연결하여 답변하는 연습하기</div>
              <div>· 팀워크나 대인 관계에서의 경험을 예로 들어 긍정적인 대인 관계 능력 강조하기</div>
            </td></tr>
            <tr><td style={td}>구직전략</td><td style={tdLeft}>
              <div>· 매주 구직 활동 및 일정 기록을 작성하고 분석하기</div>
              <div>· 정기적으로 자기 평가를 실시하고, 경력 로드맵을 업데이트하기</div>
              <div>· 자격증 준비 및 스터디 그룹에 참여하여 전문성을 강화하기</div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

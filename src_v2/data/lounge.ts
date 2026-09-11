import { programList } from '../../shared/programStore'
import { roadmapEnvelope } from '../../shared/roadmapStore'
import type { StudentStat } from '../components/StudentStatCards'
import { getStageAccess } from './careerProcess'
import { getDiagnosisCardViews, getPipelineState } from './pipeline'
import { getStudentCounselRequests, type StudentData } from './students'

/** All records come from authenticated PostgreSQL API stores. */
export function getLoungeData(student: StudentData) {
  const diagnosis = getDiagnosisCardViews(student)
  const done = diagnosis.filter(c => c.status === 'done').length
  const requests = getStudentCounselRequests(student.id)
  const active = requests.filter(r => r.status !== '취소')
  const access = getStageAccess(getPipelineState(student))
  const plan = roadmapEnvelope(student.id)?.roadmap
  const roadmap = plan?.confirmed ? plan : null
  const applications = programList().flatMap(p => p.applicants.filter(a => a.studentId === student.id))
  const completed = applications.filter(a => a.outcomeStatus === 'COMPLETED').length
  const stats: StudentStat[] = [
    { kind:'diagnosis', kicker:'CARE 7+', label:'진단 완료', value:String(done), unit:`/${diagnosis.length}`, pct:diagnosis.length ? Math.round(done/diagnosis.length*100) : 0, foot:done === diagnosis.length ? '대상 진단 모두 완료' : '대상 진단 진행 중' },
    { kind:'counsel', label:'상담 현황', total:String(active.length), unit:'건', foot:'전체 누적 · 취소 제외', channels:['진로취업','심리','교수'].map(type => ({label:type,count:`${active.filter(r => r.type === type).length}건`})) },
    { kind:'roadmap', kicker:'CARE 7+', label:'로드맵 이행률', value:String(roadmap?.progress.pct ?? 0), unit:'%', pct:roadmap?.progress.pct ?? 0, foot:roadmap ? `완료 ${roadmap.progress.done} / 전체 ${roadmap.progress.total}칸` : '', lockedReason:roadmap ? undefined : '상담 후 로드맵이 확정되면 확인할 수 있습니다.' },
    { kind:'program', label:'비교과 이수', value:String(completed), unit:`/${applications.length}`, pct:applications.length ? Math.round(completed/applications.length*100) : 0, foot:'전체 신청 대비 이수', lockedReason:access.growth !== 'open' && applications.length === 0 ? '로드맵 확정 후 비교과 이수를 확인할 수 있습니다.' : undefined },
    { kind:'level', label:'성장 레벨', levelUnit:'', level:'', tierLabel:'', tier:'', xp:'', xpFoot:'', pct:0, lockedReason:'성장 레벨·XP 연계 준비 중입니다.' },
  ]
  return {stats, diagnosis, requests, roadmap, access}
}

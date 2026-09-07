// ─────────────────────────────────────────────────────────────────────────
// 상담 질문 챗봇 — LLM 교체 seam (단일 지점)
// 지금은 서버 LLM이 없어 학생 데이터 기반 규칙형 목업으로 응답한다.
// TODO(gem5): 서버에 LLM(gem5) 설치 후 askCounselBot 본문만 실제 API 호출로 교체.
//   화면(Chatbot.tsx)은 이 함수 시그니처만 구독하므로 무변경으로 실서비스 전환된다.
//   예) const res = await fetch('/api/counsel-bot', { method: 'POST',
//         body: JSON.stringify({ input, context }) }); return (await res.json()).reply
// ─────────────────────────────────────────────────────────────────────────
import { STUDENTS } from '../../src_v2/data/students'

export interface ChatMessage { role: 'bot' | 'user'; text: string }

/** 상담 맥락 — 현재 상담 진행 중인 학생 등 */
export interface ChatContext { studentId?: string }

/** 상담사 질문 생성 봇 응답 (현재: 목업 / 향후: gem5). */
export async function askCounselBot(input: string, context: ChatContext): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 500)) // 실시간 생성 느낌 (목업 지연)

  const student = context.studentId ? STUDENTS.find(s => s.id === context.studentId) : undefined
  if (!student) {
    return '상담 진행 화면에서 열면 그 학생 맞춤 질문을 추천해 드려요. 지금은 일반 안내만 가능합니다.'
  }

  const questions = student.counselorQuestions ?? []
  if (questions.length === 0) {
    return `${student.name} 학생에 대한 추천 질문 데이터가 아직 없습니다.`
  }

  const trimmed = input.trim()
  const intro = trimmed
    ? `"${trimmed}" 관점에서 ${student.name} 학생에게 이렇게 물어보시면 좋아요:`
    : `${student.name} 학생(${student.studentType} · 목표 ${student.targetCompany.name}) 상담에 도움이 될 질문입니다:`
  return `${intro}\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
}

/** 패널 최초 인사말 */
export function botGreeting(context: ChatContext): string {
  const student = context.studentId ? STUDENTS.find(s => s.id === context.studentId) : undefined
  return student
    ? `안녕하세요! ${student.name} 학생 상담 도우미예요. 궁금한 점을 물어보거나 아래 '질문 추천'을 눌러보세요.`
    : '안녕하세요! 상담 질문 도우미예요. 상담 진행 화면에서 열면 학생 맞춤 질문을 추천해 드려요.'
}

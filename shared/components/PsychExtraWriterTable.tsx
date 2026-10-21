import type { PsychExtraWriter } from '../psychExtraRequests'
import './PsychExtraWriterTable.css'

/** 추가 심리상담신청의 「상담 정보」 표 — 학생 팝업과 상담사 상세가 같이 쓴다(학사 유래, 읽기 전용). */
export default function PsychExtraWriterTable({ writer }: { writer: PsychExtraWriter | null }) {
  const value = (text: string | number | null | undefined) => (writer ? (text || '-') : '…')
  return (
    <table className="pxw-table">
      <tbody>
        <tr><th scope="row">이름</th><td colSpan={3}>{value(writer?.name)}</td></tr>
        <tr><th scope="row">학번</th><td>{value(writer?.studentNo)}</td><th scope="row">학년</th><td>{value(writer?.grade)}</td></tr>
        <tr><th scope="row">연락처</th><td>{value(writer?.phone)}</td><th scope="row">E-mail</th><td>{value(writer?.email)}</td></tr>
        <tr><th scope="row">대학</th><td>{value(writer?.college)}</td><th scope="row">학부(과)</th><td>{value(writer?.major)}</td></tr>
      </tbody>
    </table>
  )
}

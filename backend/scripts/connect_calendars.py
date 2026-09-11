from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
for name in ('CareerCounsel','PsychCounsel'):
    p=ROOT/f'src_v2/pages/counsel/{name}.tsx'
    s=p.read_text(encoding='utf-8')
    s="import { slotAvailable } from '../../../shared/counselOperationsStore'\n"+s
    start=s.index('// 데모 예약 완료 슬롯')
    end=s.index('export default function',start)
    s=s[:start]+'''function getCounselorsForSlot(dayIndex: number, timeIndex: number) {
  return counselors.filter(c => slotAvailable(c.id, days[dayIndex].iso, times[timeIndex]))
}

'''+s[end:]
    s=s.replace('!reservedSlots.has(`${counselor.id}-${selectedSlot.day.key}-${selectedSlot.time}`)', 'slotAvailable(counselor.id, selectedSlot.day.iso, selectedSlot.time)')
    s=s.replace("if (reservedSlots.has(`${selectedCounselor}-${dayKey}-${time}`)) return 'reserved'", "const day = days.find(d => d.key === dayKey)!\n    if (!counselors.some(c => slotAvailable(c.id, day.iso, time))) return 'reserved'")
    p.write_text(s,encoding='utf-8')
p=ROOT/'src_v2/pages/counsel/ProfessorCounsel.tsx'
s=p.read_text(encoding='utf-8')
s="import { slotAvailable } from '../../../shared/counselOperationsStore'\n"+s
start=s.index('const reservedSlots = new Set(')
end=s.index('])',start)+2
s=s[:start]+s[end:]
s=s.replace("if (reservedSlots.has(`${activeProfessor.id}-${dayKey}-${time}`)) return 'reserved'", "if (!slotAvailable(activeProfessor.id, days.find(d => d.key === dayKey)!.iso, time)) return 'reserved'")
p.write_text(s,encoding='utf-8')

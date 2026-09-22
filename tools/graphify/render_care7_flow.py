"""Render the reviewed CARE 7+ workflow as a standalone SVG (no dependencies)."""
from html import escape
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/CARE7_FLOW.svg'
parts = ['''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1600" viewBox="0 0 1440 1600" role="img" aria-labelledby="title desc">
<title id="title">CARE 7+ 진단부터 이어지는 상담까지</title>
<desc id="desc">C-CORE, 6유형별 후속진단, CARE 7+ 상담, 상담일지 저장 후 완료, 로드맵 생성, 이어서 상담, 로드맵 확정 순서의 플로우 차트.</desc>
<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9" fill="none" stroke="#737b71" stroke-width="1.3"/></marker></defs>
<rect width="1440" height="1600" fill="#f7f6f3"/>
<g font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" fill="#2f3437">''']


def text(x, y, label, size=18, anchor='middle', color='#2f3437', weight=400):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{color}" font-weight="{weight}">{escape(label)}</text>')


def line(points, arrow=True):
    marker = ' marker-end="url(#arrow)"' if arrow else ''
    parts.append(f'<polyline points="{points}" fill="none" stroke="#737b71" stroke-width="1.7"{marker}/>')


def box(x, y, w, h, title, subtitle='', fill='#ffffff', size=21):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="#c9cec6"/>')
    text(x+w/2, y+(h/2-5 if subtitle else h/2+7), title, size, weight=600)
    if subtitle:
        text(x+w/2, y+h/2+24, subtitle, 16, color='#555e53')


text(60, 55, 'DREAMCATCH / CARE 7+', 15, 'start', '#60695b', 600)
text(60, 103, '진단부터 로드맵을 활용한 상담까지', 34, 'start', weight=700)
text(60, 138, '상담일지를 저장·완료한 뒤 로드맵을 만들고, 생성된 계획을 보며 바로 이어서 상담합니다.', 18, 'start')
box(450, 180, 540, 80, '01  C-CORE 핵심진단', '학생 · 진단 결과에 따라 6유형 중 하나로 분류', '#edf3ec')
line('720,260 720,290')
box(540, 290, 360, 55, '결과 유형에 맞는 후속진단 1종', fill='#fbf3db', size=18)
line('720,345 720,365', False)
line('155,365 1285,365', False)
types = [('T1 진로탐색형','C1 진로탐색'),('T2 진로설정형','C2 진로설정'),('T3 역량성장형','C3 역량수준'),('T4 취업준비형','C4 구직역량'),('T5 취약관리형','C5 취약요인'),('T6 우수인재형','C6 우수인재')]
for i, (name, test) in enumerate(types):
    x = 50 + i*226
    mid = x+105
    line(f'{mid},365 {mid},393')
    box(x, 393, 210, 92, name, test+' 진단', size=19)
    line(f'{mid},485 {mid},516', False)
line('155,516 1285,516', False)
line('720,516 720,548')
box(450, 548, 540, 64, 'C-CORE + 해당 후속진단 완료?', fill='#fbf3db', size=21)
line('990,580 1128,580')
text(1055, 565, '아니오', 15)
box(1130, 548, 260, 64, '미완료 진단 진행', size=18)
line('1260,612 1260,643 960,643 960,612')
line('720,612 720,662')
text(740, 642, '예', 15, 'start')
steps = [
    (662, '02  CARE 7+ 상담 신청 · 예약 확정', '학생 신청 → 상담사 예약 확정'),
    (792, '03  CARE 7+ 상담 진행', '진단 결과와 유형별 상담 주제를 활용'),
    (922, '04  상담일지 작성 · 저장 후 완료 처리', '최종 유형 · 정성진단 5개 · 상담내용 · 학생 공개 코멘트'),
    (1052, '05  첫 로드맵 생성 · 초안 저장', 'IAP 실행 / CORE 역량 / GROWTH 성장 · 3축'),
    (1182, '06  로드맵을 보며 바로 이어서 상담', '생성된 계획을 학생과 함께 검토'),
    (1312, '07  로드맵 확정', '상담사가 확정하면 학생에게 공개'),
]
for index, (y, title, subtitle) in enumerate(steps):
    box(360, y, 720, 90, title, subtitle, '#edf3ec' if index in (2,4) else '#ffffff')
    if index < len(steps)-1:
        line(f'720,{y+90} 720,{y+130}')
text(1110, 958, '임시저장만으로는', 16, 'start', '#7c6632')
text(1110, 982, '첫 로드맵 생성 불가', 16, 'start', '#7c6632')
line('60,1440 1380,1440', False)
text(60, 1474, '읽는 기준', 17, 'start', weight=600)
text(60, 1505, '• 이어서 상담: 2026-09-21 사용자 확인. 별도 예약이나 새로운 상담 건을 자동 생성한다는 뜻은 아닙니다.', 16, 'start')
text(60, 1532, '• C5·C6는 유형 매핑에 포함되지만 결과표 항목은 미정입니다. 이 차트는 운영 진단 연동 완료를 뜻하지 않습니다.', 16, 'start')
text(60, 1565, '근거: PROCESS.md · careerProcess.ts · CounselSession.tsx · roadmap.py / Graphify 코드 관계 확인', 14, 'start', '#60695b')
parts.append('</g></svg>')
svg = '\n'.join(parts)
ET.fromstring(svg)
OUT.write_text(svg, encoding='utf-8')
print(OUT)

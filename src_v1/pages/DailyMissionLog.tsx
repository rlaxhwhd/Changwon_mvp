import { useState } from 'react';
import Modal from '../components/Modal';

interface DailyMissionLogProps {
  onToast?: (msg: string, type?: 'info' | 'success') => void;
}

type TabKind = 'all' | 'word' | 'major' | 'ncs';

interface ProblemRecord {
  id: string;
  date: string;
  tab: 'word' | 'major' | 'ncs';
  category: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

const records: ProblemRecord[] = [
  { id: 'w1', date: '2026-04-19', tab: 'word', category: '영단어', question: 'perseverance', userAnswer: '인내', correctAnswer: '인내', isCorrect: true, explanation: '어려움에도 포기하지 않는 끈기. persist 계열.' },
  { id: 'w2', date: '2026-04-19', tab: 'word', category: '영단어', question: 'ambiguous', userAnswer: '모호한', correctAnswer: '모호한', isCorrect: true, explanation: '의미가 여러 가지로 해석될 수 있음. ambi = 양쪽.' },
  { id: 'w3', date: '2026-04-19', tab: 'word', category: '영단어', question: 'meticulous', userAnswer: '신중한', correctAnswer: '꼼꼼한', isCorrect: false, explanation: 'meticulous = 세세한 부분까지 신경 쓰는. careful보다 강한 의미.' },
  { id: 'm1', date: '2026-04-19', tab: 'major', category: '네트워크', question: 'OSI 7계층 중 전송 계층은?', userAnswer: '4계층', correctAnswer: '4계층', isCorrect: true, explanation: 'Transport Layer. TCP/UDP가 동작. 종단 간 신뢰성 보장.' },
  { id: 'm2', date: '2026-04-19', tab: 'major', category: '객체지향', question: '디자인 패턴 중 싱글톤의 목적은?', userAnswer: '인스턴스 공유', correctAnswer: '인스턴스 1개 보장', isCorrect: false, explanation: '싱글톤은 전역 단일 인스턴스 접근점을 제공. 스레드 안전 구현이 중요.' },
  { id: 'm3', date: '2026-04-19', tab: 'major', category: '자료구조', question: '스택과 큐의 차이는?', userAnswer: 'LIFO vs FIFO', correctAnswer: 'LIFO vs FIFO', isCorrect: true, explanation: '스택은 Last-In First-Out, 큐는 First-In First-Out.' },
  { id: 'n1', date: '2026-04-19', tab: 'ncs', category: '의사소통', question: '다음 지문의 핵심 주제는?', userAnswer: '환경보호', correctAnswer: '환경보호', isCorrect: true, explanation: '지문 서두와 결론에서 반복 강조.' },
  { id: 'n2', date: '2026-04-19', tab: 'ncs', category: '수리능력', question: '할인율 계산', userAnswer: '18%', correctAnswer: '20%', isCorrect: false, explanation: '원가 대비 할인액 / 원가 × 100. 계산식 재점검 필요.' },
  { id: 'n3', date: '2026-04-19', tab: 'ncs', category: '문제해결', question: '우선순위 판단', userAnswer: 'B', correctAnswer: 'B', isCorrect: true, explanation: '긴급도·중요도 매트릭스에서 B가 최우선.' },

  { id: 'w4', date: '2026-04-18', tab: 'word', category: '영단어', question: 'inevitable', userAnswer: '피할 수 없는', correctAnswer: '피할 수 없는', isCorrect: true, explanation: 'in(부정) + evitable(피할 수 있는) = 피할 수 없는.' },
  { id: 'w5', date: '2026-04-18', tab: 'word', category: '영단어', question: 'candid', userAnswer: '솔직한', correctAnswer: '솔직한', isCorrect: true, explanation: '꾸밈없이 솔직한. frank와 유사.' },
  { id: 'm4', date: '2026-04-18', tab: 'major', category: '네트워크', question: 'HTTP와 HTTPS 차이', userAnswer: 'TLS 유무', correctAnswer: 'TLS 유무', isCorrect: true, explanation: 'HTTPS는 TLS/SSL 위에서 동작. 암호화 + 인증 제공.' },
  { id: 'n4', date: '2026-04-18', tab: 'ncs', category: '자원관리', question: '시간 자원 분배', userAnswer: '24시간', correctAnswer: '24시간', isCorrect: true, explanation: '주어진 조건에서 효율적 배분. 8+8+8 원칙.' },

  { id: 'w6', date: '2026-04-17', tab: 'word', category: '영단어', question: 'elaborate', userAnswer: '간단한', correctAnswer: '정교한/상세히 설명하다', isCorrect: false, explanation: 'elaborate는 형용사(정교한) + 동사(상세히 설명하다) 둘 다 가능.' },
  { id: 'm5', date: '2026-04-17', tab: 'major', category: '데이터베이스', question: '정규화 1NF 조건', userAnswer: '원자값', correctAnswer: '원자값', isCorrect: true, explanation: '1NF = 모든 속성이 원자값(atomic). 반복 그룹 제거.' },
  { id: 'm6', date: '2026-04-17', tab: 'major', category: '운영체제', question: '교착상태 4조건 중 아닌 것은?', userAnswer: '우선순위', correctAnswer: '우선순위', isCorrect: true, explanation: '상호배제·점유대기·비선점·순환대기. 우선순위는 해당 없음.' },
  { id: 'n5', date: '2026-04-17', tab: 'ncs', category: '의사소통', question: '문서 이해 유형', userAnswer: '공문', correctAnswer: '공문', isCorrect: true, explanation: '정형화된 양식, 격식 높은 어투가 특징.' },
];

const tabStyle: Record<ProblemRecord['tab'], { label: string; icon: string; color: string; bg: string }> = {
  word: { label: '영단어', icon: 'fa-solid fa-book', color: '#22C55E', bg: '#F0FDF4' },
  major: { label: '전공퀴즈', icon: 'fa-solid fa-laptop-code', color: '#6366F1', bg: '#EEF2FF' },
  ncs: { label: 'NCS', icon: 'fa-solid fa-briefcase', color: '#F59E0B', bg: '#FEF3C7' },
};

export default function DailyMissionLog({ onToast }: DailyMissionLogProps) {
  const [tab, setTab] = useState<TabKind>('all');
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [detail, setDetail] = useState<ProblemRecord | null>(null);

  const filtered = records.filter(r => {
    if (tab !== 'all' && r.tab !== tab) return false;
    if (filter === 'correct' && !r.isCorrect) return false;
    if (filter === 'wrong' && r.isCorrect) return false;
    return true;
  });

  const total = records.length;
  const correct = records.filter(r => r.isCorrect).length;
  const wrong = total - correct;
  const accuracy = Math.round((correct / total) * 100);

  // 일자별 그룹
  const byDate = filtered.reduce<Record<string, ProblemRecord[]>>((acc, r) => {
    (acc[r.date] ||= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // 카테고리별 오답 집계
  const wrongByCategory = records.filter(r => !r.isCorrect).reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h1>일일미션 기록노트</h1>
        <p>매일 풀었던 문제와 정오답 기록을 한 눈에 확인하세요</p>
      </div>

      {/* 통계 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>총 문제 수</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#6366F1' }}>{total}개</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>정답</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>{correct}개</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>오답</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>{wrong}개</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>정답률</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{accuracy}%</div>
        </div>
      </div>

      {/* 오답 카테고리 분석 */}
      {Object.keys(wrongByCategory).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#EF4444' }} /> 자주 틀리는 카테고리
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(wrongByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, cnt]) => (
                <span key={cat} style={{
                  padding: '6px 12px', background: '#FEF2F2', color: '#EF4444',
                  borderRadius: 14, fontSize: 13, fontWeight: 600,
                }}>
                  <i className="fa-solid fa-circle-xmark" style={{ marginRight: 4 }} />
                  {cat} · {cnt}회
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 필터 탭 */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { k: 'all' as const, label: '전체' },
              { k: 'word' as const, label: '영단어' },
              { k: 'major' as const, label: '전공퀴즈' },
              { k: 'ncs' as const, label: 'NCS' },
            ]).map(t => (
              <button
                key={t.k}
                className={`btn btn-sm ${tab === t.k ? '' : 'btn-outline'}`}
                onClick={() => setTab(t.k)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { k: 'all' as const, label: '모두', color: '#6B7280' },
              { k: 'correct' as const, label: '정답만', color: '#22C55E' },
              { k: 'wrong' as const, label: '오답만', color: '#EF4444' },
            ]).map(f => (
              <button
                key={f.k}
                className={`btn btn-sm ${filter === f.k ? '' : 'btn-outline'}`}
                onClick={() => setFilter(f.k)}
                style={filter === f.k ? { background: f.color, borderColor: f.color } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#6B7280' }}>
            {filtered.length}개 조회됨
          </div>
        </div>
      </div>

      {/* 일자별 기록 */}
      {dates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: 36, marginBottom: 12 }} />
          <div>해당 조건에 맞는 기록이 없습니다</div>
        </div>
      ) : (
        dates.map(date => (
          <div key={date} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #E5E7EB' }}>
              <i className="fa-solid fa-calendar-day" style={{ color: '#6366F1', fontSize: 16 }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{date}</span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {byDate[date].filter(r => r.isCorrect).length}정답 · {byDate[date].filter(r => !r.isCorrect).length}오답
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {byDate[date].map(r => (
                <div
                  key={r.id}
                  onClick={() => setDetail(r)}
                  style={{
                    padding: 12,
                    border: `1px solid ${r.isCorrect ? '#BBF7D0' : '#FECACA'}`,
                    borderRadius: 8,
                    background: r.isCorrect ? '#F0FDF4' : '#FEF2F2',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: tabStyle[r.tab].bg, color: tabStyle[r.tab].color,
                    }}>
                      <i className={tabStyle[r.tab].icon} />
                      {tabStyle[r.tab].label}
                    </span>
                    {r.isCorrect ? (
                      <span style={{ color: '#22C55E', fontSize: 14 }}>
                        <i className="fa-solid fa-circle-check" /> 정답
                      </span>
                    ) : (
                      <span style={{ color: '#EF4444', fontSize: 14 }}>
                        <i className="fa-solid fa-circle-xmark" /> 오답
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    {r.question}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    카테고리: {r.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* 상세 모달 */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail ? `${tabStyle[detail.tab].label} · ${detail.category}` : ''} size="md">
        {detail && (
          <div>
            <div style={{
              padding: 14, background: detail.isCorrect ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${detail.isCorrect ? '#BBF7D0' : '#FECACA'}`,
              borderRadius: 8, marginBottom: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, color: detail.isCorrect ? '#22C55E' : '#EF4444', marginBottom: 4 }}>
                <i className={`fa-solid ${detail.isCorrect ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: detail.isCorrect ? '#16A34A' : '#DC2626' }}>
                {detail.isCorrect ? '정답' : '오답'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{detail.date}</div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">문제</div>
              <p style={{ fontSize: 15, color: '#111827', fontWeight: 600, lineHeight: 1.7 }}>{detail.question}</p>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">내 답변</div>
              <p style={{
                fontSize: 14, color: detail.isCorrect ? '#16A34A' : '#DC2626',
                padding: 10, background: detail.isCorrect ? '#F0FDF4' : '#FEF2F2',
                borderRadius: 6, fontWeight: 500,
              }}>
                {detail.userAnswer}
              </p>
            </div>

            {!detail.isCorrect && (
              <div className="detail-section">
                <div className="detail-section-title">정답</div>
                <p style={{
                  fontSize: 14, color: '#16A34A', padding: 10, background: '#F0FDF4',
                  borderRadius: 6, fontWeight: 500,
                }}>
                  {detail.correctAnswer}
                </p>
              </div>
            )}

            <div className="ai-comment" style={{ marginTop: 12 }}>
              <div className="ai-label"><i className="fa-solid fa-lightbulb" /> 해설</div>
              {detail.explanation}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-sm btn-outline" onClick={() => onToast?.('오답 노트에 추가되었습니다', 'success')}>
                <i className="fa-solid fa-bookmark" /> 오답 노트
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => onToast?.('유사 문제를 추천합니다')}>
                <i className="fa-solid fa-shuffle" /> 유사 문제
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

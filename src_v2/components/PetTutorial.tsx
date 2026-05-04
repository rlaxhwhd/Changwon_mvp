import { useState, useEffect, useMemo, useRef } from 'react';
import type { PageId } from '../types';
import './PetTutorial.css';

type PetType = 'dog' | 'penguin' | 'cat' | 'dragon';
type Stage = 'baby' | 'teen' | 'adult' | 'legendary';

interface PetTutorialProps {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

interface PetMeta {
  type: PetType;
  label: string;
  defaultName: string;
  emoji: string;
  accent: string;
}

const PETS: PetMeta[] = [
  { type: 'dog', label: '강아지', defaultName: '누렁이', emoji: '🐶', accent: '#E09A4F' },
  { type: 'penguin', label: '펭귄', defaultName: '핑구', emoji: '🐧', accent: '#3D5A80' },
  { type: 'cat', label: '고양이', defaultName: '나비', emoji: '🐱', accent: '#A68A7A' },
  { type: 'dragon', label: '용', defaultName: '드래고', emoji: '🐉', accent: '#4C8B4A' },
];

interface Quest {
  id: string;
  step: number;
  title: string;
  desc: string;
  icon: string;
  page: PageId;
  accent: string;
  dialogue: string;
  ctaLabel: string;
}

const QUESTS: Quest[] = [
  { id: 'q1', step: 1, title: '진단센터', desc: '9CORE·인적성·CARES 검사로 나를 알아가기', icon: 'fa-solid fa-clipboard-check', page: 'career-diagnosis', accent: '#0D8B7C',
    dialogue: '먼저 진단센터에서 나를 알아봐요!', ctaLabel: '진단 시작' },
  { id: 'q2', step: 2, title: '목표 기업 설정', desc: 'AI로 희망 기업·직무 합격률 분석하기', icon: 'fa-solid fa-bullseye', page: 'ai-prediction', accent: '#0E7490',
    dialogue: '가고 싶은 기업을 정해볼까요?', ctaLabel: '기업 설정' },
  { id: 'q3', step: 3, title: '전문 상담', desc: '상담사와 1:1 커리어 방향 정하기', icon: 'fa-solid fa-comments', page: 'counsel-career', accent: '#047857',
    dialogue: '전문 상담사와 이야기를 나눠봐요', ctaLabel: '상담 신청' },
  { id: 'q4', step: 4, title: '로드맵 생성', desc: '나만의 커리어 로드맵 만들기', icon: 'fa-solid fa-route', page: 'ai-roadmap', accent: '#7C3AED',
    dialogue: '이제 나만의 로드맵을 만들어봐요', ctaLabel: '로드맵 생성' },
  { id: 'q5', step: 5, title: '역량 개발', desc: '비교과 프로그램·자격증으로 실력 쌓기', icon: 'fa-solid fa-rocket', page: 'program-apply', accent: '#1D4ED8',
    dialogue: '프로그램에 참여해서 실력을 쌓아요', ctaLabel: '프로그램 보기' },
  { id: 'q6', step: 6, title: '취업 지원', desc: 'AI 이력서·면접으로 최종 취업 준비', icon: 'fa-solid fa-briefcase', page: 'ai-jobs', accent: '#DC2626',
    dialogue: '마지막! 이력서와 면접을 준비해요', ctaLabel: '취업 지원' },
];

const GUIDE_STEP = {
  title: '드림캐치 가이드',
  dialogue: '안녕! 드림캐치에 온 걸 환영해. 먼저 가이드부터 살펴볼까?',
  ctaLabel: '가이드 확인',
};

/* ── XP / Level / Stage ── */
const XP_PER_LEVEL = 20;
const MAX_LEVEL = 50;
const MAX_XP = (MAX_LEVEL - 1) * XP_PER_LEVEL; // 980
const XP_GUIDE = 40;
const XP_QUEST = 40;
const XP_FEED = 50;
const XP_PET = 10;

const STAGE_LABEL: Record<Stage, string> = {
  baby: 'BABY',
  teen: 'TEEN',
  adult: 'ADULT',
  legendary: 'LEGENDARY',
};

const STAGE_SIZE: Record<Stage, number> = {
  baby: 110,
  teen: 140,
  adult: 175,
  legendary: 200,
};

function stageFor(level: number): Stage {
  if (level >= 40) return 'legendary';
  if (level >= 26) return 'adult';
  if (level >= 13) return 'teen';
  return 'baby';
}

function levelFromXp(xp: number): number {
  return Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function clampXp(xp: number): number {
  return Math.max(0, Math.min(MAX_XP + XP_PER_LEVEL, xp));
}

const STORAGE_PET = 'v2.pet.type';
const STORAGE_XP = 'v2.pet.xp';
const STORAGE_GUIDE = 'v2.pet.guideDone';
const STORAGE_QUESTS = 'v2.pet.completedQuests';

function readPet(): PetType {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PET) : null;
  if (v === 'dog' || v === 'penguin' || v === 'cat' || v === 'dragon') return v;
  return 'dog';
}

function readGuideDone(): boolean {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_GUIDE) : null;
  return v === '1';
}

function readXp(): number {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_XP) : null;
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) && n >= 0 ? clampXp(n) : 0;
}

function readQuests(): Set<string> {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_QUESTS) : null;
  try {
    const arr = v ? JSON.parse(v) : [];
    if (Array.isArray(arr)) return new Set(arr.filter((s): s is string => typeof s === 'string'));
  } catch {
    /* ignore parse errors */
  }
  return new Set();
}

export default function PetTutorial({ onNavigate, onToast }: PetTutorialProps) {
  const [petType, setPetType] = useState<PetType>(() => readPet());
  const [guideDone, setGuideDone] = useState<boolean>(() => readGuideDone());
  const [completed, setCompleted] = useState<Set<string>>(() => readQuests());
  const [xp, setXp] = useState<number>(() => readXp());
  const [bounce, setBounce] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_PET, petType); }, [petType]);
  useEffect(() => { localStorage.setItem(STORAGE_GUIDE, guideDone ? '1' : '0'); }, [guideDone]);
  useEffect(() => { localStorage.setItem(STORAGE_QUESTS, JSON.stringify([...completed])); }, [completed]);
  useEffect(() => { localStorage.setItem(STORAGE_XP, String(xp)); }, [xp]);

  const petMeta = useMemo(() => PETS.find((p) => p.type === petType) ?? PETS[0], [petType]);
  const level = levelFromXp(xp);
  const stage = stageFor(level);
  const spriteSize = STAGE_SIZE[stage];

  const totalSteps = 1 + QUESTS.length;
  const doneSteps = (guideDone ? 1 : 0) + completed.size;
  const allDone = guideDone && completed.size === QUESTS.length;

  const nextQuest = useMemo(() => QUESTS.find((q) => !completed.has(q.id)), [completed]);

  // Stage-up detection → toast
  const prevStageRef = useRef<Stage>(stage);
  useEffect(() => {
    if (prevStageRef.current !== stage) {
      const prev = prevStageRef.current;
      prevStageRef.current = stage;
      const order: Stage[] = ['baby', 'teen', 'adult', 'legendary'];
      const advanced = order.indexOf(stage) > order.indexOf(prev);
      if (advanced) {
        onToast(`✨ ${petMeta.defaultName}이(가) ${STAGE_LABEL[stage]} 단계로 진화했어요!`, 'success');
      }
    }
  }, [stage, petMeta.defaultName, onToast]);

  const triggerBounce = () => {
    setBounce(true);
    window.setTimeout(() => setBounce(false), 600);
  };

  const gainXp = (amount: number) => {
    setXp((prev) => clampXp(prev + amount));
  };

  const handleGuideComplete = () => {
    if (!guideDone) {
      setGuideDone(true);
      gainXp(XP_GUIDE);
      triggerBounce();
      onToast(`드림캐치 가이드 완수! +${XP_GUIDE} XP`, 'success');
    }
  };

  const handleQuestStart = (q: Quest) => {
    if (!completed.has(q.id)) {
      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(q.id);
        return next;
      });
      gainXp(XP_QUEST);
      triggerBounce();
      onToast(`${q.title} 완료! +${XP_QUEST} XP`, 'success');
    }
    onNavigate(q.page);
  };

  const handleFeed = () => {
    gainXp(XP_FEED);
    triggerBounce();
    onToast(`${petMeta.defaultName}에게 밥을 주었어요! +${XP_FEED} XP`, 'success');
  };

  const handlePet = () => {
    gainXp(XP_PET);
    triggerBounce();
    onToast(`${petMeta.defaultName}가(이) 기뻐합니다! +${XP_PET} XP`, 'info');
  };

  const handleReset = () => {
    setGuideDone(false);
    setCompleted(new Set());
    setXp(0);
    prevStageRef.current = 'baby';
    onToast('진행 상태가 초기화되었어요', 'info');
  };

  const currentDialogue = allDone
    ? '튜토리얼 완료! 준비가 끝났어요 🎉 이제 밥주기·쓰다듬기로 계속 성장시켜요.'
    : !guideDone
      ? GUIDE_STEP.dialogue
      : (nextQuest?.dialogue ?? '');
  const currentCtaLabel = allDone
    ? '모두 완료됨'
    : !guideDone
      ? GUIDE_STEP.ctaLabel
      : (nextQuest?.ctaLabel ?? '');
  const currentCtaDisabled = allDone;
  const currentAccent = !guideDone ? '#4F9C80' : (nextQuest?.accent ?? '#4F9C80');
  const currentStepLabel = !guideDone
    ? GUIDE_STEP.title
    : (allDone ? '모든 퀘스트 완료' : `STEP ${nextQuest?.step}. ${nextQuest?.title}`);

  const handleCurrentCta = () => {
    if (allDone) return;
    if (!guideDone) { handleGuideComplete(); return; }
    if (nextQuest) handleQuestStart(nextQuest);
  };

  const xpForDisplay = Math.min(xp, MAX_XP);
  const xpPct = Math.round((xpForDisplay / MAX_XP) * 100);
  const atMax = level >= MAX_LEVEL;

  return (
    <section className="v2-pet-tutorial">
      <div className="v2-pet-header">
        <div className="v2-pet-title-row">
          <div className="v2-pet-title-icon"><i className="fa-solid fa-seedling" /></div>
          <div>
            <h2 className="v2-pet-title">드림캐치 펫 튜토리얼</h2>
            <p className="v2-pet-sub">
              신입생이라 정보가 없어도 괜찮아요. 레벨업 하면 펫의 모습이 진화합니다 (BABY → TEEN → ADULT → LEGENDARY).
            </p>
          </div>
        </div>
        <div className="v2-pet-picker">
          {PETS.map((p) => (
            <button
              key={p.type}
              type="button"
              className={`v2-pet-pick ${petType === p.type ? 'v2-pet-pick-active' : ''}`}
              onClick={() => { setPetType(p.type); triggerBounce(); }}
              style={petType === p.type ? { borderColor: p.accent, color: p.accent } : undefined}
            >
              <span className="v2-pet-pick-emoji">{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="v2-pet-body">
        <div className={`v2-pet-stage v2-pet-stage-${stage}`}>
          <ForestBackdrop />

          <div className="v2-pet-hud">
            <div className="v2-pet-level-badge" style={{ background: petMeta.accent }}>
              <span className="v2-pet-level-label">Lv</span>
              <span className="v2-pet-level-num">{level}</span>
            </div>
            <div className={`v2-pet-stage-badge v2-pet-stage-badge-${stage}`}>
              {STAGE_LABEL[stage]}
            </div>
            <div className="v2-pet-xp-block">
              <div className="v2-pet-xp-bar">
                <div
                  className="v2-pet-xp-fill"
                  style={{ width: `${xpPct}%`, background: petMeta.accent }}
                />
              </div>
              <span className="v2-pet-xp-text">
                {atMax ? 'MAX' : `${xpForDisplay} / ${MAX_XP} XP`}
              </span>
            </div>
            <div className="v2-pet-progress-pill">
              튜토리얼 {doneSteps}/{totalSteps}
            </div>
          </div>

          <div
            className={`v2-pet-sprite ${bounce ? 'v2-pet-bounce' : ''} ${stage === 'legendary' ? 'v2-pet-aura' : ''}`}
            style={{ width: spriteSize, height: spriteSize }}
          >
            <PetSvg type={petType} stage={stage} size={spriteSize} />
            <div className="v2-pet-shadow" />
          </div>

          <div className="v2-pet-dialog">
            <div className="v2-pet-dialog-head">
              <span className="v2-pet-dialog-name">{petMeta.defaultName}</span>
              <span className="v2-pet-dialog-step">{currentStepLabel}</span>
            </div>
            <p className="v2-pet-dialog-text">{currentDialogue}</p>
            <button
              type="button"
              className="v2-pet-dialog-cta"
              style={{ background: currentAccent }}
              onClick={handleCurrentCta}
              disabled={currentCtaDisabled}
            >
              {currentCtaLabel}
              {!currentCtaDisabled && <i className="fa-solid fa-arrow-right" />}
            </button>
          </div>

          <div className="v2-pet-actions">
            <button type="button" className="v2-pet-action" onClick={handleFeed}>
              <i className="fa-solid fa-drumstick-bite" /> 밥주기 <em>+{XP_FEED}</em>
            </button>
            <button type="button" className="v2-pet-action" onClick={handlePet}>
              <i className="fa-solid fa-hand-holding-heart" /> 쓰다듬기 <em>+{XP_PET}</em>
            </button>
          </div>
        </div>

        <div className="v2-pet-quests">
          <div className="v2-pet-quests-head">
            <h3 className="v2-pet-quests-title">
              <i className="fa-solid fa-scroll" /> 퀘스트 목록
            </h3>
            <button type="button" className="v2-pet-reset" onClick={handleReset}>
              <i className="fa-solid fa-arrow-rotate-left" /> 초기화
            </button>
          </div>
          <ul className="v2-pet-quest-list">
            <li className={`v2-pet-quest ${guideDone ? 'v2-pet-quest-done' : ''}`}>
              <div className="v2-pet-quest-step" style={{ background: guideDone ? '#4F9C80' : '#E5E7EB', color: guideDone ? '#fff' : '#6B7280' }}>
                {guideDone ? <i className="fa-solid fa-check" /> : '0'}
              </div>
              <div className="v2-pet-quest-main">
                <div className="v2-pet-quest-title-row">
                  <i className="fa-solid fa-book-open" style={{ color: '#4F9C80' }} />
                  <span className="v2-pet-quest-title">{GUIDE_STEP.title}</span>
                  {guideDone && <span className="v2-pet-quest-badge">완료</span>}
                </div>
                <p className="v2-pet-quest-desc">전체 커리어 흐름 살펴보기</p>
              </div>
            </li>
            {QUESTS.map((q) => {
              const done = completed.has(q.id);
              return (
                <li key={q.id} className={`v2-pet-quest ${done ? 'v2-pet-quest-done' : ''}`}>
                  <div className="v2-pet-quest-step" style={{ background: done ? q.accent : '#E5E7EB', color: done ? '#fff' : '#6B7280' }}>
                    {done ? <i className="fa-solid fa-check" /> : q.step}
                  </div>
                  <div className="v2-pet-quest-main">
                    <div className="v2-pet-quest-title-row">
                      <i className={q.icon} style={{ color: q.accent }} />
                      <span className="v2-pet-quest-title">{q.title}</span>
                      {done && <span className="v2-pet-quest-badge">완료</span>}
                    </div>
                    <p className="v2-pet-quest-desc">{q.desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════
   Forest backdrop (2D fantasy)
   ══════════════════════════════════════════════════════ */
function ForestBackdrop() {
  return (
    <svg className="v2-pet-forest" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="v2-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8D5E6" />
          <stop offset="60%" stopColor="#D9EBD1" />
          <stop offset="100%" stopColor="#7FA77B" />
        </linearGradient>
        <linearGradient id="v2-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9BBF82" />
          <stop offset="100%" stopColor="#6B8E5A" />
        </linearGradient>
        <radialGradient id="v2-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="600" height="360" fill="url(#v2-sky)" />
      <circle cx="470" cy="70" r="90" fill="url(#v2-sun)" />
      <circle cx="470" cy="70" r="28" fill="#FFF2C4" />

      <path d="M0 220 Q150 170 300 210 T600 205 L600 260 L0 260 Z" fill="#A8C796" opacity="0.8" />
      <path d="M0 235 Q120 200 240 230 T480 225 T600 230 L600 260 L0 260 Z" fill="#8FB47D" opacity="0.9" />

      {[40, 110, 180, 250, 320, 390, 460, 530].map((x, i) => (
        <Tree key={`far-${i}`} x={x} y={220} scale={0.55} shadeA="#6B9060" shadeB="#557A4B" />
      ))}
      {[80, 200, 360, 520].map((x, i) => (
        <Tree key={`mid-${i}`} x={x} y={240} scale={0.8} shadeA="#4F7D47" shadeB="#3E6839" />
      ))}

      <rect x="0" y="270" width="600" height="90" fill="url(#v2-ground)" />

      <Bush x={40} y={295} color="#5A8A54" />
      <Bush x={540} y={300} color="#4E7E4B" />
      <Bush x={120} y={310} color="#6B9863" />
      <Bush x={470} y={312} color="#6B9863" />

      <Mushroom x={170} y={322} />
      <Mushroom x={430} y={326} />
      <Rock x={250} y={325} />
      <Rock x={380} y={330} scale={0.7} />

      {[20, 90, 150, 210, 280, 340, 400, 460, 520, 580].map((x, i) => (
        <GrassTuft key={`g-${i}`} x={x} y={330 + (i % 2) * 3} />
      ))}
    </svg>
  );
}

interface TreeProps { x: number; y: number; scale: number; shadeA: string; shadeB: string; }
function Tree({ x, y, scale, shadeA, shadeB }: TreeProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-4" y="0" width="8" height="24" fill="#5B3A24" rx="1" />
      <polygon points="-28,0 0,-48 28,0" fill={shadeB} />
      <polygon points="-24,-20 0,-64 24,-20" fill={shadeA} />
      <polygon points="-18,-42 0,-78 18,-42" fill={shadeB} />
    </g>
  );
}

interface BushProps { x: number; y: number; color: string; }
function Bush({ x, y, color }: BushProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="-10" cy="0" rx="12" ry="9" fill={color} />
      <ellipse cx="8" cy="-2" rx="14" ry="10" fill={color} />
      <ellipse cx="0" cy="2" rx="18" ry="10" fill={color} />
    </g>
  );
}

function Mushroom({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-3" y="-2" width="6" height="8" fill="#F4E4C6" rx="1" />
      <ellipse cx="0" cy="-4" rx="8" ry="5" fill="#D9534F" />
      <circle cx="-3" cy="-5" r="1.2" fill="#fff" />
      <circle cx="2" cy="-3" r="1" fill="#fff" />
    </g>
  );
}

function Rock({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="12" ry="6" fill="#8A8F93" />
      <ellipse cx="-2" cy="-2" rx="8" ry="3" fill="#A5ABB0" />
    </g>
  );
}

function GrassTuft({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke="#4B7E3F" strokeWidth="1.6" strokeLinecap="round">
      <line x1="-3" y1="0" x2="-4" y2="-6" />
      <line x1="0" y1="0" x2="0" y2="-8" />
      <line x1="3" y1="0" x2="4" y2="-6" />
    </g>
  );
}

/* ══════════════════════════════════════════════════════
   Pet SVGs — dispatcher + per-stage art
   Later swap any case for <img src="/pets/<type>-<stage>.png" />
   ══════════════════════════════════════════════════════ */
interface PetSvgProps { type: PetType; stage: Stage; size: number; }
function PetSvg({ type, stage, size }: PetSvgProps) {
  if (type === 'dragon') {
    if (stage === 'baby') return <DragonBaby size={size} />;
    if (stage === 'teen') return <DragonTeen size={size} />;
    if (stage === 'adult') return <DragonAdult size={size} />;
    return <DragonLegendary size={size} />;
  }
  if (type === 'dog') return <DogStages stage={stage} size={size} />;
  if (type === 'cat') return <CatStages stage={stage} size={size} />;
  return <PenguinStages stage={stage} size={size} />;
}

/* ── DRAGON — 4 distinct stages ───────────────────────── */
function DragonBaby({ size }: { size: number }) {
  // Baby: cream/amber, big eyes, oversized head, tiny folded wings
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      {/* small tail curl */}
      <path d="M118 122 Q134 124 132 108" stroke="#D4A85C" strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* body */}
      <ellipse cx="80" cy="116" rx="32" ry="24" fill="#F3D5A7" />
      <ellipse cx="80" cy="122" rx="22" ry="13" fill="#FBECCA" />
      {/* tiny folded wings */}
      <path d="M54 106 Q44 98 48 86 Q58 94 62 108 Z" fill="#C25A4C" opacity="0.9" />
      <path d="M106 106 Q116 98 112 86 Q102 94 98 108 Z" fill="#C25A4C" opacity="0.9" />
      {/* feet */}
      <ellipse cx="64" cy="136" rx="7" ry="4" fill="#D4A85C" />
      <ellipse cx="96" cy="136" rx="7" ry="4" fill="#D4A85C" />
      {/* BIG head */}
      <circle cx="80" cy="62" r="38" fill="#F3D5A7" />
      <ellipse cx="80" cy="76" rx="18" ry="11" fill="#FBECCA" />
      {/* tiny horn nubs */}
      <polygon points="68,32 66,22 72,30" fill="#E2B573" />
      <polygon points="92,32 94,22 88,30" fill="#E2B573" />
      {/* big amber eyes */}
      <ellipse cx="66" cy="62" rx="8" ry="9" fill="#fff" />
      <ellipse cx="94" cy="62" rx="8" ry="9" fill="#fff" />
      <ellipse cx="66" cy="64" rx="5" ry="6" fill="#E8813A" />
      <ellipse cx="94" cy="64" rx="5" ry="6" fill="#E8813A" />
      <circle cx="66" cy="64" r="2.4" fill="#1A1A1A" />
      <circle cx="94" cy="64" r="2.4" fill="#1A1A1A" />
      <circle cx="67.5" cy="62" r="1.2" fill="#fff" />
      <circle cx="95.5" cy="62" r="1.2" fill="#fff" />
      {/* tiny nostrils */}
      <circle cx="75" cy="76" r="1" fill="#8B5E2A" />
      <circle cx="85" cy="76" r="1" fill="#8B5E2A" />
      {/* mouth smile */}
      <path d="M72 84 Q80 88 88 84" stroke="#8B5E2A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function DragonTeen({ size }: { size: number }) {
  // Teen: standing, more proportioned body, visible horns, half-spread wings, warmer orange
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      {/* spread wings (half) */}
      <path d="M38 70 Q18 56 22 32 Q42 52 56 80 Z" fill="#B5473C" stroke="#8A2F29" strokeWidth="1.2" />
      <path d="M122 70 Q142 56 138 32 Q118 52 104 80 Z" fill="#B5473C" stroke="#8A2F29" strokeWidth="1.2" />
      <line x1="40" y1="68" x2="28" y2="44" stroke="#8A2F29" strokeWidth="0.8" />
      <line x1="120" y1="68" x2="132" y2="44" stroke="#8A2F29" strokeWidth="0.8" />
      {/* tail with small tip */}
      <path d="M118 120 Q140 120 136 98 Q144 102 142 112" stroke="#D99048" strokeWidth="8" strokeLinecap="round" fill="none" />
      <polygon points="144,94 150,100 142,102" fill="#F2C068" />
      {/* body */}
      <ellipse cx="80" cy="108" rx="36" ry="26" fill="#D99048" />
      <ellipse cx="80" cy="118" rx="24" ry="14" fill="#F2C068" />
      {/* back spikes */}
      <polygon points="66,82 70,74 76,82" fill="#F2C068" />
      <polygon points="78,78 82,70 86,78" fill="#F2C068" />
      <polygon points="90,82 94,74 100,82" fill="#F2C068" />
      {/* legs */}
      <rect x="58" y="124" width="11" height="16" rx="5" fill="#B5743A" />
      <rect x="92" y="124" width="11" height="16" rx="5" fill="#B5743A" />
      {/* head */}
      <circle cx="80" cy="64" r="30" fill="#D99048" />
      {/* horns (visible, curved) */}
      <path d="M62 42 Q58 22 68 36" fill="#F2C068" stroke="#A97225" strokeWidth="1" />
      <path d="M98 42 Q102 22 92 36" fill="#F2C068" stroke="#A97225" strokeWidth="1" />
      {/* snout */}
      <ellipse cx="80" cy="78" rx="16" ry="10" fill="#F2C068" />
      <circle cx="75" cy="78" r="1.4" fill="#1A1A1A" />
      <circle cx="85" cy="78" r="1.4" fill="#1A1A1A" />
      {/* eyes — slightly fiercer */}
      <ellipse cx="70" cy="60" rx="4.5" ry="6" fill="#F2C068" />
      <ellipse cx="90" cy="60" rx="4.5" ry="6" fill="#F2C068" />
      <rect x="68.5" y="56" width="1.4" height="7" fill="#1E1E1E" rx="0.7" />
      <rect x="88.5" y="56" width="1.4" height="7" fill="#1E1E1E" rx="0.7" />
      {/* mouth — slight open */}
      <path d="M72 86 Q80 93 88 86" stroke="#5A3018" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <polygon points="76,86 78,91 79,86" fill="#fff" />
      <polygon points="82,86 81,91 84,86" fill="#fff" />
    </svg>
  );
}

function DragonAdult({ size }: { size: number }) {
  // Adult: larger body, scales, fuller wings, fierce face, multiple horns
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      {/* FULL wings */}
      <path d="M30 80 Q4 60 8 22 Q34 44 54 84 Z" fill="#4A2A22" stroke="#2B1610" strokeWidth="1.4" />
      <path d="M130 80 Q156 60 152 22 Q126 44 106 84 Z" fill="#4A2A22" stroke="#2B1610" strokeWidth="1.4" />
      <path d="M30 80 Q12 72 18 56" stroke="#2B1610" strokeWidth="0.9" fill="none" />
      <path d="M30 80 Q12 64 24 40" stroke="#2B1610" strokeWidth="0.7" fill="none" />
      <path d="M130 80 Q148 72 142 56" stroke="#2B1610" strokeWidth="0.9" fill="none" />
      <path d="M130 80 Q148 64 136 40" stroke="#2B1610" strokeWidth="0.7" fill="none" />
      {/* spiked tail */}
      <path d="M118 122 Q148 118 144 94 Q154 96 148 110" stroke="#7A3B2A" strokeWidth="10" strokeLinecap="round" fill="none" />
      <polygon points="146,82 158,90 146,96" fill="#E8A850" />
      <polygon points="132,108 138,100 138,110" fill="#E8A850" />
      {/* body with scales */}
      <ellipse cx="80" cy="108" rx="40" ry="28" fill="#7A3B2A" />
      <ellipse cx="80" cy="116" rx="24" ry="16" fill="#E8A850" />
      {/* scale dots */}
      <g fill="#5A2A1C" opacity="0.6">
        <circle cx="66" cy="100" r="1.5" />
        <circle cx="74" cy="104" r="1.5" />
        <circle cx="86" cy="104" r="1.5" />
        <circle cx="94" cy="100" r="1.5" />
        <circle cx="70" cy="92" r="1.2" />
        <circle cx="90" cy="92" r="1.2" />
      </g>
      {/* back spikes row */}
      <polygon points="58,86 62,74 68,86" fill="#E8A850" stroke="#A86628" strokeWidth="0.6" />
      <polygon points="70,82 74,70 80,82" fill="#E8A850" stroke="#A86628" strokeWidth="0.6" />
      <polygon points="82,78 86,66 92,78" fill="#E8A850" stroke="#A86628" strokeWidth="0.6" />
      <polygon points="94,82 98,70 104,82" fill="#E8A850" stroke="#A86628" strokeWidth="0.6" />
      {/* legs with claws */}
      <rect x="54" y="124" width="14" height="18" rx="6" fill="#4A2A22" />
      <rect x="92" y="124" width="14" height="18" rx="6" fill="#4A2A22" />
      <polygon points="56,142 58,146 60,142" fill="#FFE6AA" />
      <polygon points="60,142 62,146 64,142" fill="#FFE6AA" />
      <polygon points="94,142 96,146 98,142" fill="#FFE6AA" />
      <polygon points="98,142 100,146 102,142" fill="#FFE6AA" />
      {/* head */}
      <circle cx="80" cy="62" r="32" fill="#7A3B2A" />
      <ellipse cx="80" cy="78" rx="19" ry="13" fill="#E8A850" />
      {/* multi horns */}
      <polygon points="58,36 52,14 66,30" fill="#F2D07A" stroke="#8E5D22" strokeWidth="0.9" />
      <polygon points="102,36 108,14 94,30" fill="#F2D07A" stroke="#8E5D22" strokeWidth="0.9" />
      <polygon points="68,32 66,22 74,30" fill="#F2D07A" stroke="#8E5D22" strokeWidth="0.7" />
      <polygon points="92,32 94,22 86,30" fill="#F2D07A" stroke="#8E5D22" strokeWidth="0.7" />
      {/* nostrils */}
      <ellipse cx="74" cy="78" rx="1.5" ry="2.3" fill="#1A1A1A" />
      <ellipse cx="86" cy="78" rx="1.5" ry="2.3" fill="#1A1A1A" />
      {/* fierce eyes */}
      <ellipse cx="68" cy="58" rx="5" ry="6" fill="#F2D07A" />
      <ellipse cx="92" cy="58" rx="5" ry="6" fill="#F2D07A" />
      <rect x="66.5" y="54" width="1.6" height="8" fill="#1E1E1E" rx="0.8" />
      <rect x="90.5" y="54" width="1.6" height="8" fill="#1E1E1E" rx="0.8" />
      {/* brow lines */}
      <path d="M60 52 L72 48" stroke="#3A1810" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M100 52 L88 48" stroke="#3A1810" strokeWidth="1.6" strokeLinecap="round" />
      {/* open mouth with teeth */}
      <path d="M70 86 Q80 98 90 86" stroke="#3A1810" strokeWidth="1.6" fill="#5A1818" strokeLinecap="round" />
      <polygon points="74,87 76,94 78,87" fill="#fff" />
      <polygon points="80,87 82,95 84,87" fill="#fff" />
      <polygon points="84,87 86,94 87,87" fill="#fff" />
    </svg>
  );
}

function DragonLegendary({ size }: { size: number }) {
  // Legendary: dark scales, cyan accents, massive spread wings, glowing eyes, battle stance
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      <defs>
        <radialGradient id="v2-dragon-aura" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#5ED9D0" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#5ED9D0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="v2-dragon-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2731" />
          <stop offset="100%" stopColor="#2D4250" />
        </linearGradient>
        <linearGradient id="v2-dragon-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2C3B45" />
          <stop offset="100%" stopColor="#1A252D" />
        </linearGradient>
      </defs>
      {/* aura */}
      <circle cx="80" cy="80" r="78" fill="url(#v2-dragon-aura)" />

      {/* MASSIVE wings — spread wide, membrane with bone ridges */}
      <path d="M34 80 Q2 50 4 8 Q28 28 44 58 Q54 78 52 86 Z" fill="url(#v2-dragon-wing)" stroke="#0B1218" strokeWidth="1.4" />
      <path d="M126 80 Q158 50 156 8 Q132 28 116 58 Q106 78 108 86 Z" fill="url(#v2-dragon-wing)" stroke="#0B1218" strokeWidth="1.4" />
      {/* wing bone ribs */}
      <path d="M34 80 Q14 58 12 22" stroke="#0B1218" strokeWidth="1.2" fill="none" />
      <path d="M34 80 Q22 52 32 18" stroke="#0B1218" strokeWidth="0.9" fill="none" />
      <path d="M34 80 Q30 54 48 32" stroke="#0B1218" strokeWidth="0.7" fill="none" />
      <path d="M126 80 Q146 58 148 22" stroke="#0B1218" strokeWidth="1.2" fill="none" />
      <path d="M126 80 Q138 52 128 18" stroke="#0B1218" strokeWidth="0.9" fill="none" />
      <path d="M126 80 Q130 54 112 32" stroke="#0B1218" strokeWidth="0.7" fill="none" />
      {/* wing cyan veins */}
      <path d="M34 80 Q16 58 10 24" stroke="#5ED9D0" strokeWidth="0.7" fill="none" opacity="0.8" />
      <path d="M126 80 Q144 58 150 24" stroke="#5ED9D0" strokeWidth="0.7" fill="none" opacity="0.8" />
      {/* wing claw tips */}
      <polygon points="4,8 0,0 14,14" fill="#0B1218" />
      <polygon points="156,8 160,0 146,14" fill="#0B1218" />

      {/* tail long with spikes */}
      <path d="M118 124 Q150 122 146 96 Q158 94 152 112 Q148 128 130 134" stroke="#1A252D" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M118 124 Q150 122 146 96" stroke="#5ED9D0" strokeWidth="1.2" fill="none" opacity="0.6" />
      <polygon points="156,86 144,96 150,108" fill="#2C3B45" stroke="#0B1218" strokeWidth="0.9" />
      <polygon points="132,108 138,98 138,112" fill="#2C3B45" />
      <polygon points="142,116 146,108 148,120" fill="#2C3B45" />

      {/* body — dark scales with cyan highlight */}
      <ellipse cx="80" cy="108" rx="42" ry="30" fill="url(#v2-dragon-body)" />
      <ellipse cx="80" cy="116" rx="24" ry="16" fill="#456070" />
      {/* scale pattern */}
      <g fill="#0B1218" opacity="0.55">
        <circle cx="64" cy="100" r="1.6" /><circle cx="72" cy="104" r="1.6" />
        <circle cx="80" cy="101" r="1.4" /><circle cx="88" cy="104" r="1.6" />
        <circle cx="96" cy="100" r="1.6" />
        <circle cx="68" cy="94" r="1.3" /><circle cx="92" cy="94" r="1.3" />
        <circle cx="76" cy="96" r="1.1" /><circle cx="84" cy="96" r="1.1" />
      </g>
      {/* cyan scale highlights */}
      <g fill="#5ED9D0" opacity="0.5">
        <circle cx="70" cy="108" r="0.8" /><circle cx="78" cy="112" r="0.8" />
        <circle cx="86" cy="108" r="0.8" /><circle cx="94" cy="106" r="0.6" />
      </g>
      {/* big back spikes */}
      <polygon points="54,88 58,72 66,88" fill="#2C3B45" stroke="#0B1218" strokeWidth="0.8" />
      <polygon points="68,82 72,62 80,82" fill="#2C3B45" stroke="#0B1218" strokeWidth="0.8" />
      <polygon points="80,78 86,56 94,78" fill="#2C3B45" stroke="#0B1218" strokeWidth="0.8" />
      <polygon points="94,82 100,62 106,82" fill="#2C3B45" stroke="#0B1218" strokeWidth="0.8" />
      {/* legs with claws */}
      <rect x="52" y="124" width="16" height="20" rx="7" fill="#1A252D" />
      <rect x="92" y="124" width="16" height="20" rx="7" fill="#1A252D" />
      <polygon points="54,144 56,150 59,144" fill="#C8E9E4" />
      <polygon points="58,144 60,150 63,144" fill="#C8E9E4" />
      <polygon points="62,144 64,150 67,144" fill="#C8E9E4" />
      <polygon points="94,144 96,150 99,144" fill="#C8E9E4" />
      <polygon points="98,144 100,150 103,144" fill="#C8E9E4" />
      <polygon points="102,144 104,150 107,144" fill="#C8E9E4" />

      {/* rocky platform */}
      <path d="M36 146 Q80 156 124 146 L124 156 L36 156 Z" fill="#3A4A54" opacity="0.5" />

      {/* head — menacing */}
      <path d="M60 50 Q80 26 100 50 Q108 62 104 76 Q90 92 80 92 Q70 92 56 76 Q52 62 60 50 Z" fill="url(#v2-dragon-body)" />
      {/* elongated snout */}
      <path d="M68 72 Q80 90 92 72 Q96 84 88 94 Q80 98 72 94 Q64 84 68 72 Z" fill="#2C3B45" />
      <ellipse cx="80" cy="86" rx="12" ry="5" fill="#456070" />
      {/* MULTIPLE horns swept back */}
      <path d="M56 50 Q38 26 52 18 Q60 28 62 46 Z" fill="#3A4A54" stroke="#0B1218" strokeWidth="0.8" />
      <path d="M104 50 Q122 26 108 18 Q100 28 98 46 Z" fill="#3A4A54" stroke="#0B1218" strokeWidth="0.8" />
      <path d="M66 42 Q56 20 68 24 Z" fill="#3A4A54" stroke="#0B1218" strokeWidth="0.7" />
      <path d="M94 42 Q104 20 92 24 Z" fill="#3A4A54" stroke="#0B1218" strokeWidth="0.7" />
      {/* head spikes on top */}
      <polygon points="74,28 78,16 82,28" fill="#3A4A54" stroke="#0B1218" strokeWidth="0.6" />
      <polygon points="80,28 84,18 86,28" fill="#3A4A54" stroke="#0B1218" strokeWidth="0.6" />
      {/* nostrils */}
      <ellipse cx="74" cy="82" rx="1.6" ry="2.6" fill="#0B0B0B" />
      <ellipse cx="86" cy="82" rx="1.6" ry="2.6" fill="#0B0B0B" />
      {/* GLOWING eyes */}
      <ellipse cx="68" cy="60" rx="6" ry="7" fill="#FF8833" opacity="0.4" />
      <ellipse cx="92" cy="60" rx="6" ry="7" fill="#FF8833" opacity="0.4" />
      <ellipse cx="68" cy="60" rx="4" ry="5" fill="#FFB060" />
      <ellipse cx="92" cy="60" rx="4" ry="5" fill="#FFB060" />
      <rect x="67" y="56" width="1.8" height="8" fill="#1A0F05" rx="0.9" />
      <rect x="91" y="56" width="1.8" height="8" fill="#1A0F05" rx="0.9" />
      {/* brow ridges */}
      <path d="M58 50 L72 46" stroke="#0B1218" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M102 50 L88 46" stroke="#0B1218" strokeWidth="2.4" strokeLinecap="round" />
      {/* open fierce mouth with teeth */}
      <path d="M66 86 Q80 104 94 86 L92 90 Q80 100 68 90 Z" fill="#2A0808" stroke="#0B1218" strokeWidth="1.2" strokeLinecap="round" />
      <polygon points="70,87 72,95 74,87" fill="#F5F0E0" />
      <polygon points="76,87 78,97 80,87" fill="#F5F0E0" />
      <polygon points="80,87 82,97 84,87" fill="#F5F0E0" />
      <polygon points="86,87 88,95 90,87" fill="#F5F0E0" />
      {/* jaw scales */}
      <path d="M60 66 L56 76 L60 82" stroke="#0B1218" strokeWidth="1" fill="none" />
      <path d="M100 66 L104 76 L100 82" stroke="#0B1218" strokeWidth="1" fill="none" />
    </svg>
  );
}

/* ── DOG — base + stage accessories ───────────────────── */
function DogStages({ stage, size }: { stage: Stage; size: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      <path d="M128 102 Q150 88 142 70" stroke="#C78B45" strokeWidth="10" strokeLinecap="round" fill="none" />
      <ellipse cx="80" cy="108" rx="44" ry="30" fill="#E09A4F" />
      <ellipse cx="80" cy="118" rx="26" ry="14" fill="#F3C07D" />
      <rect x="54" y="124" width="12" height="18" rx="5" fill="#C78B45" />
      <rect x="94" y="124" width="12" height="18" rx="5" fill="#C78B45" />
      <circle cx="80" cy="68" r="34" fill="#E9B273" />
      {/* ears: floppy (baby/teen) vs pricked (adult/legendary) */}
      {stage === 'baby' || stage === 'teen' ? (
        <>
          <path d="M52 46 L40 82 L66 70 Z" fill="#8B5E3C" />
          <path d="M108 46 L120 82 L94 70 Z" fill="#8B5E3C" />
        </>
      ) : (
        <>
          <path d="M52 50 L44 22 L68 54 Z" fill="#8B5E3C" />
          <path d="M108 50 L116 22 L92 54 Z" fill="#8B5E3C" />
        </>
      )}
      <ellipse cx="80" cy="80" rx="18" ry="14" fill="#F6D7A7" />
      <circle cx="68" cy="62" r="3.6" fill="#2D2D2D" />
      <circle cx="92" cy="62" r="3.6" fill="#2D2D2D" />
      <circle cx="69" cy="61" r="1" fill="#fff" />
      <circle cx="93" cy="61" r="1" fill="#fff" />
      <ellipse cx="80" cy="76" rx="4.5" ry="3" fill="#2D2D2D" />
      <path d="M73 84 Q80 90 87 84" stroke="#2D2D2D" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M78 87 Q80 93 82 87" stroke="#EF7A85" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* teen: small bandana */}
      {stage === 'teen' && (
        <>
          <path d="M56 96 Q80 104 104 96 L100 106 L60 106 Z" fill="#CC3A3A" />
          <polygon points="104,96 114,92 108,104" fill="#A02525" />
        </>
      )}
      {/* adult: collar with medallion */}
      {stage === 'adult' && (
        <>
          <rect x="52" y="94" width="56" height="6" rx="3" fill="#8B3A2E" />
          <circle cx="80" cy="104" r="6" fill="#E6B646" stroke="#8B6A1A" strokeWidth="1" />
          <text x="80" y="108" fontSize="8" textAnchor="middle" fill="#8B6A1A" fontWeight="700">★</text>
        </>
      )}
      {/* legendary: royal cape + crown */}
      {stage === 'legendary' && (
        <>
          <path d="M44 96 Q80 142 116 96 L120 120 Q80 150 40 120 Z" fill="#6B2A72" stroke="#3F1546" strokeWidth="1.2" />
          <rect x="52" y="94" width="56" height="6" rx="3" fill="#C8A050" />
          <circle cx="80" cy="104" r="7" fill="#F2D06B" stroke="#8B6A1A" strokeWidth="1.2" />
          <polygon points="60,38 66,28 70,36 74,26 78,36 82,26 86,36 90,28 96,38" fill="#F2D06B" stroke="#8B6A1A" strokeWidth="1" />
          <circle cx="70" cy="30" r="1.6" fill="#E24848" />
          <circle cx="80" cy="28" r="1.8" fill="#4A8CE2" />
          <circle cx="90" cy="30" r="1.6" fill="#E24848" />
        </>
      )}
    </svg>
  );
}

/* ── CAT — base + stage accessories ───────────────────── */
function CatStages({ stage, size }: { stage: Stage; size: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      <path d="M122 110 Q146 110 142 82" stroke="#B1A38F" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* adult/legendary: add tail ribbon */}
      {(stage === 'adult' || stage === 'legendary') && (
        <g transform="translate(142 82)">
          <path d="M-4 -4 L0 0 L4 -4 L4 4 L-4 4 Z" fill="#E05585" />
          <circle cx="0" cy="0" r="2" fill="#F2A4BC" />
        </g>
      )}
      <ellipse cx="80" cy="110" rx="40" ry="28" fill="#B1A38F" />
      <ellipse cx="80" cy="118" rx="22" ry="12" fill="#D7CCB8" />
      <rect x="56" y="126" width="10" height="16" rx="4" fill="#8C8068" />
      <rect x="94" y="126" width="10" height="16" rx="4" fill="#8C8068" />
      <circle cx="80" cy="66" r="32" fill="#B1A38F" />
      <polygon points="50,40 56,70 74,52" fill="#8C8068" />
      <polygon points="110,40 104,70 86,52" fill="#8C8068" />
      <polygon points="54,46 58,64 70,54" fill="#F5BEC8" />
      <polygon points="106,46 102,64 90,54" fill="#F5BEC8" />
      <ellipse cx="68" cy="64" rx="4" ry="5" fill="#3F6B3B" />
      <ellipse cx="92" cy="64" rx="4" ry="5" fill="#3F6B3B" />
      <rect x="66.5" y="61" width="1.2" height="6" fill="#1E1E1E" rx="0.6" />
      <rect x="90.5" y="61" width="1.2" height="6" fill="#1E1E1E" rx="0.6" />
      <circle cx="69" cy="62" r="0.9" fill="#fff" />
      <circle cx="93" cy="62" r="0.9" fill="#fff" />
      <polygon points="77,74 83,74 80,78" fill="#D48A94" />
      <path d="M80 78 Q76 84 72 82" stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M80 78 Q84 84 88 82" stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* whiskers longer for advanced stages */}
      {stage === 'baby' || stage === 'teen' ? (
        <>
          <line x1="40" y1="74" x2="62" y2="74" stroke="#6A5F4C" strokeWidth="1" />
          <line x1="42" y1="80" x2="62" y2="77" stroke="#6A5F4C" strokeWidth="1" />
          <line x1="120" y1="74" x2="98" y2="74" stroke="#6A5F4C" strokeWidth="1" />
          <line x1="118" y1="80" x2="98" y2="77" stroke="#6A5F4C" strokeWidth="1" />
        </>
      ) : (
        <>
          <line x1="30" y1="72" x2="62" y2="74" stroke="#6A5F4C" strokeWidth="1.2" />
          <line x1="30" y1="78" x2="62" y2="77" stroke="#6A5F4C" strokeWidth="1.2" />
          <line x1="30" y1="84" x2="62" y2="80" stroke="#6A5F4C" strokeWidth="1" />
          <line x1="130" y1="72" x2="98" y2="74" stroke="#6A5F4C" strokeWidth="1.2" />
          <line x1="130" y1="78" x2="98" y2="77" stroke="#6A5F4C" strokeWidth="1.2" />
          <line x1="130" y1="84" x2="98" y2="80" stroke="#6A5F4C" strokeWidth="1" />
        </>
      )}
      {/* teen: small bow on head */}
      {stage === 'teen' && (
        <g transform="translate(80 40)">
          <path d="M-8 0 L0 -4 L8 0 L8 6 L0 4 L-8 6 Z" fill="#E05585" />
          <circle cx="0" cy="1" r="2" fill="#F2A4BC" />
        </g>
      )}
      {/* adult: scarf */}
      {stage === 'adult' && (
        <path d="M56 94 Q80 102 104 94 L100 106 L60 106 Z" fill="#6A5FDA" />
      )}
      {/* legendary: crown + star sparkles */}
      {stage === 'legendary' && (
        <>
          <polygon points="60,40 66,30 70,38 74,28 78,38 82,28 86,38 90,30 96,40" fill="#F2D06B" stroke="#8B6A1A" strokeWidth="1" />
          <circle cx="70" cy="32" r="1.6" fill="#9D5BE0" />
          <circle cx="80" cy="30" r="1.8" fill="#E05585" />
          <circle cx="90" cy="32" r="1.6" fill="#9D5BE0" />
          <g fill="#F2D06B" opacity="0.9">
            <polygon points="30,50 33,46 36,50 33,54" />
            <polygon points="130,60 133,56 136,60 133,64" />
            <polygon points="38,100 41,96 44,100 41,104" />
          </g>
        </>
      )}
    </svg>
  );
}

/* ── PENGUIN — base + stage accessories ───────────────── */
function PenguinStages({ stage, size }: { stage: Stage; size: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      <ellipse cx="64" cy="140" rx="10" ry="5" fill="#F2A341" />
      <ellipse cx="96" cy="140" rx="10" ry="5" fill="#F2A341" />
      <ellipse cx="80" cy="96" rx="40" ry="46" fill="#2F4A66" />
      <ellipse cx="80" cy="104" rx="26" ry="34" fill="#F4F6F8" />
      <path d="M42 90 Q32 110 48 132 Q52 120 54 100 Z" fill="#1E3247" />
      <path d="M118 90 Q128 110 112 132 Q108 120 106 100 Z" fill="#1E3247" />
      <ellipse cx="80" cy="62" rx="28" ry="26" fill="#2F4A66" />
      <circle cx="64" cy="72" r="4" fill="#F5B8B8" opacity="0.7" />
      <circle cx="96" cy="72" r="4" fill="#F5B8B8" opacity="0.7" />
      <circle cx="70" cy="58" r="5" fill="#fff" />
      <circle cx="90" cy="58" r="5" fill="#fff" />
      <circle cx="71" cy="59" r="2.6" fill="#1A1A1A" />
      <circle cx="91" cy="59" r="2.6" fill="#1A1A1A" />
      <circle cx="72" cy="58" r="0.9" fill="#fff" />
      <circle cx="92" cy="58" r="0.9" fill="#fff" />
      <polygon points="72,68 88,68 80,78" fill="#F2A341" />
      <line x1="72" y1="72" x2="88" y2="72" stroke="#D08123" strokeWidth="1" />
      {/* teen: small scarf */}
      {stage === 'teen' && (
        <path d="M60 88 Q80 94 100 88 L96 98 L64 98 Z" fill="#E24848" />
      )}
      {/* adult: bow tie */}
      {stage === 'adult' && (
        <g transform="translate(80 92)">
          <path d="M-10 -4 L0 0 L-10 4 Z" fill="#1A1A1A" />
          <path d="M10 -4 L0 0 L10 4 Z" fill="#1A1A1A" />
          <circle cx="0" cy="0" r="2" fill="#2D2D2D" />
        </g>
      )}
      {/* legendary: crown + cape + scepter */}
      {stage === 'legendary' && (
        <>
          <path d="M36 90 Q80 150 124 90 L126 128 Q80 146 34 128 Z" fill="#8B1E2E" stroke="#5A0F1C" strokeWidth="1.2" />
          <polygon points="62,36 68,26 72,34 76,24 80,34 84,24 88,34 92,26 98,36" fill="#F2D06B" stroke="#8B6A1A" strokeWidth="1" />
          <circle cx="72" cy="28" r="1.8" fill="#4A8CE2" />
          <circle cx="80" cy="26" r="2" fill="#E24848" />
          <circle cx="88" cy="28" r="1.8" fill="#4A8CE2" />
          <g transform="translate(120 104)">
            <rect x="-1" y="-20" width="2" height="40" fill="#C8A050" />
            <circle cx="0" cy="-24" r="5" fill="#F2D06B" stroke="#8B6A1A" strokeWidth="1" />
            <text x="0" y="-21" fontSize="6" textAnchor="middle" fill="#8B6A1A" fontWeight="700">★</text>
          </g>
        </>
      )}
    </svg>
  );
}

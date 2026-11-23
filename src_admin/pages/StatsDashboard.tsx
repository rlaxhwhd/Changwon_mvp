import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StudentType } from '../../src_v2/data/careerProcess'
import StatsFilterBar from '../components/StatsFilterBar'
import { getActiveUser } from '../data/staff'
import { typeColorVar } from '../data/studentRoster'
import {
  defaultStatsFilters, STATS_AREAS, useStatsOverview,
  type CounselStats, type DiagnosisStats, type JobStats, type ProgramStats, type RoadmapStats,
  type StatsArea, type StatsFilters, type StatsOverview, type StatsScope,
} from '../data/statsOverview'
import {
  bucketTable, ChartCard, ColumnChart, FunnelBars, Heatmap, LineChart, MeterList, monthTable,
  RankedBars, SegmentedBar, seriesColor, StackedBars, StatTile,
} from '../components/charts/StatsCharts'

// ─────────────────────────────────────────────────────────────────────────
// 통계 현황 — 한 페이지에 「내 통계 / 전체 통계」 토글(2026-11-23 사용자 확정).
// 메뉴의 개인통계(/stats/personal)·전체통계(/stats/overall)는 같은 화면의 범위 프리셋이다.
// 집계는 /stats/overview 가 한다. 화면은 필터 → 영역 탭 → KPI 타일 → 차트만 그린다.
// ─────────────────────────────────────────────────────────────────────────

const SCOPE_PATH: Record<StatsScope, string> = { mine: '/stats/personal', all: '/stats/overall' }
const DOW = ['월', '화', '수', '목', '금', '토', '일']
const pctText = (v: number) => `${v}%`

/** 상태·유형처럼 값 자체가 색을 갖는 범례 — 필터로 항목이 줄어도 색이 바뀌지 않는다. */
const STATUS_COLOR: Record<string, string> = {
  REQ: 'var(--orange)', CONFIRMED: 'var(--blue)', DONE: 'var(--green)', CANCELLED: 'var(--red)',
  DRAFT: 'var(--orange)', REVIEW: 'var(--blue)',
  RECOMMENDATION: 'var(--purple)', GENERAL: 'var(--teal)',
  OFFLINE: 'var(--teal)', ONLINE: 'var(--purple)',
  CAREER: 'var(--blue)', EMPLOY: 'var(--green)',
}
const colorByKey = (key: string, index: number) => STATUS_COLOR[key] ?? seriesColor(index)
const typeColor = (key: string) => key === 'NONE' ? 'var(--text-cap)' : typeColorVar(key as StudentType)

export default function StatsDashboard({ scope }: { scope: StatsScope }) {
  const me = getActiveUser()
  const navigate = useNavigate()
  const [area, setArea] = useState<StatsArea>('counsel')
  const [filters, setFilters] = useState<StatsFilters>(defaultStatsFilters)
  const { data, error, loading, refresh } = useStatsOverview(area, scope, filters, me.id)

  const set = (patch: Partial<StatsFilters>) => setFilters(f => ({ ...f, ...patch }))
  const areaLabel = (a: StatsArea) => a === 'counsel' && me.role === 'psych' ? '심리상담' : STATS_AREAS.find(x => x.value === a)!.label

  return (
    <div className="admin-page sd-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">통계 현황</h1>
          <p className="admin-page-desc">
            {scope === 'mine' ? '내가 상담했거나 담당 학과인 학생' : '접근 가능한 전체 학생'} 기준
            {data && <> · 모집단 <strong>{data.population.toLocaleString()}</strong>명 · {data.refDate} 조회</>}
          </p>
        </div>
        <div className="admin-range-toggle" role="tablist" aria-label="통계 범위">
          {(['mine', 'all'] as StatsScope[]).map(s => (
            <button key={s} type="button" role="tab" aria-selected={scope === s} className={`admin-range-btn${scope === s ? ' active' : ''}`}
              onClick={() => navigate(SCOPE_PATH[s])}>{s === 'mine' ? '내 통계' : '전체 통계'}</button>))}
        </div>
      </header>

      <StatsFilterBar filters={filters} onChange={set} onReset={() => setFilters(defaultStatsFilters())} />

      {error && <p role="alert" className="sd-error">{data ? '최신 조회에 실패해 이전 결과를 표시합니다.' : '통계를 조회하지 못했습니다.'} {error}
        <button type="button" className="admin-btn" onClick={refresh}>다시 조회</button></p>}

      {data && <Pipeline data={data} />}

      <nav className="admin-tabs sd-area-tabs" role="tablist" aria-label="통계 영역">
        {STATS_AREAS.map(a => <button key={a.value} type="button" role="tab" aria-selected={area === a.value}
          className={`admin-tab${area === a.value ? ' active' : ''}`} onClick={() => setArea(a.value)}>{areaLabel(a.value)}</button>)}
      </nav>

      {!data && !error && <p role="status" className="sd-empty">통계를 불러오는 중입니다.</p>}
      {data && (
        <div className={`sd-body${loading ? ' is-loading' : ''}`} aria-busy={loading}>
          {data.area === 'diagnosis' && <DiagnosisArea d={data.data as DiagnosisStats} population={data.population} />}
          {data.area === 'counsel' && <CounselArea d={data.data as CounselStats} role={data.role} />}
          {data.area === 'roadmap' && <RoadmapArea d={data.data as RoadmapStats} />}
          {data.area === 'program' && <ProgramArea d={data.data as ProgramStats} />}
          {data.area === 'job' && <JobArea d={data.data as JobStats} />}
        </div>)}
    </div>
  )
}

/** 누적 파이프라인 — 기간 필터와 무관한 현재 상태. 단계마다 모집단 대비 비율. */
function Pipeline({ data }: { data: StatsOverview }) {
  const { students, stages } = data.pipeline
  return (
    <section className="sd-pipeline" aria-label="진행 단계 현황">
      <div className="sd-pipeline-hero">
        <span>모집단</span>
        <strong>{students.toLocaleString()}<em>명</em></strong>
        <small>누적 현황 · 기간 필터 미적용</small>
      </div>
      <ol className="sd-steps">
        {stages.map((s, i) => { const ratio = students ? Math.round((s.count / students) * 100) : 0; return (
          <li key={s.key} className="sd-step" style={{ '--i': i } as CSSProperties}>
            <span className="sd-step-label">{s.label}</span>
            <strong className="sd-step-value">{s.count.toLocaleString()}<em>명</em></strong>
            <span className="sd-step-track"><i style={{ width: `${ratio}%` }} /></span>
            <small>{ratio}%</small>
          </li>) })}
      </ol>
    </section>
  )
}

function Tiles({ children }: { children: ReactNode }) { return <div className="sd-tiles">{children}</div> }
function Grid({ children }: { children: ReactNode }) { return <div className="sd-grid">{children}</div> }

function DiagnosisArea({ d, population }: { d: DiagnosisStats; population: number }) {
  const k = d.kpis
  return (
    <>
      <Tiles>
        <StatTile label="진단 완료" value={k.attempts} unit="건" />
        <StatTile label="응시 학생" value={k.students} unit="명" />
        <StatTile label="C-CORE 완료" value={k.coreStudents} unit="명" detail={`모집단 ${population.toLocaleString()}명의 ${pctText(k.participationRate)}`} />
        <StatTile label="후속진단(C-1~6)" value={k.followups} unit="건" />
        <StatTile label="C-5 취약요인 응시" value={k.c5Students} unit="명" />
      </Tiles>
      <Grid>
        <ChartCard wide title="월별 진단 완료" caption="C-CORE 핵심진단과 유형별 후속진단" table={monthTable(d.byMonth, ['C-CORE', '후속진단'])}>
          <ColumnChart isMonths categories={d.byMonth.months} series={[
            { key: 'core', label: 'C-CORE', values: d.byMonth.series[0].values },
            { key: 'followup', label: '후속진단', values: d.byMonth.series[1].values }]} />
        </ChartCard>
        <ChartCard title="유형 분포" caption="진단을 완료한 학생의 현재 유형" table={bucketTable(d.byType, ['유형', '학생'])}>
          <SegmentedBar items={d.byType} colorOf={typeColor} />
        </ChartCard>
        <ChartCard title="검사별 완료 건수" table={bucketTable(d.byTest, ['검사', '건수'])}>
          <RankedBars items={d.byTest} />
        </ChartCard>
        <ChartCard title="학년별 응시 학생" table={bucketTable(d.byGrade, ['학년', '학생'])}>
          <ColumnChart categories={d.byGrade.map(b => b.label)} series={[{ key: 'students', label: '학생', values: d.byGrade.map(b => b.count), color: 'var(--teal)' }]} />
        </ChartCard>
      </Grid>
    </>
  )
}

function CounselArea({ d, role }: { d: CounselStats; role: 'career' | 'psych' }) {
  const k = d.kpis
  return (
    <>
      <Tiles>
        <StatTile label="상담 신청" value={k.requested} unit="건" detail={`학생 ${k.students.toLocaleString()}명`} />
        <StatTile label="상담 완료" value={k.done} unit="건" detail={`완료율 ${pctText(k.completionRate)}`} />
        <StatTile label="대기 · 확정" value={`${k.waiting} · ${k.confirmed}`} unit="건" />
        <StatTile label="취소" value={k.cancelled} unit="건" detail={`취소율 ${pctText(k.cancelRate)}`} />
        <StatTile label="신청→상담 평균" value={k.avgLeadDays} unit="일" />
        <StatTile label="상담일지 작성률" value={pctText(k.recordedRate)} detail="완료 건 중 기록지 작성" />
      </Tiles>
      <Grid>
        <ChartCard wide title="월별 상담 신청 · 완료 · 취소" table={monthTable(d.byMonth, ['신청', '완료', '취소'])}>
          <ColumnChart isMonths categories={d.byMonth.months} series={[
            { key: 'requested', label: '신청', values: d.byMonth.series[0].values, color: 'var(--blue)' },
            { key: 'done', label: '완료', values: d.byMonth.series[1].values, color: 'var(--green)' },
            { key: 'cancelled', label: '취소', values: d.byMonth.series[2].values, color: 'var(--red)' }]} />
        </ChartCard>
        <ChartCard title="상태 분포" table={bucketTable(d.byStatus, ['상태', '건수'])}>
          <SegmentedBar items={d.byStatus} colorOf={colorByKey} />
        </ChartCard>
        <ChartCard title="상담 방식" table={bucketTable(d.byMethod, ['방식', '건수'])}>
          <SegmentedBar items={d.byMethod} colorOf={colorByKey} />
        </ChartCard>
        <ChartCard wide title="요일 · 시간대별 상담" caption="확정·완료된 상담의 예약 시각"
          table={{ head: ['요일', '시간', '건수'], rows: d.heatmap.map(c => [DOW[c.dow - 1], `${c.hour}시`, c.count]) }}>
          <Heatmap cells={d.heatmap} />
        </ChartCard>
        <ChartCard title="상담 주제 TOP 8" table={bucketTable(d.byTopic, ['주제', '건수'])}>
          <RankedBars items={d.byTopic} color="var(--purple)" />
        </ChartCard>
        <ChartCard title="학과별 상담 TOP 8" table={bucketTable(d.byDept, ['학과', '건수'])}>
          <RankedBars items={d.byDept} color="var(--teal)" />
        </ChartCard>
        {role === 'career' && (
          <ChartCard title="상담 종류" caption="진로취업 상담과 교수 상담" table={bucketTable(d.byKind, ['종류', '건수'])}>
            <RankedBars items={d.byKind} color="var(--orange)" />
          </ChartCard>)}
      </Grid>
    </>
  )
}

function RoadmapArea({ d }: { d: RoadmapStats }) {
  const k = d.kpis
  return (
    <>
      <Tiles>
        <StatTile label="생성된 로드맵" value={k.total} unit="개" />
        <StatTile label="확정" value={k.confirmed} unit="개" detail={`확정률 ${pctText(k.confirmRate)}`} />
        <StatTile label="평균 이행률" value={pctText(k.avgProgress)} />
        <StatTile label="완료 칸 / 전체 칸" value={`${k.itemsDone.toLocaleString()} / ${k.itemsTotal.toLocaleString()}`} />
        <StatTile label="변경 요청" value={k.requests} unit="건" detail={`대기 ${k.requestsPending}건`} />
      </Tiles>
      <Grid>
        <ChartCard wide title="월별 로드맵 생성 · 확정" table={monthTable(d.byMonth, ['생성', '확정'])}>
          <LineChart months={d.byMonth.months} series={[
            { key: 'created', label: '생성', values: d.byMonth.series[0].values, color: 'var(--blue)' },
            { key: 'confirmed', label: '확정', values: d.byMonth.series[1].values, color: 'var(--green)' }]} />
        </ChartCard>
        <ChartCard title="상태 분포" table={bucketTable(d.byStatus, ['상태', '개수'])}>
          <SegmentedBar items={d.byStatus} colorOf={colorByKey} />
        </ChartCard>
        <ChartCard title="이행률 분포" caption="로드맵별 완료 칸 비율 구간" table={bucketTable(d.progressBins, ['이행률', '로드맵'])}>
          <ColumnChart categories={d.progressBins.map(b => b.label)} series={[{ key: 'count', label: '로드맵', values: d.progressBins.map(b => b.count), color: 'var(--green)' }]} />
        </ChartCard>
        <ChartCard title="축별 칸 완료 현황" caption="IAP 실행 · 핵심역량 수행 · 내 성장 활동"
          table={{ head: ['축', '완료', '미완료'], rows: d.byAxis.map(a => [a.label, a.done, a.open]) }}>
          <StackedBars rows={d.byAxis.map(a => ({ label: a.label, values: [a.done, a.open] }))}
            series={[{ label: '완료', color: 'var(--green)' }, { label: '미완료', color: 'var(--border)' }]} />
        </ChartCard>
      </Grid>
    </>
  )
}

function ProgramArea({ d }: { d: ProgramStats }) {
  const k = d.kpis
  return (
    <>
      <Tiles>
        <StatTile label="비교과 신청" value={k.applied} unit="건" detail={`학생 ${k.students.toLocaleString()}명 · 프로그램 ${k.programs}개`} />
        <StatTile label="선발" value={k.selected} unit="건" />
        <StatTile label="수료" value={k.completed} unit="건" detail={`선발 대비 ${pctText(k.completionRate)}`} />
        <StatTile label="노쇼" value={k.noShow} unit="건" />
        <StatTile label="미참여 벌점" value={k.penalty} unit="점" />
      </Tiles>
      <Grid>
        <ChartCard wide title="월별 비교과 신청 · 수료" table={monthTable(d.byMonth, ['신청', '수료'])}>
          <LineChart months={d.byMonth.months} series={[
            { key: 'applied', label: '신청', values: d.byMonth.series[0].values, color: 'var(--blue)' },
            { key: 'completed', label: '수료', values: d.byMonth.series[1].values, color: 'var(--green)' }]} />
        </ChartCard>
        <ChartCard title="신청 → 수료 퍼널" caption="전 단계 대비 전환율" table={bucketTable(d.funnel, ['단계', '건수'])}>
          <FunnelBars steps={d.funnel} />
        </ChartCard>
        <ChartCard title="분류별 신청" caption="대분류 비중 · 중분류 순위"
          table={{ head: ['분류', '건수'], rows: [...d.byCategory, ...d.byMiddle].map(b => [b.label, b.count]) }}>
          <SegmentedBar items={d.byCategory} colorOf={colorByKey} />
          <div className="sd-sub"><RankedBars items={d.byMiddle} color="var(--purple)" /></div>
        </ChartCard>
        <ChartCard title="학년별 신청" table={bucketTable(d.byGrade, ['학년', '건수'])}>
          <ColumnChart categories={d.byGrade.map(b => b.label)} series={[{ key: 'applied', label: '신청', values: d.byGrade.map(b => b.count), color: 'var(--orange)' }]} />
        </ChartCard>
        <ChartCard title="신청 많은 프로그램" caption="신청 / 모집 정원"
          table={{ head: ['프로그램', '신청', '정원', '선발', '수료'], rows: d.topPrograms.map(p => [p.title, p.applied, p.capacity, p.selected, p.completed]) }}>
          <MeterList rows={d.topPrograms.map(p => ({ label: p.title, value: p.applied, limit: p.capacity, detail: `선발 ${p.selected} · 수료 ${p.completed}` }))} />
        </ChartCard>
      </Grid>
    </>
  )
}

function JobArea({ d }: { d: JobStats }) {
  const k = d.kpis
  return (
    <>
      <Tiles>
        <StatTile label="게시된 공고" value={k.postings} unit="건" detail={`추천채용 ${k.recommended}건`} />
        <StatTile label="지원" value={k.applications} unit="건" detail={`학생 ${k.applicants.toLocaleString()}명`} />
        <StatTile label="전형 진행 중" value={k.open} unit="건" />
        <StatTile label="최종합격" value={k.passed} unit="건" detail={`합격률 ${pctText(k.passRate)}`} />
        <StatTile label="공고 조회" value={k.views} unit="회" detail={`학생 ${k.viewers.toLocaleString()}명`} />
      </Tiles>
      <Grid>
        <ChartCard title="월별 지원" table={monthTable(d.applicationsByMonth, ['지원'])}>
          <LineChart months={d.applicationsByMonth.months} series={[{ key: 'applications', label: '지원', values: d.applicationsByMonth.series[0].values, color: 'var(--blue)' }]} />
        </ChartCard>
        <ChartCard title="월별 공고 조회" caption="학생·공고·날짜당 1회" table={monthTable(d.viewsByMonth, ['조회'])}>
          <LineChart months={d.viewsByMonth.months} series={[{ key: 'views', label: '조회', values: d.viewsByMonth.series[0].values, color: 'var(--teal)' }]} />
        </ChartCard>
        <ChartCard title="공고 유형" caption="게시 공고 비중 · 지원 건 비중"
          table={{ head: ['유형', '공고', '지원'], rows: d.postingsByType.map(b => [b.label, b.count, d.applicationsByType.find(a => a.key === b.key)?.count ?? 0]) }}>
          <SegmentedBar items={d.postingsByType} colorOf={colorByKey} />
          <div className="sd-sub"><span className="sd-sub-title">지원 건</span><SegmentedBar items={d.applicationsByType} colorOf={colorByKey} /></div>
        </ChartCard>
        <ChartCard title="지원 상태" table={bucketTable(d.applicationsByStatus, ['상태', '건수'])}>
          <RankedBars items={d.applicationsByStatus} color="var(--blue)" />
        </ChartCard>
        <ChartCard title="기업 구분별 공고" table={bucketTable(d.byCompanyType, ['기업 구분', '공고'])}>
          <RankedBars items={d.byCompanyType} color="var(--orange)" />
        </ChartCard>
        <ChartCard title="조회 많은 공고" caption="조회 수 기준 · 표에서 지원 수 확인"
          table={{ head: ['회사', '직무', '조회', '지원'], rows: d.topPostings.map(p => [p.company, p.role, p.views, p.applications]) }}>
          <RankedBars items={d.topPostings.map(p => ({ key: p.id, label: `${p.company} · ${p.role}`, count: p.views }))} color="var(--teal)" unit="회" />
        </ChartCard>
      </Grid>
    </>
  )
}

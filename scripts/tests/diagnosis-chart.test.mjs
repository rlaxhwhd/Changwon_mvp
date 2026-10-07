import test from 'node:test'
import assert from 'node:assert/strict'
import { getDiagnosisChartAxes, getDiagnosisChartSections } from '../../src_v2/data/diagnosisChart.ts'

const codes = ['career_clarity', 'career_motivation', 'competency_readiness',
  'employability_readiness', 'job_fit', 'org_fit', 'info_search',
  'personal_branding', 'interview', 'job_strategy']
const makeResult = () => ({
  testId: 'ccore', source: 'hrtest',
  factors: codes.map((code, i) => ({ factorCode: `HRTEST_SCALES_${code}`, name: code, tScore: i * 10 })),
})

test('Core matches pairs by stable provider code even when reordered; preserves raw scores', () => {
  const result = makeResult()
  result.factors.reverse()
  const before = structuredClone(result)
  assert.deepEqual(getDiagnosisChartAxes(result, []).map(a => a.value), [5, 25, 45, 65, 85])
  assert.deepEqual(result, before)
})

test('a missing member never creates a zero or a one-member average', () => {
  const result = makeResult()
  result.factors[0].tScore = null
  result.factors.splice(3, 1)
  const axes = getDiagnosisChartAxes(result, [])
  assert.equal(axes.length, 5)
  assert.deepEqual(axes.map(a => a.value), [null, null, 45, 65, 85])
})

test('zero is a valid score and non-finite values remain missing', () => {
  const result = makeResult()
  result.factors[1].tScore = 0
  result.factors[2].tScore = NaN
  assert.deepEqual(getDiagnosisChartAxes(result, []).map(a => a.value), [0, null, 45, 65, 85])
})

for (const [testId, count] of [['c4', 7]]) {
  test(`${testId} keeps each of ${count} factors as a separate axis, including missing values`, () => {
    const rows = Array.from({ length: count }, (_, i) => ({ name: `factor ${i}`, tScore: i === 1 ? null : 25.125 + i }))
    assert.deepEqual(getDiagnosisChartAxes({ testId }, rows), rows.map(r => ({ labels: [r.name], value: r.tScore })))
  })
}

const deftCodes = ['career_clarity', 'career_motivation', 'campus_networking', 'offline_networking', 'online_networking', 'industry_networking', 'analytical_thinking', 'creative_thinking', 'execution', 'relational_flexibility', 'collaboration', 'job_fit', 'org_fit']
test('C3 averages all subscales in D/E/F1/F2/T order and excludes provider area rows', () => {
  const result = { testId: 'c3', factors: deftCodes.map((code, i) => ({ factorCode: `HRTEST_SCALES_${code}`, tScore: i * 10 })) }
  result.factors.push({ factorCode: 'HRTEST_AREAS_D', tScore: 999 })
  result.factors.reverse()
  const before = structuredClone(result)
  assert.deepEqual(getDiagnosisChartAxes(result, []).map(a => a.value), [5, 35, 70, 95, 115])
  assert.deepEqual(result, before)
  result.factors.find(f => f.factorCode === 'HRTEST_SCALES_online_networking').tScore = null
  assert.equal(getDiagnosisChartAxes(result, [])[1].value, null)
  result.factors = result.factors.filter(f => f.factorCode !== 'HRTEST_SCALES_execution')
  assert.equal(getDiagnosisChartAxes(result, [])[2].value, null)
})

test('C2 splits the three types into 3/3/4 axes and preserves all other scores in a table', () => {
  const codes = ['learning_experience', 'learning_reflection', 'learning_abstraction', 'goal_mastery', 'goal_performance', 'goal_avoidance', 'decision_rational', 'decision_intuitive', 'decision_creative', 'decision_social', 'explore_expansion']
  const rows = codes.map((code, i) => ({ factorCode: `HRTEST_SCALES_${code}`, name: code, tScore: i === 1 ? null : 40 + i, level: '보통' })).reverse()
  const result = { testId: 'c2', source: 'hrtest', providerTypes: { learning_type: '경험 지향형' } }
  const sections = getDiagnosisChartSections(result, rows)
  assert.deepEqual(sections.map(s => s.axes.length), [3, 3, 4, 0])
  assert.equal(sections[0].type, '경험 지향형')
  assert.deepEqual(sections[0].axes.map(a => a.value), [40, null, 42])
  assert.equal(sections.flatMap(s => s.rows).length, rows.length)
  assert.equal(sections.at(-1).rows[0].name, 'explore_expansion')
})

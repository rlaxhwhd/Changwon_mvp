import test from 'node:test'
import assert from 'node:assert/strict'
import { getDiagnosisChartAxes } from '../../src_v2/data/diagnosisChart.ts'

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

for (const [testId, count] of [['c2', 4], ['c3', 5], ['c4', 7]]) {
  test(`${testId} keeps each of ${count} factors as a separate axis, including missing values`, () => {
    const rows = Array.from({ length: count }, (_, i) => ({ name: `factor ${i}`, tScore: i === 1 ? null : 25.125 + i }))
    assert.deepEqual(getDiagnosisChartAxes({ testId }, rows), rows.map(r => ({ labels: [r.name], value: r.tScore })))
  })
}

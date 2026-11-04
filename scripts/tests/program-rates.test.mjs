import test from 'node:test'
import assert from 'node:assert/strict'
import { programRates } from '../../src_admin/data/programRates.ts'

const list = (...codes) => codes.map(outcomeStatus => ({ outcomeStatus }))

test('참여율은 (수료+미수료)/선발, 이수율은 수료/(수료+미수료)다', () => {
  const rates = programRates(list('COMPLETED', 'COMPLETED', 'COMPLETED', 'NOT_COMPLETED', undefined))
  assert.deepEqual(rates, { selected: 5, participants: 4, completed: 3, participationRate: 80, completionRate: 75 })
})

test('참석은 수료 못 한 참여자라 미수료와 같이 참여인원에 들어간다', () => {
  const rates = programRates(list('COMPLETED', 'NOT_COMPLETED', 'ATTENDED', 'ATTENDED'))
  assert.deepEqual(rates, { selected: 4, participants: 4, completed: 1, participationRate: 100, completionRate: 25 })
})

test('불참·결과 미입력은 분모의 선발인원에만 들어간다', () => {
  const rates = programRates(list('COMPLETED', 'ATTENDED', 'ABSENT', null))
  assert.equal(rates.participationRate, 50)
  assert.equal(rates.completionRate, 50)
})

test('소수 첫째 자리까지 반올림한다', () => {
  const rates = programRates(list('COMPLETED', 'COMPLETED', 'NOT_COMPLETED'))
  assert.equal(rates.participationRate, 100)
  assert.equal(rates.completionRate, 66.7)
})

test('분모가 0이면 0%다', () => {
  assert.deepEqual(programRates([]), { selected: 0, participants: 0, completed: 0, participationRate: 0, completionRate: 0 })
  assert.equal(programRates(list(undefined, 'ABSENT')).completionRate, 0)
})

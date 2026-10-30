import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const exports = {}
const source = readFileSync(new URL('../../src_v2/data/careerProcess.ts', import.meta.url), 'utf8')
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
const ids = modules => Array.from(modules, m => m.testId)

test('type change retains historical C3 once while requiring only core and C4', () => {
  assert.deepEqual(ids(exports.getVisibleDiagnosisModules('T4', ['ccore', 'c3', 'c3', 'c4'])), ['ccore', 'c4', 'c3'])
  assert.deepEqual(ids(exports.getRequiredTests('T4')), ['ccore', 'c4'])
})

test('no current type preserves history without showing unattempted tests', () => {
  assert.deepEqual(ids(exports.getVisibleDiagnosisModules(null, ['c2', 'unknown'])), ['ccore', 'c2'])
  assert.deepEqual(ids(exports.getVisibleDiagnosisModules(null, [])), ['ccore'])
})

test('stale follow-up approval cannot unlock a historical test in the student pipeline', () => {
  const retakes = { sample: { diagnosticType: 'T6', permissions: { ccore: false, c3: false, c6: true },
    requests: [{ testId: 'c3', status: 'APPROVED' }] } }
  const pipeline = {}
  const pipelineSource = readFileSync(new URL('../../src_v2/data/pipeline.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(pipelineSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: pipeline,
    require: path => path === './careerProcess' ? exports
      : path === '../../shared/diagnosisStore' ? { diagnosisRetakes: retakes, diagnosisAttempts: [
        { studentId: 'sample', testId: 'ccore', status: '완료' }, { studentId: 'sample', testId: 'c3', status: '완료' },
      ] } : {},
  })
  const student = { id: 'sample', studentType: 'T4' }
  assert.equal(pipeline.getStudentType(student), 'T6')
  assert.equal(pipeline.isTestDone('sample', 'c3'), true)
  assert.equal(pipeline.getModuleStatusFor(student, exports.getModuleByTestId('c3')), 'done')
  assert.equal(pipeline.getModuleStatusFor(student, exports.getModuleByTestId('c6')), 'available')
  assert.equal(pipeline.getModuleStatusFor(student, exports.getModuleByTestId('c2')), 'locked')
})

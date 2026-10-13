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

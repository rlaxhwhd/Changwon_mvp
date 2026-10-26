import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the real orchestration with store/API boundaries replaced, without a DB.
function moduleUnderTest(file, overrides = {}) {
  const calls = []
  const values = new Map()
  const storage = new Map()
  const exports = {}
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const context = {
    exports, console, Promise, Map, Set, Error,
    location: { pathname: '/v2/program', replace: value => calls.push(['redirect', value]) },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    window: { addEventListener() {} },
    require(specifier) {
      return new Proxy({}, { get(_, name) {
        const key = `${specifier}:${String(name)}`
        if (key in overrides) return overrides[key]
        if (['DIAGNOSIS_MODULES', 'factorDefinitions', 'codeItems', 'counselorProfiles'].includes(name)) {
          if (!values.has(key)) values.set(key, [])
          return values.get(key)
        }
        if (name === 'getActiveStudentId') return () => 'student-test'
        if (name === 'api') return async path => {
          calls.push(['api', path])
          assert.equal(path, '/auth/student/me', 'student boot must not fetch development identities')
          return { id: 'student-test' }
        }
        return (...args) => { calls.push([name, ...args]); return Promise.resolve() }
      } })
    },
  }
  vm.runInNewContext(code, context, { filename: file })
  return { exports, calls, storage, context }
}

// Read the actual route declarations so these tests cover wiring as well as loaders.
const app = ts.createSourceFile('App.tsx', readFileSync(new URL('../../src_v2/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const routes = new Map()
function visit(node) {
  if (ts.isObjectLiteralExpression(node)) {
    const props = new Map(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(app), p.initializer]))
    const path = props.get('path'), loader = props.get('loader')
    if (path && ts.isStringLiteral(path)) {
      routes.set(path.text, loader && ts.isCallExpression(loader) ? loader.arguments.map(arg => arg.text) : [])
    }
  }
  ts.forEachChild(node, visit)
}
visit(app)

test('student boot authenticates and loads only common menu/gate dependencies', async () => {
  const { exports, calls, storage } = moduleUnderTest('shared/bootstrap.ts')
  await exports.initializeData()
  assert.deepEqual(calls[0], ['api', '/auth/student/me'])
  assert.equal(storage.get('dc_active_student'), 'student-test')
  assert.deepEqual(calls.filter(c => c[0].startsWith('load')).map(c => c[0]).sort(), [
    'loadProfiles', 'loadMetadata', 'loadStudentDiagnoses', 'loadCounselRequests', 'loadRoadmap', 'loadNotificationSummary',
  ].sort())
})

test('unauthenticated boot redirects before any feature fetch', async () => {
  const error = Object.assign(new Error('unauthorized'), { status: 401 })
  const { exports, calls } = moduleUnderTest('shared/bootstrap.ts', { './api:api': async () => { throw error } })
  await assert.rejects(exports.initializeData(), /unauthorized/)
  assert.deepEqual(calls, [['redirect', '/login']])
})

test('admin bootstrap loads only data every staff page reads', async () => {
  const staff = { id: 'staff-test', role: 'career', departments: [] }
  const { exports, calls, storage, context } = moduleUnderTest('shared/bootstrap.ts', {
    './api:api': async path => { assert.equal(path, '/development/identities'); return { students: [], staff: [staff] } },
  })
  context.location.pathname = '/admin/diagnosis/manage'
  storage.set('dc_active_staff', staff.id)
  await exports.initializeData()
  for (const name of ['loadProfiles', 'loadCounselRequests', 'loadCounselRecords', 'loadMetadata', 'loadCounselorProfiles', 'loadNotificationSummary']) {
    assert.ok(calls.some(c => c[0] === name), name)
  }
  // 화면 전용 자료는 라우트 로더(src_admin/data/staffPageData.ts)가 받는다(2026-10-26).
  for (const name of ['loadPrograms', 'loadPostings', 'loadApplications', 'loadRoadmapRequests', 'loadSchedule', 'loadGroups',
    'loadStudentRoster', 'loadCounselEvents', 'loadDepartments', 'loadNotices', 'loadProfessorGroups', 'loadStudentDiagnoses']) {
    assert.ok(!calls.some(c => c[0] === name), name)
  }
})

test('staff route loader respects role and capability before calling guarded lists', async () => {
  let role = 'career'
  let canManage = true
  const { exports, calls } = moduleUnderTest('src_admin/data/staffPageData.ts', {
    './staff:getActiveUser': () => ({ id: 'staff-test', role, departments: [] }),
    '../../shared/jobStore:jobCapability': () => ({ canManageApplicants: canManage }),
  })
  await exports.staffPageLoader(['career'], 'jobs', 'applications')()
  assert.ok(calls.some(c => c[0] === 'loadPostings'))
  assert.deepEqual(calls.find(c => c[0] === 'loadApplications'), ['loadApplications', 'managed'])
  calls.length = 0
  canManage = false
  await exports.staffPageLoader(['career'], 'applications')()
  assert.ok(calls.some(c => c[0] === 'loadCapability') && !calls.some(c => c[0] === 'loadApplications'))
  calls.length = 0
  role = 'psych'
  await exports.staffPageLoader(['career'], 'jobs', 'applications')()
  assert.deepEqual(calls, [], 'the role guard redirects; the loader must not fetch first')
})

test('program list route loads programs and wishlist, never jobs, resumes or slots', async () => {
  const { exports, calls } = moduleUnderTest('shared/studentPageData.ts')
  await exports.studentPageLoader(...routes.get('/program'))()
  assert.deepEqual(calls.map(c => c[0]).sort(), ['loadPrograms', 'loadWishlist'])
  assert.deepEqual(routes.get('/program'), ['programs', 'programWishlist'])
})

test('direct program detail loads wishlist/department dependencies without full catalog', () => {
  assert.deepEqual(routes.get('/program/:id'), ['departments', 'programWishlist'])
})

test('navigating from programs to jobs then back loads each page and refreshes revisits', async () => {
  const { exports, calls } = moduleUnderTest('shared/studentPageData.ts')
  for (const path of ['/program', '/jobs', '/program']) {
    await exports.studentPageLoader(...routes.get(path))()
  }
  assert.equal(calls.filter(c => c[0] === 'loadPrograms').length, 2)
  assert.equal(calls.filter(c => c[0] === 'loadPostings').length, 1)
  assert.equal(calls.filter(c => c[0] === 'loadResumes').length, 0)
})

test('overlapping navigations share an in-flight store request', async () => {
  let finish, count = 0
  const { exports } = moduleUnderTest('shared/studentPageData.ts', {
    './programStore:loadPrograms': () => { count++; return new Promise(resolve => { finish = resolve }) },
  })
  const a = exports.studentPageLoader('programs', 'programs')()
  const b = exports.studentPageLoader('programs')()
  await Promise.resolve()
  assert.equal(count, 1)
  finish()
  await Promise.all([a, b])
})

test('failed page load rejects and can retry instead of caching an empty result', async () => {
  let count = 0
  const { exports } = moduleUnderTest('shared/studentPageData.ts', {
    './programStore:loadPrograms': async () => { if (++count === 1) throw new Error('offline') },
  })
  const load = exports.studentPageLoader('programs')
  await assert.rejects(load(), /offline/)
  await load()
  assert.equal(count, 2)
})

test('specialized routes retain their synchronous selector dependencies', () => {
  assert.deepEqual(routes.get('/lounge'), ['programs', 'growth'])
  assert.deepEqual(routes.get('/star'), ['growth'])
  assert.deepEqual(routes.get('/counsel/career'), ['counselors', 'slots'])
  assert.deepEqual(routes.get('/counsel/professor'), ['professors', 'slots'])
  assert.deepEqual(routes.get('/counsel/record'), ['counselRecords', 'counselors', 'professors'])
  assert.deepEqual(routes.get('/jobs/home'), ['resumes'])
  assert.deepEqual(routes.get('/jobs/:id'), ['jobs', 'jobWishlist', 'jobCapability', 'applications'])
  assert.deepEqual(routes.get('/mypage/applications'), ['jobs', 'applications'])
  assert.deepEqual(routes.get('/jobs/notices'), ['notices'])
  for (const path of ['/diagnosis/employment', '/growth/mission', '/records', '/program/status']) assert.deepEqual(routes.get(path), [])
})

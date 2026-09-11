// Print the initial migration. Later operational edits belong to the admin API.
import { STUDENT_TYPES, COUNSEL_TOPICS, DIAGNOSIS_MODULES } from '../../src_v2/data/careerProcess.ts'
const quote = x => `'${String(x).replaceAll("'", "''")}'`
const groups = [
  ['STUDENT_TYPE','학생 유형','OPERATIONAL',true],
  ['COUNSEL_TOPIC','상담 주제','OPERATIONAL',false],
  ['DIAGNOSIS_TEST','진단 검사','OPERATIONAL',true],
  ['COUNSEL_STATUS','상담 상태','STRUCTURAL',true],
  ['COUNSEL_TYPE','상담 구분','STRUCTURAL',true],
]
const rows = [
  ...STUDENT_TYPES.map(x => ['STUDENT_TYPE',x.code,x.label,{}]),
  ...COUNSEL_TOPICS.map(x => ['COUNSEL_TOPIC',x.code,x.label,{type:x.type,goal:x.goal}]),
  ...DIAGNOSIS_MODULES.map(x => ['DIAGNOSIS_TEST',x.id,x.name,{}]),
  ...Object.entries({REQ:'대기',CONFIRMED:'확정',DONE:'완료',CANCEL_UNKNOWN:'취소',CANCEL_STU:'취소',CANCEL_CNS:'취소'}).map(([c,l]) => ['COUNSEL_STATUS',c,l,{}]),
  ...Object.entries({CAREER:'진로상담',JOB:'취업상담',PSY:'심리',PROF:'교수'}).map(([c,l]) => ['COUNSEL_TYPE',c,l,{}]),
]
console.log('-- Generated once from careerProcess.ts; operational changes must not regenerate applied migrations.')
for (const [c,l,m,f] of groups) console.log(`INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes) VALUES (${quote(c)},${quote(l)},${quote(m)},${f});`)
rows.forEach(([g,c,l,p],i) => console.log(`INSERT INTO dc.code_item(group_code,code,label,sort_order,payload) VALUES (${quote(g)},${quote(c)},${quote(l)},${i},${quote(JSON.stringify(p))});`))

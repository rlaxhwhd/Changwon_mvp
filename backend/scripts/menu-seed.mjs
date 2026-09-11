import ts from 'typescript'
import { readFileSync } from 'node:fs'
const source=readFileSync(new URL('../../src_admin/components/navConfig.ts',import.meta.url),'utf8')
const output=ts.transpileModule(source+'\nexport { ALL_SECTIONS };',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
const exports={}
new Function('require','exports',output)(() => new Proxy({}, {get:()=>()=>null}),exports)
const q=x=>`'${String(x).replaceAll("'","''")}'`
const roles=['career','psych','professor','assistant','admin']
for (const role of roles.filter(x=>x!=='admin')) console.log(`INSERT INTO dc.auth_role(role_code,label) VALUES(${q(role)},${q(role)});`)
const roleKey=x=>x==='admin'?'AUTH0006':x
const seen=new Set(['system'])
function add(code,parent,label,path,access,index) {
 if(seen.has(code)) return
 seen.add(code)
 console.log(`INSERT INTO dc.menu(menu_code,parent_code,portal,label,route,sort_order) VALUES(${q(code)},${parent?q(parent):'NULL'},'admin',${q(label)},${q(path)},${index});`)
 for(const role of access) console.log(`INSERT INTO dc.menu_auth VALUES(${q(code)},${q(roleKey(role))});`)
}
for(const [i,section] of exports.ALL_SECTIONS.entries()) {
 const access=section.roles??roles
 add(section.id,null,section.label,section.path??section.children[0]?.path??'/',access,i)
 function walk(children,parent,allowed) {
  children.forEach((child,j)=>{const childRoles=(child.roles??allowed).filter(x=>allowed.includes(x));const key=parent+'.'+j;add(key,parent,child.label,child.path,childRoles,j);walk(child.children??[],key,childRoles)})
 }
 walk(section.children,section.id,access)
}

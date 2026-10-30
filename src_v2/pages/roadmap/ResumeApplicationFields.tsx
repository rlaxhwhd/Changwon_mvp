import { useState } from 'react'

// Deepresume /coverletter/info에서 확인한 외부 서비스 선택지(2026-10-30).
// 내부 직종 코드와는 다른 계약이므로 임의로 코드 카탈로그에 대응시키지 않는다.
const OCCUPATIONS = ['경영·사무·금융', '영업·고객상담', '무역·유통', '마케팅·광고·홍보', '서비스', 'IT·전기·전자·통신', '생산·제조·정비', '연구개발·설계', '토목·건설', '디자인', '의료', '미디어·예술·스포츠', '교육', '전문·특수직', '공공·사회봉사']
const INDUSTRIES = ['서비스업', '금융업', '유통업', 'IT·전기·전자', '제조업', '건설업', '교육업', '의료·제약업', '미디어·광고·홍보', '문화·예술·디자인업', '공공기관·협회']
const COMPANY_TYPES = ['대기업', '중견기업', '중소기업', '공기업', '외국계', '금융권', '스타트업']

export interface ResumeApplication {
  occupation: string
  industry: string
  companyType: string
  position: string
  company: string
  experience: string
  keywords: string[]
}

function ChoiceField({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (value: string) => void
}) {
  return <fieldset className="rs-application-choice">
    <legend>{label}</legend>
    <div className="rs-choice-list">
      {options.map(option => <label key={option} className={value === option ? 'selected' : ''}>
        <input type="radio" name={`resume-${label}`} value={option} checked={value === option}
          onChange={() => onChange(option)} />
        <span>{option}</span>
      </label>)}
    </div>
  </fieldset>
}

export default function ResumeApplicationFields({ value, onChange }: {
  value: ResumeApplication; onChange: (value: ResumeApplication) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [keywordError, setKeywordError] = useState('')
  const update = (field: keyof ResumeApplication, next: string | string[]) => onChange({ ...value, [field]: next })
  const addKeyword = () => {
    const next = keyword.trim()
    if (!next) { setKeywordError('추가할 키워드를 입력해 주세요.'); return }
    if (value.keywords.includes(next)) { setKeywordError('이미 추가한 키워드입니다.'); return }
    update('keywords', [...value.keywords, next])
    setKeyword(''); setKeywordError('')
  }

  return <section className="rs-application" aria-labelledby="rs-application-heading">
    <div className="rs-application-heading">
      <h2 id="rs-application-heading">지원 정보</h2>
      <p>자기소개서를 작성할 기업과 직무를 선택해 주세요.</p>
    </div>
    <ChoiceField label="직종" options={OCCUPATIONS} value={value.occupation} onChange={next => update('occupation', next)} />
    <ChoiceField label="업종" options={INDUSTRIES} value={value.industry} onChange={next => update('industry', next)} />
    <ChoiceField label="기업형태" options={COMPANY_TYPES} value={value.companyType} onChange={next => update('companyType', next)} />
    <div className="rs-application-grid">
      <label className="rs-application-text">지원 직무
        <input value={value.position} onChange={e => update('position', e.target.value)} placeholder="예: IT기획 및 운영" />
      </label>
      <label className="rs-application-text">기업명
        <input value={value.company} onChange={e => update('company', e.target.value)} placeholder="예: 롯데캐피탈" />
      </label>
      <ChoiceField label="경력" options={['경력', '신입']} value={value.experience} onChange={next => update('experience', next)} />
      <div className="rs-keyword-field">
        <label htmlFor="rs-keyword">핵심키워드</label>
        <div className="rs-keyword-input">
          <input id="rs-keyword" value={keyword} placeholder="예: 문제해결, 소통"
            aria-describedby="rs-keyword-hint" aria-invalid={!!keywordError}
            onChange={e => { setKeyword(e.target.value); setKeywordError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addKeyword() } }} />
          <button type="button" onClick={addKeyword}>추가</button>
        </div>
        <p id="rs-keyword-hint" className="rs-application-hint">나를 표현하는 핵심 역량을 하나씩 추가해 주세요.</p>
        {keywordError && <p className="rs-keyword-error" role="alert">{keywordError}</p>}
        <ul className="rs-keyword-list" aria-label="추가한 핵심키워드">
          {value.keywords.map(item => <li key={item}>
            {item}<button type="button" aria-label={`${item} 키워드 삭제`}
              onClick={() => update('keywords', value.keywords.filter(existing => existing !== item))}>×</button>
          </li>)}
        </ul>
      </div>
    </div>
  </section>
}

export type PageId =
  | 'landing'
  | 'home'
  | 'strategy-intro'
  | 'strategy-support'
  | 'strategy-center'
  | 'strategy-plus'
  | 'strategy-location'
  | 'strategy-work'
  | 'dashboard'
  | 'ai-roadmap'
  | 'ai-prediction'
  | 'ai-jobs'
  | 'ai-resume'
  | 'ai-evaluation'
  | 'program-apply'
  | 'career-manage'
  | 'program-review'
  | 'psych-test'
  | 'nine-core'
  | 'cares'
  | 'aptitude'
  | 'mbti'
  | 'counsel-career'
  | 'counsel-employ'
  | 'counsel-psych'
  | 'counsel-prof'
  | 'company-info'
  | 'notice'
  | 'mypage'
  // v2 진단센터
  | 'career-diagnosis'
  | 'personality-diagnosis'
  // v2 채용정보
  | 'job-posting'
  | 'worknet-jobs'
  | 'youth-policy'
  // v2 마이페이지 하위
  | 'my-home'
  | 'my-portfolio'
  | 'my-programs'
  | 'my-counsel-status'
  | 'my-mileage';

export interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'success';
}

import { LuUser } from 'react-icons/lu'

/** 이미지가 없는 교직원 프로필에서도 GNB와 같은 사람 아이콘을 표시한다. */
export default function AdminAvatar({ size = 'xl' }: { size?: 'sm' | 'lg' | 'xl' }) {
  return <span className={`admin-student-avatar ${size}`} aria-hidden="true"><LuUser /></span>
}

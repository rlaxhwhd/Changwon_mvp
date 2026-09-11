import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeData } from '../shared/bootstrap'
import './index.css'

const root = createRoot(document.getElementById('root')!)
// 적재가 끝날 때까지 아무것도 렌더하지 않는다. createRoot 는 첫 render 가 커밋될 때까지
// 컨테이너를 비우지 않으므로, HTML 셸의 대기면(#boot-splash)이 그대로 남아 있다가
// 앱으로 한 번에 교체된다. 예전처럼 여기서 텍스트를 렌더하면 화면이 한 번 넘어갔다 온다.
initializeData()
  .then(() => import('./App'))
  .then(({ default: App }) => root.render(<StrictMode><App /></StrictMode>))
  .catch((error: unknown) => root.render(
    <div role="alert">
      <p>{error instanceof Error ? error.message : '서버에 연결할 수 없습니다.'}</p>
      <button onClick={() => location.reload()}>다시 연결</button>
    </div>,
  ))

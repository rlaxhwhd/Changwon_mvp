import { useEffect, useReducer } from 'react'
import { loadMetadata, METADATA_EVENT } from './metadataStore'

export function useMetadata() {
  const [,refresh] = useReducer(x => x + 1,0)
  useEffect(() => {
    const update = () => refresh()
    const poll = () => { void loadMetadata().catch(() => { /* Keep last successful labels; retry on focus. */ }) }
    window.addEventListener(METADATA_EVENT,update)
    window.addEventListener('focus',poll)
    const timer = window.setInterval(poll,30000)
    return () => { window.removeEventListener(METADATA_EVENT,update); window.removeEventListener('focus',poll); clearInterval(timer) }
  },[])
}

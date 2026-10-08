import Modal from '../src_v2/components/Modal'

export default function AiProgressModal({ open, title, progress }: { open: boolean; title: string; progress: string }) {
  return <Modal open={open} onClose={() => undefined} title={title} size="sm" hideClose>
    <div role="status" aria-live="polite"><span className="dc-ai-spinner" aria-hidden="true" /> {progress || title}</div>
    <p>작성이 완료되고 저장될 때까지 잠시 기다려 주세요.</p>
  </Modal>
}

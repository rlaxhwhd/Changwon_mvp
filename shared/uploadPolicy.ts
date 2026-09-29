export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif'
export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.hwp,.hwpx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg'
const scripts = /\.(?:js|mjs|cjs|jsx|ts|tsx|html?|xhtml|svg|php\d*|phtml|asp|aspx|jsp|py|sh|bash|ps1|bat|cmd|exe|dll|com|scr|vbs|vbe|wsf|hta|jar)(?:\.|$)/i

/** UX only: the backend checks actual bytes and archive contents independently. */
export function validateUpload(file: File, accept: string): void {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (scripts.test(file.name) || !accept.split(',').includes(ext)) {
    throw new Error('스크립트·실행 파일은 올릴 수 없습니다. 허용된 문서 또는 이미지 파일을 선택해 주세요.')
  }
  if (!file.size || file.size > 10 * 1024 * 1024) {
    throw new Error('파일은 0바이트보다 크고 10MB 이하여야 합니다.')
  }
}

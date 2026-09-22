/** Fixed groups: 1–5, 6–10, ...; never allocate all page numbers. */
export function pageNumbers(page: number, totalPages: number): number[] {
  const total = Math.max(1, Math.floor(totalPages))
  const current = Math.max(1, Math.min(page, total))
  const start = Math.floor((current - 1) / 5) * 5 + 1
  return Array.from({ length: Math.min(5, total - start + 1) }, (_, i) => start + i)
}

import DOMPurify from 'dompurify'

const styleProperties = ['color', 'background-color', 'font-size', 'font-family', 'font-weight',
  'font-style', 'text-align', 'text-decoration', 'line-height', 'width', 'max-width', 'height',
  'border', 'border-collapse', 'padding', 'margin-left']
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'src' && /^data:/i.test(data.attrValue)
    && !/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(data.attrValue)) {
    data.keepAttr = false
  }
  if (data.attrName === 'style') {
    const style = document.createElement('span').style
    style.cssText = data.attrValue
    data.attrValue = styleProperties.flatMap(name => {
      const value = style.getPropertyValue(name)
      return value && !/url\s*\(|expression|var\s*\(|\\/i.test(value) ? [`${name}:${value}`] : []
    }).join(';')
  }
})

/** All rich text, including old database content and editor paste, crosses this boundary. */
export function safeHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'div', 'span', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'a', 'img', 'font', 'sub', 'sup'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan',
      'color', 'size', 'face', 'align', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ['svg', 'math', 'iframe', 'object', 'embed', 'script', 'style', 'form'],
  })
}

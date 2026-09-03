import type { AttachmentKind } from './contracts'

/**
 * Which icon a chip shows. Extension first, because a browser's reported MIME
 * type for a .docx is unreliable and for a .csv is a coin toss.
 */
export function attachmentKindOf(name: string, type: string): AttachmentKind {
  if (type.startsWith('image/')) return 'image'
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'doc' || ext === 'docx' || ext === 'rtf') return 'doc'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'sheet'
  if (ext === 'ppt' || ext === 'pptx') return 'slide'
  if (ext === 'txt' || ext === 'md') return 'text'
  return 'file'
}

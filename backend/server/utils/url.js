export function driveEmbedUrl(input) {
  if (!input) return ''
  const fileMatch = input.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  const queryMatch = input.match(/[?&]id=([^&]+)/)
  const id = fileMatch?.[1] || queryMatch?.[1]
  return id ? `https://drive.google.com/file/d/${id}/preview` : input
}

export function isValidWebUrl(input) {
  if (!input) return true
  try {
    return ['http:', 'https:'].includes(new URL(input).protocol)
  } catch {
    return false
  }
}

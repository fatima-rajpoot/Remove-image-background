const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function fetchModelStatus() {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) {
    throw new Error('Backend is not running')
  }
  return res.json()
}

export async function removeBackgroundApi(file) {
  const body = new FormData()
  body.append('file', file, file.name)

  const res = await fetch(`${API_BASE}/api/remove`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    let detail = 'Background removal failed'
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
    }
    throw new Error(detail)
  }

  return res.blob()
}

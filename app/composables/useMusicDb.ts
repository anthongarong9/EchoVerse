export interface Track {
  id: number | string
  owner: string
  name: string
  path: string
  size: number
  created_at: string
  url: string
}

const BUCKET = 'songs'

function cfg() {
  const config = useRuntimeConfig()
  return {
    base: String(config.public.supabaseUrl || '').replace(/\/$/, ''),
    key: String(config.public.supabaseKey || ''),
  }
}

export function isStorageConfigured() {
  const { base, key } = cfg()
  return Boolean(base && key)
}

function publicUrl(path: string) {
  return `${cfg().base}/storage/v1/object/public/${BUCKET}/${path}`
}

// Get all songs of one user, newest first
export async function getTracks(owner: string): Promise<Track[]> {
  const { base, key } = cfg()
  const res = await fetch(
    `${base}/rest/v1/songs?owner=eq.${encodeURIComponent(owner)}&order=created_at.desc&select=*`,
    { headers: { apikey: key } }
  )
  if (!res.ok) throw new Error('Could not load songs')
  const rows = await res.json()
  return rows.map((row: any) => ({ ...row, url: publicUrl(row.path) }))
}

// Upload the file, then save its details in the table
export async function saveTrack(file: File, owner: string): Promise<void> {
  const { base, key } = cfg()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${owner}/${Date.now()}-${safeName}`

  const upload = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': file.type || 'audio/mpeg',
      'x-upsert': 'false',
    },
    body: file,
  })
  if (!upload.ok) throw new Error('Upload failed')

  const insert = await fetch(`${base}/rest/v1/songs`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ owner, name: file.name, path, size: file.size }),
  })
  if (!insert.ok) {
    // Undo the upload so no unused file stays in storage
    await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'DELETE',
      headers: { apikey: key },
    })
    throw new Error('Could not save song details')
  }
}

// Delete the file and its row
export async function removeTrack(track: Track): Promise<void> {
  const { base, key } = cfg()

  const file = await fetch(`${base}/storage/v1/object/${BUCKET}/${track.path}`, {
    method: 'DELETE',
    headers: { apikey: key },
  })
  if (!file.ok) throw new Error('Could not delete the file')

  const row = await fetch(`${base}/rest/v1/songs?id=eq.${track.id}`, {
    method: 'DELETE',
    headers: { apikey: key },
  })
  if (!row.ok) throw new Error('Could not delete the song details')
}
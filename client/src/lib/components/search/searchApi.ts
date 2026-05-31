export type SearchResult = {
  type: 'iiif_manifest' | 'toponym'
  id: number
  label: string
  layer_label: string
  sublayer_label: string
  manifest: string | null
  lon: number | null
  lat: number | null
}

export async function searchAtlas(query: string): Promise<SearchResult[]> {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) return []

  const response = await fetch(
    `http://localhost:3000/api/search?q=${encodeURIComponent(trimmedQuery)}`
  )

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

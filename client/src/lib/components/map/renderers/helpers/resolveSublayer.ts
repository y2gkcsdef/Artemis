import type { ResolvedSublayer } from './types'

export async function resolveSublayer(id: number): Promise<ResolvedSublayer> {
  const response = await fetch(`http://localhost:3000/api/sublayers/resolve/${id}`)

  if (!response.ok) {
    throw new Error(`Failed to resolve sublayer ${id}`)
  }

  return response.json()
}

import type maplibregl from 'maplibre-gl'
import type { Sublayer, SublayerType } from '$lib/stores/timeline'

export type ResolvedSublayer = {
  id: number
  type: SublayerType
  table: string
}

export type RenderContext = {
  map: maplibregl.Map
  sublayer: Sublayer
  resolved: ResolvedSublayer
}

export type SublayerRenderer = {
  render: (context: RenderContext) => void | Promise<void>
  remove: (context: RenderContext) => void | Promise<void>
}

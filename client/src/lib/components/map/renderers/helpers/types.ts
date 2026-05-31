import type maplibregl from 'maplibre-gl'
import type { Sublayer, SublayerType, TimelineSide } from '$lib/stores/timeline'

export type ResolvedSublayer = {
  id: number
  type: SublayerType
  table: string
}

export type RenderContext = {
  map: maplibregl.Map
  side: TimelineSide
  sublayer: Sublayer
  resolved: ResolvedSublayer
}

export type SublayerRenderer = {
  render: (context: RenderContext) => void | Promise<void>
  remove: (context: RenderContext) => void | Promise<void>
}

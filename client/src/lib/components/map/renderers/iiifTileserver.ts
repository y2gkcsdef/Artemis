import type { SublayerRenderer } from './types'

export const iiifTileserverRenderer: SublayerRenderer = {
  render({ sublayer, resolved }) {
    console.log('[map-renderer] render iiif tileserver', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type,
      table: resolved.table,
      source: sublayer.source
    })
  },

  remove({ sublayer, resolved }) {
    console.log('[map-renderer] remove iiif tileserver', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type,
      table: resolved.table
    })
  }
}

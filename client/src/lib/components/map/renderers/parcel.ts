import type { SublayerRenderer } from './types'

export const parcelRenderer: SublayerRenderer = {
  render({ sublayer, resolved }) {
    console.log('[map-renderer] render parcel', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type,
      table: resolved.table
    })
  },

  remove({ sublayer, resolved }) {
    console.log('[map-renderer] remove parcel', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type,
      table: resolved.table
    })
  }
}

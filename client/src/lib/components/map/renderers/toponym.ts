import type { SublayerRenderer } from './types'

export const toponymRenderer: SublayerRenderer = {
  render({ sublayer, resolved }) {
    console.log('[map-renderer] render toponym', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type,
      table: resolved.table
    })
  },

  remove({ sublayer, resolved }) {
    console.log('[map-renderer] remove toponym', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type,
      table: resolved.table
    })
  }
}

import {
  addGeojsonPolygonOverlay,
  fetchGeojsonData,
  removeGeojsonPolygonOverlay
} from './geojsonOverlay'
import type { SublayerRenderer } from './helpers/types'

const PARCEL_SOURCE_PREFIX = 'parcel'

export const parcelRenderer: SublayerRenderer = {
  async render({ map, sublayer }) {
    const data = await fetchGeojsonData('parcel', sublayer.id)

    addGeojsonPolygonOverlay({
      map,
      id: sublayer.id,
      data,
      style: {
        sourcePrefix: PARCEL_SOURCE_PREFIX,
        fillColor: '#c48a3f',
        fillOpacity: 0.18,
        lineColor: '#6f4a1f',
        lineOpacity: 0.72
      }
    })
  },

  remove({ map, sublayer }) {
    removeGeojsonPolygonOverlay({
      map,
      id: sublayer.id,
      sourcePrefix: PARCEL_SOURCE_PREFIX
    })
  }
}

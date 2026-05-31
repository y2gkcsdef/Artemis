import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { removeIiifMask, renderIiifMask } from './iiifMask'
import type { SublayerRenderer } from './helpers/types'

type IiifTileserverData = {
  id: number
  sublayer_id: number
  tileserver_url: string
}

const LOCAL_TILE_BOUNDS: [number, number, number, number] = [
  3.67767333984375,
  50.96361651868419,
  4.7186279296875,
  51.4830933498849
]
const LOCAL_TILE_MIN_ZOOM = 8
const LOCAL_TILE_MAX_ZOOM = 17

async function fetchIiifTileserverData(sublayerId: number): Promise<IiifTileserverData> {
  const response = await fetch(`http://localhost:3000/api/iiif-tileservers/${sublayerId}`)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch IIIF tileserver data for sublayer ${sublayerId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    )
  }

  return response.json()
}

function getSourceId(id: number) {
  return `iiif-tileserver-${id}`
}

function getLayerId(id: number) {
  return `iiif-tileserver-${id}-raster`
}

function tileserverUrlToXyzTemplate(tileserverUrl: string): string {
  if (tileserverUrl.includes('{z}') && tileserverUrl.includes('{x}') && tileserverUrl.includes('{y}')) {
    return tileserverUrl
  }

  const root = tileserverUrl.endsWith('/') ? tileserverUrl : `${tileserverUrl}/`
  return `${root}{z}/{x}/{y}.png`
}

function addRasterTiles({
  map,
  id,
  tileserverUrl
}: {
  map: maplibregl.Map
  id: number
  tileserverUrl: string
}) {
  const sourceId = getSourceId(id)
  const layerId = getLayerId(id)

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster',
      tiles: [tileserverUrlToXyzTemplate(tileserverUrl)],
      tileSize: 256,
      minzoom: LOCAL_TILE_MIN_ZOOM,
      maxzoom: LOCAL_TILE_MAX_ZOOM,
      bounds: LOCAL_TILE_BOUNDS
    } satisfies SourceSpecification)
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId
    } satisfies LayerSpecification)
  }
}

export const iiifTileserverRenderer: SublayerRenderer = {
  async render({ map, side, sublayer, resolved }) {
    const tileserver = await fetchIiifTileserverData(sublayer.id)

    if (!tileserver.tileserver_url) {
      console.warn('[map-renderer] iiif tileserver has no tileserver_url', {
        id: sublayer.id,
        label: sublayer.label,
        type: resolved.type,
        table: resolved.table
      })
      return
    }

    addRasterTiles({
      map,
      id: sublayer.id,
      tileserverUrl: tileserver.tileserver_url
    })

    await renderIiifMask({
      map,
      side,
      sublayerId: sublayer.id
    })
  },

  remove({ map, sublayer }) {
    const layerId = getLayerId(sublayer.id)
    const sourceId = getSourceId(sublayer.id)

    removeIiifMask({
      map,
      sublayerId: sublayer.id
    })

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId)
    }
  }
}

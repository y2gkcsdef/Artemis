import type { SublayerType } from '$lib/stores/timeline'
import { iiifTileserverRenderer } from './iiifTileserver'
import { parcelRenderer } from './parcel'
import { remoteServiceRenderer } from './remoteService'
import { toponymRenderer } from './toponym'
import type { SublayerRenderer } from './types'

export const sublayerRenderers: Record<SublayerType, SublayerRenderer> = {
  wmts: remoteServiceRenderer,
  wms: remoteServiceRenderer,
  wfs: remoteServiceRenderer,
  iiif_tileserver: iiifTileserverRenderer,
  parcel: parcelRenderer,
  toponym: toponymRenderer
}

const sublayerTypeTables = {
  wmts: 'remote_service',
  wms: 'remote_service',
  wfs: 'remote_service',
  iiif_tileserver: 'iiif_tileserver',
  parcel: 'parcel',
  toponym: 'toponym'
}

export function resolveSublayerType(type) {
  return sublayerTypeTables[type] ?? null
}

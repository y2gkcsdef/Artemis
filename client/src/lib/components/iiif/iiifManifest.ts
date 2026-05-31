export type IiifImageResource = {
  imageUrl: string
  width?: number
  height?: number
}

export type IiifMetadataItem = {
  label: string
  value: string
}

export type IiifManifestResource = IiifImageResource & {
  manifestType: string
  canvasCount: number
  canvasLabel?: string
  metadata: IiifMetadataItem[]
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null
}

function firstRecord(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    return value.find(isRecord) ?? null
  }

  return isRecord(value) ? value : null
}

function getString(record: JsonRecord, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function getNumber(record: JsonRecord, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

function stringifyLanguageValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value.map(stringifyLanguageValue).filter(Boolean).join(', ')
  }

  if (isRecord(value)) {
    const none = value.none

    if (Array.isArray(none)) {
      return none.map(stringifyLanguageValue).filter(Boolean).join(', ')
    }

    const firstValue = Object.values(value)[0]
    return stringifyLanguageValue(firstValue)
  }

  return undefined
}

function getLabel(record: JsonRecord): string | undefined {
  return stringifyLanguageValue(record.label)
}

function getArray(record: JsonRecord, key: string): unknown[] {
  const value = record[key]
  return Array.isArray(value) ? value : []
}

function parseMetadata(manifest: JsonRecord): IiifMetadataItem[] {
  return getArray(manifest, 'metadata')
    .filter(isRecord)
    .map(item => ({
      label: stringifyLanguageValue(item.label) ?? '',
      value: stringifyLanguageValue(item.value) ?? ''
    }))
    .filter(item => item.label || item.value)
}

function normalizeServiceUrl(serviceUrl: string): string {
  return serviceUrl.replace(/\/$/, '')
}

function imageUrlFromService(service: JsonRecord): string | null {
  const serviceId = getString(service, 'id') ?? getString(service, '@id')

  if (!serviceId) return null

  return `${normalizeServiceUrl(serviceId)}/full/max/0/default.jpg`
}

function imageFromBody(body: JsonRecord): IiifImageResource | null {
  const service = firstRecord(body.service)
  const serviceImageUrl = service ? imageUrlFromService(service) : null
  const directImageUrl = getString(body, 'id') ?? getString(body, '@id')
  const imageUrl = serviceImageUrl ?? directImageUrl

  if (!imageUrl) return null

  return {
    imageUrl,
    width: getNumber(body, 'width'),
    height: getNumber(body, 'height')
  }
}

function parseIiif3(manifest: JsonRecord): IiifImageResource | null {
  const canvas = firstRecord(manifest.items)
  const annotationPage = canvas ? firstRecord(canvas.items) : null
  const annotation = annotationPage ? firstRecord(annotationPage.items) : null
  const body = annotation ? firstRecord(annotation.body) : null

  return body ? imageFromBody(body) : null
}

function parseIiif2(manifest: JsonRecord): IiifImageResource | null {
  const sequence = firstRecord(manifest.sequences)
  const canvas = sequence ? firstRecord(sequence.canvases) : null
  const imageAnnotation = canvas ? firstRecord(canvas.images) : null
  const resource = imageAnnotation ? firstRecord(imageAnnotation.resource) : null

  return resource ? imageFromBody(resource) : null
}

function getManifestType(manifest: JsonRecord): string {
  const type = getString(manifest, 'type')

  if (type) return type === 'Manifest' ? 'IIIF Presentation 3' : type
  if (getString(manifest, '@type') === 'sc:Manifest') return 'IIIF Presentation 2'

  return 'IIIF Manifest'
}

function getCanvasCount(manifest: JsonRecord): number {
  const items = manifest.items
  const sequences = manifest.sequences
  const sequence = firstRecord(sequences)

  if (Array.isArray(items)) return items.length
  if (sequence && Array.isArray(sequence.canvases)) return sequence.canvases.length

  return 0
}

function getFirstCanvas(manifest: JsonRecord): JsonRecord | null {
  const canvas = firstRecord(manifest.items)
  const sequence = firstRecord(manifest.sequences)

  return canvas ?? (sequence ? firstRecord(sequence.canvases) : null)
}

export async function fetchIiifManifestResource(manifestUrl: string): Promise<IiifManifestResource> {
  const response = await fetch(manifestUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch IIIF manifest: ${response.status} ${response.statusText}`)
  }

  const manifest = await response.json() as unknown

  if (!isRecord(manifest)) {
    throw new Error('IIIF manifest response was not an object')
  }

  const imageResource = parseIiif3(manifest) ?? parseIiif2(manifest)

  if (!imageResource) {
    throw new Error('No displayable image resource found in IIIF manifest')
  }

  const canvas = getFirstCanvas(manifest)

  return {
    ...imageResource,
    manifestType: getManifestType(manifest),
    canvasCount: getCanvasCount(manifest),
    canvasLabel: canvas ? getLabel(canvas) : undefined,
    metadata: parseMetadata(manifest)
  }
}

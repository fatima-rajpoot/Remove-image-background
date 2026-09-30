import { useEffect, useMemo, useRef, useState } from 'react'
import { removeBackgroundApi } from '../api/remove'
import Button from '../component/button'
import ExportOptions from '../component/exportoptions'
import HeroMedia from '../component/heromedia'
import ImageQueue from '../component/imagequeue'
import Preview from '../component/preview'
import Upload from '../component/upload'

const SCALE = {
  original: 1,
  large: 0.75,
  medium: 0.5,
  small: 0.25,
}

const FIXED_SIZES = {
  square: { width: 1080, height: 1080 },
  hd: { width: 1920, height: 1080 },
}

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
}

let nextId = 1

function revoke(url) {
  if (url) URL.revokeObjectURL(url)
}

function revokeItem(item) {
  revoke(item.originalUrl)
  if (item.resultUrl && item.resultUrl !== item.originalUrl) {
    revoke(item.resultUrl)
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function measureImage(url) {
  const img = await loadImage(url)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

function outputSize(item, sizePreset, customW, customH) {
  if (FIXED_SIZES[sizePreset]) {
    return { ...FIXED_SIZES[sizePreset] }
  }

  if (sizePreset === 'custom') {
    const width = Math.max(1, Math.round(customW || item.naturalWidth || 1))
    const height = Math.max(1, Math.round(customH || item.naturalHeight || 1))
    return { width, height }
  }

  const scale = SCALE[sizePreset] ?? 1
  return {
    width: Math.max(1, Math.round((item.naturalWidth || 1) * scale)),
    height: Math.max(1, Math.round((item.naturalHeight || 1) * scale)),
  }
}

async function exportBlob(sourceUrl, width, height, format, fillColor) {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const needsFill = (Boolean(fillColor) || format === 'jpg') && format !== 'svg'
  if (needsFill) {
    ctx.fillStyle = fillColor || '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  ctx.drawImage(img, 0, 0, width, height)

  if (format === 'svg') {
    const pngDataUrl = canvas.toDataURL('image/png')
    const bgRect = fillColor
      ? `<rect width="${width}" height="${height}" fill="${fillColor}"/>`
      : ''
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bgRect}
  <image width="${width}" height="${height}" preserveAspectRatio="none" xlink:href="${pngDataUrl}" href="${pngDataUrl}"/>
</svg>`
    return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  }

  const mime = MIME[format] || MIME.png
  const quality = format === 'png' ? undefined : 0.92
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
  if (!blob) throw new Error('Export failed')
  return blob
}

function downloadExtension(format) {
  if (format === 'jpg') return 'jpg'
  if (format === 'svg') return 'svg'
  return format
}

function resolveBgFill(bgColor, customBgColor) {
  switch (bgColor) {
    case 'transparent':
      return null
    case 'white':
      return '#ffffff'
    case 'black':
      return '#111111'
    case 'blue':
      return '#2563eb'
    case 'sky':
      return '#7dd3fc'
    case 'red':
      return '#dc2626'
    case 'green':
      return '#16a34a'
    case 'gray':
      return '#9ca3af'
    case 'custom':
      return customBgColor || '#ffffff'
    default:
      return null
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function BgRemover() {
  const [items, setItems] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [backendError, setBackendError] = useState(null)

  const [format, setFormat] = useState('png')
  const [bgColor, setBgColor] = useState('transparent')
  const [customBgColor, setCustomBgColor] = useState('#2563eb')
  const [sizePreset, setSizePreset] = useState('original')
  const [lockAspect, setLockAspect] = useState(true)
  const [outWidth, setOutWidth] = useState(0)
  const [outHeight, setOutHeight] = useState(0)

  const active = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId],
  )

  const itemsRef = useRef(items)
  itemsRef.current = items

  const doneCount = items.filter((item) => item.status === 'done').length
  const pendingCount = items.filter((item) => item.status !== 'done').length

  useEffect(() => {
    return () => {
      itemsRef.current.forEach(revokeItem)
    }
  }, [])

  useEffect(() => {
    if (!active) {
      setOutWidth(0)
      setOutHeight(0)
      return
    }
    if (sizePreset === 'custom') return
    if (FIXED_SIZES[sizePreset]) {
      setOutWidth(FIXED_SIZES[sizePreset].width)
      setOutHeight(FIXED_SIZES[sizePreset].height)
      return
    }
    const scale = SCALE[sizePreset] ?? 1
    setOutWidth(Math.max(1, Math.round(active.naturalWidth * scale)))
    setOutHeight(Math.max(1, Math.round(active.naturalHeight * scale)))
  }, [active, sizePreset])

  async function addFiles(files) {
    const created = files.map((file) => {
      const id = String(nextId++)
      return {
        id,
        file,
        originalUrl: URL.createObjectURL(file),
        resultUrl: null,
        status: 'ready',
        naturalWidth: 0,
        naturalHeight: 0,
        error: null,
      }
    })

    setItems((prev) => [...prev, ...created])
    setActiveId((prev) => prev ?? created[0].id)

    const measured = await Promise.all(
      created.map(async (item) => {
        try {
          const size = await measureImage(item.originalUrl)
          return { ...item, naturalWidth: size.width, naturalHeight: size.height }
        } catch {
          return item
        }
      }),
    )

    setItems((prev) =>
      prev.map((item) => measured.find((m) => m.id === item.id) || item),
    )

    if (!activeId && created[0]) {
      setSizePreset('original')
      setFormat('png')
    }
  }

  function removeItem(id) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) revokeItem(target)
      const next = prev.filter((item) => item.id !== id)
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null)
      }
      return next
    })
  }

  function reset() {
    items.forEach(revokeItem)
    setItems([])
    setActiveId(null)
    setProcessing(false)
    setBatchProgress(null)
    setDownloading(false)
    setFormat('png')
    setSizePreset('original')
    setOutWidth(0)
    setOutHeight(0)
  }

  function applyPreset(preset) {
    setSizePreset(preset)
    if (!active) return

    if (FIXED_SIZES[preset]) {
      setOutWidth(FIXED_SIZES[preset].width)
      setOutHeight(FIXED_SIZES[preset].height)
      return
    }

    if (preset === 'custom') return

    const scale = SCALE[preset] ?? 1
    setOutWidth(Math.max(1, Math.round(active.naturalWidth * scale)))
    setOutHeight(Math.max(1, Math.round(active.naturalHeight * scale)))
  }

  function handleWidthChange(nextW) {
    const width = Math.max(0, Math.min(8000, nextW))
    setSizePreset('custom')
    setOutWidth(width)
    if (!lockAspect || !active?.naturalWidth) return
    const ratio = active.naturalHeight / active.naturalWidth
    setOutHeight(Math.max(1, Math.round(width * ratio)))
  }

  function handleHeightChange(nextH) {
    const height = Math.max(0, Math.min(8000, nextH))
    setSizePreset('custom')
    setOutHeight(height)
    if (!lockAspect || !active?.naturalHeight) return
    const ratio = active.naturalWidth / active.naturalHeight
    setOutWidth(Math.max(1, Math.round(height * ratio)))
  }

  async function removeBackgrounds() {
    if (!items.length || processing) return

    const targets = items.filter((item) => item.status !== 'done')
    const queue = (targets.length ? targets : items).map((item) => item.id)

    if (!targets.length) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.resultUrl && item.resultUrl !== item.originalUrl) {
            revoke(item.resultUrl)
          }
          return { ...item, status: 'ready', resultUrl: null, error: null }
        }),
      )
    }

    setProcessing(true)
    setBackendError(null)

    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]
      const current = itemsRef.current.find((item) => item.id === id)
      if (!current) continue

      setActiveId(id)
      setBatchProgress({ current: i + 1, total: queue.length })
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'processing', resultUrl: null, error: null }
            : item,
        ),
      )

      try {
        const blob = await removeBackgroundApi(current.file)
        const resultUrl = URL.createObjectURL(blob)
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: 'done', resultUrl, error: null }
              : item,
          ),
        )
        setBackendError(null)
      } catch (err) {
        const message = err?.message || 'Removal failed'
        setBackendError(message)
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: 'error', resultUrl: null, error: message }
              : item,
          ),
        )
      }
    }

    setBatchProgress(null)
    setProcessing(false)
  }

  async function downloadActive() {
    if (!active?.resultUrl || downloading) return
    setDownloading(true)
    try {
      const { width, height } = outputSize(
        active,
        sizePreset,
        outWidth,
        outHeight,
      )
      const fill = resolveBgFill(bgColor, customBgColor)
      const blob = await exportBlob(active.resultUrl, width, height, format, fill)
      const base = active.file.name.replace(/\.[^.]+$/, '')
      triggerDownload(blob, `${base}-no-bg.${downloadExtension(format)}`)
    } finally {
      setDownloading(false)
    }
  }

  async function downloadAll() {
    const ready = items.filter((item) => item.status === 'done' && item.resultUrl)
    if (!ready.length || downloading) return
    setDownloading(true)

    try {
      for (const item of ready) {
        const { width, height } = outputSize(
          item,
          sizePreset,
          outWidth,
          outHeight,
        )
        const fill = resolveBgFill(bgColor, customBgColor)
        const blob = await exportBlob(item.resultUrl, width, height, format, fill)
        const base = item.file.name.replace(/\.[^.]+$/, '')
        triggerDownload(blob, `${base}-no-bg.${downloadExtension(format)}`)
        await new Promise((r) => setTimeout(r, 120))
      }
    } finally {
      setDownloading(false)
    }
  }

  const hasImages = items.length > 0
  const formatLabel = format.toUpperCase()
  const allDone = hasImages && doneCount === items.length

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Erase AI home">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Erase AI</span>
        </a>
        {hasImages && (
          <Button variant="ghost" onClick={reset} disabled={processing}>
            Clear all
          </Button>
        )}
      </header>

      {backendError && (
        <p className="app__error" role="alert">
          {backendError}
        </p>
      )}

      <main className={`stage ${hasImages ? 'stage--work' : ''}`}>
        {!hasImages ? (
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero__copy">
              <p className="hero__brand">Erase AI</p>
              <h1 id="hero-title" className="hero__title">
                Keep the person. Lose the background.
              </h1>
              <p className="hero__lede">
                Drop one photo or a whole batch — clean cutouts in moments,
                ready to place anywhere.
              </p>
              <div className="hero__upload">
                <Upload onFiles={addFiles} />
              </div>
            </div>
            <HeroMedia />
          </section>
        ) : (
          <section className="workspace" aria-labelledby="work-title">
            <div className="workspace__head">
              <div>
                <p className="workspace__eyebrow">Erase AI</p>
                <h1 id="work-title" className="workspace__title">
                  {items.length === 1
                    ? active?.file.name || 'Your image'
                    : `Batch · ${items.length} images`}
                </h1>
              </div>
              <div className="workspace__actions">
                <Button
                  variant="primary"
                  onClick={removeBackgrounds}
                  disabled={processing}
                >
                  {processing
                    ? batchProgress
                      ? `Working ${batchProgress.current}/${batchProgress.total}…`
                      : 'Working…'
                    : allDone
                      ? 'Run all again'
                      : pendingCount === items.length
                        ? items.length > 1
                          ? 'Remove all backgrounds'
                          : 'Remove background'
                        : `Remove remaining (${pendingCount})`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={downloadActive}
                  disabled={!active || active.status !== 'done' || processing || downloading}
                >
                  {downloading ? 'Preparing…' : `Download ${formatLabel}`}
                </Button>
                {items.length > 1 && (
                  <Button
                    variant="secondary"
                    onClick={downloadAll}
                    disabled={doneCount === 0 || processing || downloading}
                  >
                    Download all ({doneCount})
                  </Button>
                )}
              </div>
            </div>

            <ImageQueue
              items={items}
              activeId={activeId}
              onSelect={setActiveId}
              onRemove={removeItem}
              processing={processing}
            />

            <Preview
              originalUrl={active?.originalUrl}
              resultUrl={active?.resultUrl}
              fileName={active?.file.name}
              processing={active?.status === 'processing'}
              batchProgress={
                processing && batchProgress ? batchProgress : null
              }
              bgFill={resolveBgFill(bgColor, customBgColor)}
            />

            <ExportOptions
              format={format}
              onFormatChange={setFormat}
              sizePreset={sizePreset}
              onSizePresetChange={applyPreset}
              width={outWidth}
              height={outHeight}
              onWidthChange={handleWidthChange}
              onHeightChange={handleHeightChange}
              lockAspect={lockAspect}
              onLockAspectChange={setLockAspect}
              naturalWidth={active?.naturalWidth || 0}
              naturalHeight={active?.naturalHeight || 0}
              fileBytes={active?.file.size}
              bgColor={bgColor}
              onBgColorChange={setBgColor}
              customBgColor={customBgColor}
              onCustomBgColorChange={setCustomBgColor}
              disabled={processing}
            />

            <div className="workspace__swap">
              <Upload onFiles={addFiles} disabled={processing} compact />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

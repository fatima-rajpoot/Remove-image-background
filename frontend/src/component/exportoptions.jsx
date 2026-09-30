const FORMATS = [
  { id: 'png', label: 'PNG', hint: 'Transparent' },
  { id: 'jpg', label: 'JPG', hint: 'Smaller file' },
  { id: 'webp', label: 'WEBP', hint: 'Modern' },
  { id: 'svg', label: 'SVG', hint: 'Vector file' },
]

const SIZE_PRESETS = [
  { id: 'original', label: 'Original' },
  { id: 'large', label: '75%' },
  { id: 'medium', label: '50%' },
  { id: 'small', label: '25%' },
  { id: 'square', label: '1080²' },
  { id: 'hd', label: '1920×1080' },
  { id: 'custom', label: 'Custom' },
]

const BG_COLORS = [
  { id: 'transparent', label: 'None', value: null },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'black', label: 'Black', value: '#111111' },
  { id: 'blue', label: 'Blue', value: '#2563eb' },
  { id: 'sky', label: 'Sky', value: '#7dd3fc' },
  { id: 'red', label: 'Red', value: '#dc2626' },
  { id: 'green', label: 'Green', value: '#16a34a' },
  { id: 'gray', label: 'Gray', value: '#9ca3af' },
  { id: 'custom', label: 'Custom', value: 'custom' },
]

export default function ExportOptions({
  format,
  onFormatChange,
  sizePreset,
  onSizePresetChange,
  width,
  height,
  onWidthChange,
  onHeightChange,
  lockAspect,
  onLockAspectChange,
  naturalWidth,
  naturalHeight,
  fileBytes,
  bgColor,
  onBgColorChange,
  customBgColor,
  onCustomBgColorChange,
  disabled = false,
}) {
  return (
    <section className="export" aria-label="Export options">
      <div className="export__block">
        <h2 className="export__heading">Download format</h2>
        <div className="export__formats" role="radiogroup" aria-label="File format">
          {FORMATS.map((item) => (
            <label
              key={item.id}
              className={`export__choice ${format === item.id ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="format"
                value={item.id}
                checked={format === item.id}
                disabled={disabled}
                onChange={() => onFormatChange(item.id)}
              />
              <span className="export__choice-label">{item.label}</span>
              <span className="export__choice-hint">{item.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="export__block">
        <h2 className="export__heading">Background color</h2>
        <div className="export__colors" role="radiogroup" aria-label="Background color">
          {BG_COLORS.map((item) => (
            <label
              key={item.id}
              className={`export__swatch ${bgColor === item.id ? 'is-selected' : ''} ${item.id === 'transparent' ? 'export__swatch--none' : ''}`}
              title={item.label}
            >
              <input
                type="radio"
                name="bg-color"
                value={item.id}
                checked={bgColor === item.id}
                disabled={disabled}
                onChange={() => onBgColorChange(item.id)}
              />
              <span
                className="export__swatch-fill"
                style={
                  item.id === 'transparent' || item.id === 'custom'
                    ? undefined
                    : { background: item.value }
                }
                data-swatch={item.id}
              />
              <span className="export__swatch-label">{item.label}</span>
            </label>
          ))}
        </div>
        {bgColor === 'custom' && (
          <label className="export__picker">
            <span>Pick a color</span>
            <input
              type="color"
              value={customBgColor}
              disabled={disabled}
              onChange={(e) => onCustomBgColorChange(e.target.value)}
            />
          </label>
        )}
      </div>

      <div className="export__block export__block--wide">
        <h2 className="export__heading">Image size</h2>
        <div className="export__meta">
          <span>
            Original{' '}
            {naturalWidth && naturalHeight
              ? `${naturalWidth} × ${naturalHeight} px`
              : '—'}
          </span>
        </div>
        <div className="export__filesize" aria-label="File size">
          {fileBytes != null ? (
            <>
              <span className="export__filesize-item">
                <strong>{formatKb(fileBytes)}</strong> KB
              </span>
              <span className="export__filesize-sep" aria-hidden="true">
                ·
              </span>
              <span className="export__filesize-item">
                <strong>{formatMb(fileBytes)}</strong> MB
              </span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>

        <div className="export__presets" role="radiogroup" aria-label="Output size">
          {SIZE_PRESETS.map((item) => (
            <label
              key={item.id}
              className={`export__chip ${sizePreset === item.id ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="size"
                value={item.id}
                checked={sizePreset === item.id}
                disabled={disabled}
                onChange={() => onSizePresetChange(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="export__custom">
          <label className="export__field">
            <span>Width (px)</span>
            <input
              type="number"
              min={1}
              max={8000}
              value={width || ''}
              disabled={disabled || !naturalWidth}
              onChange={(e) => onWidthChange(Number(e.target.value) || 0)}
              placeholder="Width"
            />
          </label>
          <span className="export__times" aria-hidden="true">
            ×
          </span>
          <label className="export__field">
            <span>Height (px)</span>
            <input
              type="number"
              min={1}
              max={8000}
              value={height || ''}
              disabled={disabled || !naturalHeight}
              onChange={(e) => onHeightChange(Number(e.target.value) || 0)}
              placeholder="Height"
            />
          </label>
          <label className={`export__lock ${lockAspect ? 'is-on' : ''}`}>
            <input
              type="checkbox"
              checked={lockAspect}
              disabled={disabled}
              onChange={(e) => onLockAspectChange(e.target.checked)}
            />
            <span>Lock ratio</span>
          </label>
        </div>

        <p className="export__out">
          {width && height
            ? `Your size: ${Math.round(width)} × ${Math.round(height)} px`
            : 'Enter your own width and height'}
        </p>
      </div>
    </section>
  )
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(bytes >= 1024 * 100 ? 0 : 1)
}

function formatMb(bytes) {
  const mb = bytes / (1024 * 1024)
  if (mb < 0.01) return mb.toFixed(3)
  if (mb < 10) return mb.toFixed(2)
  return mb.toFixed(1)
}

export { FORMATS, SIZE_PRESETS, BG_COLORS }

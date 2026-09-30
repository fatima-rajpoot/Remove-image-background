import { useId, useState } from 'react'

const ACCEPT = 'image/png,image/jpeg,image/webp'

export default function Upload({
  onFiles,
  disabled = false,
  compact = false,
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  function takeFiles(list) {
    const files = Array.from(list || []).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (!files.length) return
    onFiles?.(files)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    takeFiles(e.dataTransfer.files)
  }

  return (
    <label
      htmlFor={disabled ? undefined : inputId}
      className={`upload ${compact ? 'upload--compact' : ''} ${dragging ? 'upload--active' : ''} ${disabled ? 'upload--disabled' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return
        setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        className="upload__input"
        type="file"
        accept={ACCEPT}
        multiple
        disabled={disabled}
        onChange={(e) => {
          takeFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="upload__mark" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M18 24.5V11.5M18 11.5L12.5 17M18 11.5L23.5 17"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 26.5C8 28.157 9.343 29.5 11 29.5H25C26.657 29.5 28 28.157 28 26.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="upload__title">
        {compact ? 'Add more images at once' : 'Select multiple images'}
      </p>
      <p className="upload__hint">
        Pick many in one dialog · drag a group here · PNG, JPG, WEBP
      </p>
      <p className="upload__tip">Tip: hold Ctrl (Windows) or Cmd (Mac) to select several files</p>
    </label>
  )
}

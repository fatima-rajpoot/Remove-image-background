export default function Preview({
  originalUrl,
  resultUrl,
  fileName,
  processing = false,
  batchProgress = null,
  bgFill = null,
}) {
  const showResult = Boolean(resultUrl)
  const hasColorBg = Boolean(bgFill)

  return (
    <div className="preview">
      <figure className="preview__pane">
        <figcaption className="preview__label">Original</figcaption>
        <div className="preview__frame">
          {originalUrl ? (
            <img src={originalUrl} alt={fileName ? `Original ${fileName}` : 'Original'} />
          ) : (
            <div className="preview__empty">No image yet</div>
          )}
        </div>
      </figure>

      <figure className="preview__pane">
        <figcaption className="preview__label">
          {processing ? 'Removing…' : showResult ? (hasColorBg ? 'With background' : 'Transparent') : 'Result'}
        </figcaption>
        <div
          className={`preview__frame ${hasColorBg ? '' : 'preview__frame--check'} ${processing ? 'is-busy' : ''}`}
          style={hasColorBg ? { background: bgFill } : undefined}
        >
          {processing && (
            <div className="preview__spinner" role="status" aria-live="polite">
              <span className="preview__ring" />
              <span>
                {batchProgress
                  ? `Erasing ${batchProgress.current} of ${batchProgress.total}`
                  : 'Erasing background'}
              </span>
            </div>
          )}
          {!processing && showResult && (
            <img src={resultUrl} alt={fileName ? `Result ${fileName}` : 'Result'} />
          )}
          {!processing && !showResult && (
            <div className="preview__empty">Result appears here</div>
          )}
        </div>
      </figure>
    </div>
  )
}

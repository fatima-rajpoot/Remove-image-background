export default function ImageQueue({
  items,
  activeId,
  onSelect,
  onRemove,
  processing = false,
}) {
  if (!items.length) return null

  const doneCount = items.filter((item) => item.status === 'done').length

  return (
    <section className="queue" aria-label="Selected images">
      <div className="queue__head">
        <h2 className="queue__heading">
          {items.length} image{items.length === 1 ? '' : 's'}
        </h2>
        <span className="queue__meta">
          {doneCount}/{items.length} ready
        </span>
      </div>

      <ul className="queue__list">
        {items.map((item, index) => {
          const selected = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`queue__card ${selected ? 'is-selected' : ''} ${item.status === 'processing' ? 'is-busy' : ''}`}
                onClick={() => onSelect(item.id)}
                aria-pressed={selected}
                aria-label={`Select ${item.file.name}`}
              >
                <span className="queue__thumb">
                  <img src={item.originalUrl} alt="" />
                  {item.status === 'processing' && (
                    <span className="queue__overlay">
                      <span className="queue__ring" />
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="queue__badge" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
                <span className="queue__info">
                  <span className="queue__name">{item.file.name}</span>
                  <span className="queue__status">{statusLabel(item.status, index)}</span>
                </span>
              </button>
              <button
                type="button"
                className="queue__remove"
                onClick={() => onRemove(item.id)}
                disabled={processing}
                aria-label={`Remove ${item.file.name}`}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function statusLabel(status, index) {
  switch (status) {
    case 'processing':
      return 'Removing…'
    case 'done':
      return 'Done'
    case 'error':
      return 'Failed'
    case 'ready':
      return `Image ${index + 1}`
    default:
      return `Image ${index + 1}`
  }
}

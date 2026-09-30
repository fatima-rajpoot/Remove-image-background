import { useEffect, useRef } from 'react'

export default function HeroMedia() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    video.muted = true
    video.defaultMuted = true
    video.playsInline = true

    const tryPlay = () => {
      const playPromise = video.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          requestAnimationFrame(() => {
            video.play().catch(() => {})
          })
        })
      }
    }

    if (video.readyState >= 2) {
      tryPlay()
    } else {
      video.addEventListener('canplay', tryPlay, { once: true })
      video.load()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && video.paused) {
        tryPlay()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      video.removeEventListener('canplay', tryPlay)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="hero-media">
      <div className="hero-media__glow" aria-hidden="true" />
      <div className="hero-media__orbit" aria-hidden="true" />
      <div className="hero-media__frame">
        <video
          ref={videoRef}
          className="hero-media__video"
          src="/media/hero-user.mp4"
          poster="/media/hero-user.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          aria-label="Demo of a person cut out from the background"
        />
      </div>
    </div>
  )
}

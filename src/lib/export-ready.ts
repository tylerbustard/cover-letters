export const waitForImages = async () => {
  const images = Array.from(document.images)

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve()
            return
          }

          const finalize = () => {
            image.removeEventListener('load', finalize)
            image.removeEventListener('error', finalize)
            resolve()
          }

          image.addEventListener('load', finalize)
          image.addEventListener('error', finalize)
        }),
    ),
  )
}

export const waitForDocumentReady = async () => {
  try {
    if ('fonts' in document) {
      await document.fonts.ready
    }
  } catch {
    // Ignore font readiness failures and continue.
  }

  await waitForImages()
}

// 이미지 자동 다운로드 유틸리티

export const downloadImage = (dataURL: string, filename?: string) => {
  try {
    // 기본 파일명 생성 (날짜와 시간 포함)
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0]
    const defaultFilename = `photobooth-${timestamp}.png`
    
    // 다운로드용 링크 생성
    const link = document.createElement('a')
    link.href = dataURL
    link.download = filename || defaultFilename
    
    // 브라우저에서 다운로드 실행
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log(`✅ Image downloaded: ${link.download}`)
    return true
  } catch (error) {
    console.error('❌ Failed to download image:', error)
    return false
  }
}

export const downloadMultipleImages = (images: string[], baseFilename?: string) => {
  try {
    images.forEach((dataURL, index) => {
      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0]
      const filename = baseFilename 
        ? `${baseFilename}-${index + 1}-${timestamp}.png`
        : `photobooth-cut${index + 1}-${timestamp}.png`
      
      // 약간의 딜레이를 두어 브라우저가 처리할 수 있도록 함
      setTimeout(() => {
        downloadImage(dataURL, filename)
      }, index * 100) // 100ms씩 지연
    })
    
    console.log(`✅ Started downloading ${images.length} images`)
    return true
  } catch (error) {
    console.error('❌ Failed to download multiple images:', error)
    return false
  }
}
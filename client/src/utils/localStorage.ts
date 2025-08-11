interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

const STORAGE_KEY = 'nearzoom_images'
const REFERENCE_STORAGE_KEY = 'nearzoom_reference_image'
const ACCESS_TOKEN_KEY = 'nearzoom_access_token'
const SESSION_TIMESTAMP_KEY = 'nearzoom_session_timestamp'

export const saveImageToLocal = (image: ImageItem): void => {
  try {
    const existingImages = getImagesFromLocal()
    console.log('💾 Saving new image to localStorage:', image.id)
    console.log('📋 Existing images count:', existingImages.length)

    const updatedImages = [...existingImages, image]
    console.log('📋 Updated images count:', updatedImages.length)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages))
    console.log('✅ Successfully saved image to localStorage')
  } catch (error) {
    console.error('❌ Failed to save image to localStorage:', error)
  }
}

export const getImagesFromLocal = (): ImageItem[] => {
  try {
    const imagesData = localStorage.getItem(STORAGE_KEY)
    return imagesData ? JSON.parse(imagesData) : []
  } catch (error) {
    console.error('Failed to load images from localStorage:', error)
    return []
  }
}

export const updateImageInLocal = (
  imageId: string,
  updates: Partial<ImageItem>
): void => {
  try {
    const existingImages = getImagesFromLocal()
    console.log(
      '🔄 Updating image in localStorage:',
      imageId,
      'Updates:',
      updates
    )
    console.log(
      '📋 Existing images before update:',
      existingImages.length,
      'images'
    )

    const targetImage = existingImages.find(img => img.id === imageId)
    console.log('🎯 Target image found:', targetImage)

    const updatedImages = existingImages.map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    )

    const updatedTarget = updatedImages.find(img => img.id === imageId)
    console.log('✨ Updated image:', updatedTarget)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedImages))
    console.log('✅ Successfully updated image in localStorage')
  } catch (error) {
    console.error('❌ Failed to update image in localStorage:', error)
  }
}

export const deleteImageFromLocal = (imageId: string): void => {
  try {
    const existingImages = getImagesFromLocal()
    const filteredImages = existingImages.filter(img => img.id !== imageId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredImages))
  } catch (error) {
    console.error('Failed to delete image from localStorage:', error)
  }
}

export const initializeTestImages = (defaultImages: ImageItem[]): void => {
  try {
    const existingImages = getImagesFromLocal()
    console.log(
      '🔧 Initializing test images. Existing images:',
      existingImages.length
    )

    if (existingImages.length === 0) {
      console.log(
        '📥 No existing images found. Loading default images:',
        defaultImages.length
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultImages))
    } else {
      console.log('✅ Images already exist in localStorage')
    }
  } catch (error) {
    console.error('❌ Failed to initialize test images:', error)
  }
}

export const clearAllImages = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('🗑️ Cleared all images from localStorage')
  } catch (error) {
    console.error('❌ Failed to clear images from localStorage:', error)
  }
}

export const saveReferenceImage = (imageData: string): void => {
  try {
    console.log('💾 Saving reference image (single)')

    const referenceImage = {
      id: `ref_${Date.now()}`,
      src: imageData,
      uploadedAt: new Date().toISOString(),
    }

    localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(referenceImage))
    console.log('✅ Successfully saved reference image')
  } catch (error) {
    console.error('❌ Failed to save reference image:', error)
  }
}

export const getReferenceImage = (): {
  id: string
  src: string
  uploadedAt: string
} | null => {
  try {
    const imageData = localStorage.getItem(REFERENCE_STORAGE_KEY)
    return imageData ? JSON.parse(imageData) : null
  } catch (error) {
    console.error('❌ Failed to load reference image from localStorage:', error)
    return null
  }
}

export const deleteReferenceImage = (): void => {
  try {
    localStorage.removeItem(REFERENCE_STORAGE_KEY)
    console.log('🗑️ Deleted reference image')
  } catch (error) {
    console.error('❌ Failed to delete reference image:', error)
  }
}

export const clearReferenceImage = (): void => {
  try {
    localStorage.removeItem(REFERENCE_STORAGE_KEY)
    console.log('🗑️ Cleared reference image from localStorage')
  } catch (error) {
    console.error(
      '❌ Failed to clear reference image from localStorage:',
      error
    )
  }
}

export const getReferenceImages = (): Array<{
  id: string
  src: string
  uploadedAt: string
}> => {
  const singleImage = getReferenceImage()
  return singleImage ? [singleImage] : []
}

// 인증 토큰 관련 함수들
export const saveAccessToken = (token: string): void => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
    console.log('✅ Access token saved to localStorage')
  } catch (error) {
    console.error('❌ Failed to save access token:', error)
  }
}

export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch (error) {
    console.error('❌ Failed to get access token from localStorage:', error)
    return null
  }
}

export const removeAccessToken = (): void => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    console.log('🗑️ Access token removed from localStorage')
  } catch (error) {
    console.error('❌ Failed to remove access token:', error)
  }
}

// 마지막 활동 타임스탬프 관련 함수들  
export const saveLastActivityTimestamp = (): void => {
  try {
    const timestamp = Date.now()
    localStorage.setItem(SESSION_TIMESTAMP_KEY, timestamp.toString())
    console.log('✅ Last activity timestamp saved:', new Date(timestamp).toLocaleString())
  } catch (error) {
    console.error('❌ Failed to save last activity timestamp:', error)
  }
}

// 호환성을 위해 기존 함수명 유지
export const saveSessionTimestamp = saveLastActivityTimestamp

export const getSessionTimestamp = (): number | null => {
  try {
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
    return timestamp ? parseInt(timestamp) : null
  } catch (error) {
    console.error('❌ Failed to get session timestamp:', error)
    return null
  }
}

export const removeSessionTimestamp = (): void => {
  try {
    localStorage.removeItem(SESSION_TIMESTAMP_KEY)
    console.log('🗑️ Session timestamp removed from localStorage')
  } catch (error) {
    console.error('❌ Failed to remove session timestamp:', error)
  }
}

export const isSessionExpired = (): boolean => {
  const timestamp = getSessionTimestamp()
  if (!timestamp) return true
  
  const now = Date.now()
  const twoHours = 2 * 60 * 60 * 1000 // 2시간을 밀리초로
  const isExpired = (now - timestamp) > twoHours
  
  if (isExpired) {
    console.log(' Session expired:', {
      sessionStart: new Date(timestamp).toLocaleString(),
      now: new Date(now).toLocaleString(),
      elapsed: Math.floor((now - timestamp) / 1000 / 60) + ' minutes'
    })
  }
  
  return isExpired
}

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

export const updateImageInLocal = (imageId: string, updates: Partial<ImageItem>): void => {
  try {
    const existingImages = getImagesFromLocal()
    console.log('🔄 Updating image in localStorage:', imageId, 'Updates:', updates)
    console.log('📋 Existing images before update:', existingImages.length, 'images')
    
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
    console.log('🔧 Initializing test images. Existing images:', existingImages.length)
    
    if (existingImages.length === 0) {
      console.log('📥 No existing images found. Loading default images:', defaultImages.length)
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

// 참고 이미지 관리 기능들 (단일 이미지)
export const saveReferenceImage = (imageData: string): void => {
  try {
    console.log('💾 Saving reference image (single)')
    
    const referenceImage = {
      id: `ref_${Date.now()}`,
      src: imageData,
      uploadedAt: new Date().toISOString()
    }
    
    localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(referenceImage))
    console.log('✅ Successfully saved reference image')
  } catch (error) {
    console.error('❌ Failed to save reference image:', error)
  }
}

export const getReferenceImage = (): {id: string, src: string, uploadedAt: string} | null => {
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
    console.error('❌ Failed to clear reference image from localStorage:', error)
  }
}

// 하위 호환성을 위한 기존 함수들 (deprecated)
export const getReferenceImages = (): Array<{id: string, src: string, uploadedAt: string}> => {
  const singleImage = getReferenceImage()
  return singleImage ? [singleImage] : []
}
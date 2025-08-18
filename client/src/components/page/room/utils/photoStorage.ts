// PhotoBooth 사진 localStorage 관리 유틸리티

/**
 * 방별 사진 저장 키 생성
 */
export const getPhotoStorageKey = (roomName: string): string => {
  return `photobooth_${roomName}_images`
}

/**
 * 사진들을 localStorage에 저장 (방장 전용)
 */
export const savePhotosToStorage = (roomName: string, photos: string[]): void => {
  try {
    const key = getPhotoStorageKey(roomName)
    const dataToStore = JSON.stringify(photos)
    localStorage.setItem(key, dataToStore)
    console.log(`💾 Saved ${photos.length} photos to localStorage for room: ${roomName}`)
  } catch (error) {
    console.error('❌ Failed to save photos to localStorage:', error)
  }
}

/**
 * localStorage에서 사진들 로드
 */
export const loadPhotosFromStorage = (roomName: string): string[] => {
  try {
    const key = getPhotoStorageKey(roomName)
    const stored = localStorage.getItem(key)
    
    if (!stored) {
      console.log(`📂 No stored photos found for room: ${roomName}`)
      return []
    }
    
    const photos = JSON.parse(stored) as string[]
    console.log(`📂 Loaded ${photos.length} photos from localStorage for room: ${roomName}`)
    return photos
  } catch (error) {
    console.error('❌ Failed to load photos from localStorage:', error)
    return []
  }
}

/**
 * 특정 방의 사진들 삭제
 */
export const clearPhotosFromStorage = (roomName: string): void => {
  try {
    const key = getPhotoStorageKey(roomName)
    localStorage.removeItem(key)
    console.log(`🗑️ Cleared photos from localStorage for room: ${roomName}`)
  } catch (error) {
    console.error('❌ Failed to clear photos from localStorage:', error)
  }
}

/**
 * 단일 사진 추가
 */
export const addPhotoToStorage = (roomName: string, imageData: string): string[] => {
  try {
    const existingPhotos = loadPhotosFromStorage(roomName)
    const newPhotos = [...existingPhotos, imageData]
    savePhotosToStorage(roomName, newPhotos)
    return newPhotos
  } catch (error) {
    console.error('❌ Failed to add photo to localStorage:', error)
    return loadPhotosFromStorage(roomName) // 기존 사진들 반환
  }
}

/**
 * localStorage 용량 체크 (선택사항)
 */
export const getStorageUsage = (): { used: number; total: number } => {
  try {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    
    return {
      used: total,
      total: 5 * 1024 * 1024, // 대략 5MB (브라우저마다 다름)
    }
  } catch (error) {
    console.error('❌ Failed to calculate storage usage:', error)
    return { used: 0, total: 0 }
  }
}

/**
 * 모든 PhotoBooth 관련 데이터 삭제 (개발용)
 */
export const clearAllPhotoBoothStorage = (): void => {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('photobooth_')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`🗑️ Cleared ${keysToRemove.length} PhotoBooth storage entries`)
  } catch (error) {
    console.error('❌ Failed to clear all PhotoBooth storage:', error)
  }
}
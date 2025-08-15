// Select Slice - 사진 선택 및 프레임 색상 관리 (photoSlice + frameSlice 통합)

// Photo 객체 타입 정의
export interface Photo {
  imgUrl: string       // 서버에서 받은 이미지 URL
  personIds: string[]  // 왼쪽에서 오른쪽 순서의 참가자 face image URLs
  cutIndex: number     // 컷 인덱스
  roomId: string       // 방 ID
  timestamp: number    // 캡처 시간
}

export interface SelectSliceState {
  selectedPhotos: (Photo | null)[]
  frameColor: string
}

export interface SelectSliceActions {
  // Photo selection actions
  setSelectedPhotos: (photos: (Photo | null)[]) => void
  setPhotoAtIndex: (photo: Photo, index: number) => void
  removePhotoAtIndex: (index: number) => void
  clearSelectedPhotos: () => void
  initializePhotoArray: (cutCount: number) => void
  
  // Frame color actions
  setFrameColor: (color: string) => void
  
  // Legacy method for backward compatibility
  addSelectedPhoto?: (photo: Photo) => void
}

export type SelectSlice = SelectSliceState & SelectSliceActions

export const defaultSelectSliceState: SelectSliceState = {
  selectedPhotos: new Array(4).fill(null), // Default 4 cuts, all empty
  frameColor: '#FFFFFF',
}

export const createSelectSlice = (set: any, get: any, roomName: string) => ({
  ...defaultSelectSliceState,
  
  // Photo selection actions
  setSelectedPhotos: (photos: (Photo | null)[]) => {
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: photos })
  },
    
  setPhotoAtIndex: (photo: Photo, index: number) => {
    const { selectedPhotos } = get()
    console.log(`📸 Setting photo at index ${index}:`, {
      imgUrl: photo.imgUrl,
      personIds: photo.personIds,
      cutIndex: photo.cutIndex,
      roomId: photo.roomId
    })
    
    // Create a copy of the photos array
    const photos = [...selectedPhotos]
    
    // Ensure array has correct length (in case cutCount changed)
    while (photos.length <= index) {
      photos.push(null)
    }
    
    // Set photo at specific index (replaces existing photo)
    photos[index] = photo
    
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: photos })
    
    console.log(`✅ Photo set at index ${index}`)
  },
  
  removePhotoAtIndex: (index: number) => {
    const { selectedPhotos } = get()
    if (index >= 0 && index < selectedPhotos.length) {
      const photos = [...selectedPhotos]
      photos[index] = null // Set to null instead of removing
      
      // Yjs에 상태 업데이트
      const { updateSelectState } = require('./index')
      updateSelectState(roomName, { selectedPhotos: photos })
      console.log(`🗑️ Removed photo at index: ${index}`)
    }
  },

  initializePhotoArray: (cutCount: number) => {
    console.log(`🏗️ Initializing photo array with ${cutCount} slots`)
    const photos = new Array(cutCount).fill(null)
    
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: photos })
  },
  
  clearSelectedPhotos: () => {
    const { selectedPhotos } = get()
    // Clear to array of nulls instead of empty array
    const photos = new Array(selectedPhotos.length).fill(null)
    
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: photos })
    console.log('🧹 Cleared all selected photos')
  },
  
  // Legacy method for backward compatibility
  addSelectedPhoto: (photo: Photo) => {
    // Use cutIndex to determine where to place the photo
    const { setPhotoAtIndex } = get()
    setPhotoAtIndex(photo, photo.cutIndex)
    console.log('⚠️ Using legacy addSelectedPhoto - consider using setPhotoAtIndex directly')
  },

  // Frame color actions  
  setFrameColor: (color: string) => {
    // Yjs에 상태 업데이트 (자동으로 모든 참가자에게 동기화됨)
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { frameColor: color })
  },
})
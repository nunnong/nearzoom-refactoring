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
  selectedPhotos: Photo[]
  frameColor: string
}

export interface SelectSliceActions {
  // Photo selection actions
  setSelectedPhotos: (photos: Photo[]) => void
  addSelectedPhoto: (photo: Photo) => void
  removeSelectedPhoto: (photoIndex: number) => void
  clearSelectedPhotos: () => void
  
  // Frame color actions
  setFrameColor: (color: string) => void
}

export type SelectSlice = SelectSliceState & SelectSliceActions

export const defaultSelectSliceState: SelectSliceState = {
  selectedPhotos: [],
  frameColor: '#FFFFFF',
}

export const createSelectSlice = (set: any, get: any, roomName: string) => ({
  ...defaultSelectSliceState,
  
  // Photo selection actions
  setSelectedPhotos: (photos: Photo[]) => {
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: photos })
  },
    
  addSelectedPhoto: (photo: Photo) => {
    const { selectedPhotos } = get()
    console.log('📸 Adding photo to selection:', {
      imgUrl: photo.imgUrl,
      personIds: photo.personIds,
      cutIndex: photo.cutIndex,
      roomId: photo.roomId
    })
    
    // 중복 체크 (imgUrl 기준)
    const isDuplicate = selectedPhotos.some(p => p.imgUrl === photo.imgUrl)
    if (!isDuplicate) {
      const newPhotos = [...selectedPhotos, photo]
      // Yjs에 상태 업데이트
      const { updateSelectState } = require('./index')
      updateSelectState(roomName, { selectedPhotos: newPhotos })
    } else {
      console.log('⚠️ Duplicate photo not added:', photo.imgUrl)
    }
  },
  
  removeSelectedPhoto: (photoIndex: number) => {
    const { selectedPhotos } = get()
    if (photoIndex >= 0 && photoIndex < selectedPhotos.length) {
      const newPhotos = selectedPhotos.filter((_, index) => index !== photoIndex)
      // Yjs에 상태 업데이트
      const { updateSelectState } = require('./index')
      updateSelectState(roomName, { selectedPhotos: newPhotos })
      console.log('🗑️ Removed photo at index:', photoIndex)
    }
  },
  
  clearSelectedPhotos: () => {
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: [] })
    console.log('🧹 Cleared all selected photos')
  },

  // Frame color actions  
  setFrameColor: (color: string) => {
    // Yjs에 상태 업데이트 (자동으로 모든 참가자에게 동기화됨)
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { frameColor: color })
  },
})
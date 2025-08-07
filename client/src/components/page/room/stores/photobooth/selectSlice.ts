// Select Slice - 사진 선택 및 프레임 색상 관리 (photoSlice + frameSlice 통합)

export interface SelectSliceState {
  selectedPhotos: string[]
  frameColor: string
}

export interface SelectSliceActions {
  // Photo selection actions
  setSelectedPhotos: (photos: string[]) => void
  addSelectedPhoto: (photo: string) => void
  removeSelectedPhoto: (photo: string) => void
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
  setSelectedPhotos: (photos: string[]) => {
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: photos })
  },
    
  addSelectedPhoto: (photo: string) => {
    const { selectedPhotos } = get()
    if (!selectedPhotos.includes(photo)) {
      const newPhotos = [...selectedPhotos, photo]
      // Yjs에 상태 업데이트
      const { updateSelectState } = require('./index')
      updateSelectState(roomName, { selectedPhotos: newPhotos })
    }
  },
  
  removeSelectedPhoto: (photo: string) => {
    const { selectedPhotos } = get()
    const newPhotos = selectedPhotos.filter(p => p !== photo)
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: newPhotos })
  },
  
  clearSelectedPhotos: () => {
    // Yjs에 상태 업데이트
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { selectedPhotos: [] })
  },

  // Frame color actions  
  setFrameColor: (color: string) => {
    // Yjs에 상태 업데이트 (자동으로 모든 참가자에게 동기화됨)
    const { updateSelectState } = require('./index')
    updateSelectState(roomName, { frameColor: color })
  },
})
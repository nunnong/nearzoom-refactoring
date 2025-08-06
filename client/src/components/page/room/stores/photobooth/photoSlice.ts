// Photo Slice - 선택된 사진들 관리

export interface PhotoSliceState {
  selectedPhotos: string[]
}

export interface PhotoSliceActions {
  setSelectedPhotos: (photos: string[]) => void
  addSelectedPhoto: (photo: string) => void
  removeSelectedPhoto: (photo: string) => void
  clearSelectedPhotos: () => void
}

export type PhotoSlice = PhotoSliceState & PhotoSliceActions

export const defaultPhotoSliceState: PhotoSliceState = {
  selectedPhotos: [],
}

export const createPhotoSlice = (set: any, get: any, roomName: string) => ({
  ...defaultPhotoSliceState,
  
  setSelectedPhotos: (photos: string[]) => {
    // Yjs에 상태 업데이트
    const { updateSelectedPhotos } = require('./index')
    updateSelectedPhotos(roomName, photos)
  },
    
  addSelectedPhoto: (photo: string) => {
    const { selectedPhotos } = get()
    if (!selectedPhotos.includes(photo)) {
      const newPhotos = [...selectedPhotos, photo]
      // Yjs에 상태 업데이트
      const { updateSelectedPhotos } = require('./index')
      updateSelectedPhotos(roomName, newPhotos)
    }
  },
  
  removeSelectedPhoto: (photo: string) => {
    const { selectedPhotos } = get()
    const newPhotos = selectedPhotos.filter(p => p !== photo)
    // Yjs에 상태 업데이트
    const { updateSelectedPhotos } = require('./index')
    updateSelectedPhotos(roomName, newPhotos)
  },
  
  clearSelectedPhotos: () => {
    // Yjs에 상태 업데이트
    const { updateSelectedPhotos } = require('./index')
    updateSelectedPhotos(roomName, [])
  },
})
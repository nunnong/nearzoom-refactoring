// PhotoBooth store types and enums
import { type RoomLeaderSlice } from './roomLeaderSlice'

export enum PhotoBoothState {
  WAITING = 'waiting',
  SHOOTING = 'photoshoot',
  SELECTING = 'photo-select'
}

export interface PhotoBoothStoreState {
  photoBoothState: PhotoBoothState
  currentCutIndex: number
  selectedPhotos: string[]
  frameColor: string
  cutCount: number
  currentUsername: string  // 현재 사용자의 username 추가
  roomName: string  // 방 이름 추가
}

export interface PhotoBoothActions {
  setPhotoBoothState: (state: PhotoBoothState) => void
  nextPhotoBoothState: () => void
  setCurrentCutIndex: (index: number) => void
  setSelectedPhotos: (photos: string[]) => void
  setFrameColor: (color: string) => void
  setCutCount: (count: number) => void
  setCurrentUsername: (username: string) => void
  setRoomName: (roomName: string) => void
  resetPhotoBoothData: () => void
}

export type PhotoBoothSlice = PhotoBoothStoreState & PhotoBoothActions & RoomLeaderSlice

export const defaultPhotoBoothState: PhotoBoothStoreState = {
  photoBoothState: PhotoBoothState.WAITING,
  currentCutIndex: 0,
  selectedPhotos: [],
  frameColor: '#FFFFFF',
  cutCount: 4,
  currentUsername: '',
  roomName: '',
}

export const createPhotoBoothSlice = (set: any, get: any, api: any) => ({
  ...defaultPhotoBoothState,
  
  setPhotoBoothState: (state: PhotoBoothState) => 
    set({ photoBoothState: state }),
    
  nextPhotoBoothState: () => {
    const currentState = get().photoBoothState
    switch (currentState) {
      case PhotoBoothState.WAITING:
        set({ photoBoothState: PhotoBoothState.SHOOTING })
        break
      case PhotoBoothState.SHOOTING:
        set({ photoBoothState: PhotoBoothState.SELECTING })
        break
      case PhotoBoothState.SELECTING:
        // 완료 후 다시 대기로 돌아감
        set({ photoBoothState: PhotoBoothState.WAITING })
        break
    }
  },
  
  setCurrentCutIndex: (index: number) => 
    set({ currentCutIndex: index }),
    
  setSelectedPhotos: (photos: string[]) => 
    set({ selectedPhotos: photos }),
    
  setFrameColor: (color: string) => 
    set({ frameColor: color }),
    
  setCutCount: (count: number) => 
    set({ cutCount: count }),
    
  setCurrentUsername: (username: string) =>
    set({ currentUsername: username }),
    
  setRoomName: (roomName: string) =>
    set({ roomName: roomName }),
    
  resetPhotoBoothData: () => 
    set((state: any) => ({
      photoBoothState: PhotoBoothState.WAITING,
      currentCutIndex: 0,
      selectedPhotos: [],
      frameColor: '#FFFFFF',
      cutCount: 4,
      currentUsername: state.currentUsername, // 현재 username은 유지
      roomName: state.roomName, // 현재 roomName도 유지
    })),
})
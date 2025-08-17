// PhotoBooth State Slice - WAITING/SHOOTING/SELECTING 상태 관리

export enum PhotoBoothState {
  WAITING = 'waiting',
  SHOOTING = 'photoshoot',
  SELECTING = 'photo-select',
  EDITING = 'photo-edit',
  END = 'end'
}

export interface StateSliceState {
  photoBoothState: PhotoBoothState
}

export interface StateSliceActions {
  setPhotoBoothState: (state: PhotoBoothState) => void
  nextPhotoBoothState: () => void
}

export type StateSlice = StateSliceState & StateSliceActions

export const defaultStateSliceState: StateSliceState = {
  photoBoothState: PhotoBoothState.WAITING,
}

export const createStateSlice = (set: any, get: any, roomName: string) => ({
  ...defaultStateSliceState,
  
  setPhotoBoothState: (state: PhotoBoothState) => {
    // Yjs에 상태 업데이트 (자동으로 모든 참가자에게 동기화됨)
    const { updatePhotoBoothState } = require('./index')
    updatePhotoBoothState(roomName, state)
    // 로컬 store는 Yjs 변경사항 감지를 통해 자동 업데이트됨
  },
    
  nextPhotoBoothState: () => {
    const currentState = get().photoBoothState
    let nextState: PhotoBoothState
    
    switch (currentState) {
      case PhotoBoothState.WAITING:
        nextState = PhotoBoothState.SHOOTING
        break
      case PhotoBoothState.SHOOTING:
        nextState = PhotoBoothState.SELECTING
        break
      case PhotoBoothState.SELECTING:
        nextState = PhotoBoothState.EDITING
        break
      case PhotoBoothState.EDITING:
        nextState = PhotoBoothState.END
        break
      case PhotoBoothState.END:
        nextState = PhotoBoothState.WAITING
        break
      default:
        nextState = PhotoBoothState.WAITING
    }
    
    // Yjs에 상태 업데이트
    const { updatePhotoBoothState } = require('./index')
    updatePhotoBoothState(roomName, nextState)
  },
})
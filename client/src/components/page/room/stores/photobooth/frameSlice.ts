// Frame Slice - 프레임 색상 관리

export interface FrameSliceState {
  frameColor: string
}

export interface FrameSliceActions {
  setFrameColor: (color: string) => void
}

export type FrameSlice = FrameSliceState & FrameSliceActions

export const defaultFrameSliceState: FrameSliceState = {
  frameColor: '#FFFFFF',
}

export const createFrameSlice = (set: any, roomName: string) => ({
  ...defaultFrameSliceState,
  
  setFrameColor: (color: string) => {
    // Yjs에 상태 업데이트 (자동으로 모든 참가자에게 동기화됨)
    const { updateFrameColor } = require('./index')
    updateFrameColor(roomName, color)
    // 로컬 store는 Yjs 변경사항 감지를 통해 자동 업데이트됨
  },
})
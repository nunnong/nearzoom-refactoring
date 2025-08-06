// Cut Slice - 컷 수 및 현재 컷 인덱스 관리

export interface CutSliceState {
  cutCount: number
  currentCutIndex: number
}

export interface CutSliceActions {
  setCutCount: (count: number) => void
  setCurrentCutIndex: (index: number) => void
  nextCut: () => void
  resetCutIndex: () => void
}

export type CutSlice = CutSliceState & CutSliceActions

export const defaultCutSliceState: CutSliceState = {
  cutCount: 4,
  currentCutIndex: 0,
}

export const createCutSlice = (_set: any, get: any, roomName: string) => ({
  ...defaultCutSliceState,
  
  setCutCount: (count: number) => {
    // Yjs에 상태 업데이트
    const { updateCutCount } = require('./index')
    updateCutCount(roomName, count)
  },
    
  setCurrentCutIndex: (index: number) => {
    // Yjs에 상태 업데이트
    const { updateCurrentCutIndex } = require('./index')
    updateCurrentCutIndex(roomName, index)
  },
    
  nextCut: () => {
    const { currentCutIndex, cutCount } = get()
    if (currentCutIndex < cutCount - 1) {
      const nextIndex = currentCutIndex + 1
      // Yjs에 상태 업데이트
      const { updateCurrentCutIndex } = require('./index')
      updateCurrentCutIndex(roomName, nextIndex)
    }
  },
  
  resetCutIndex: () => {
    // Yjs에 상태 업데이트
    const { updateCurrentCutIndex } = require('./index')
    updateCurrentCutIndex(roomName, 0)
  },
})
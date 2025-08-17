import { create } from 'zustand'

export interface CursorPosition {
  x: number
  y: number
  userId: string
  userName: string
  color: string
  timestamp: number
}

export interface CursorStore {
  // State
  cursors: Map<string, CursorPosition>
  localCursor: CursorPosition | null
  isActive: boolean
  removingCursors: Set<string>
  
  // Actions
  setCursor: (userId: string, position: CursorPosition | null) => void
  setLocalCursor: (position: CursorPosition | null) => void
  removeCursor: (userId: string) => void
  setActive: (active: boolean) => void
  clearAllCursors: () => void
  markCursorForRemoval: (userId: string) => void
}

export const createCursorStore = () => {
  return create<CursorStore>()((set, get) => ({
    // Initial state
    cursors: new Map(),
    localCursor: null,
    isActive: false,
    removingCursors: new Set(),
    
    // Actions
    setCursor: (userId: string, position: CursorPosition | null) =>
      set((state) => {
        const newCursors = new Map(state.cursors)
        const newRemoving = new Set(state.removingCursors)
        
        if (position) {
          newCursors.set(userId, position)
          newRemoving.delete(userId) // Remove from removing set if it was there
        } else {
          newCursors.delete(userId)
        }
        return { cursors: newCursors, removingCursors: newRemoving }
      }),
      
    setLocalCursor: (position: CursorPosition | null) =>
      set({ localCursor: position }),
      
    removeCursor: (userId: string) =>
      set((state) => {
        const newCursors = new Map(state.cursors)
        const newRemoving = new Set(state.removingCursors)
        
        newCursors.delete(userId)
        newRemoving.delete(userId)
        return { cursors: newCursors, removingCursors: newRemoving }
      }),
      
    markCursorForRemoval: (userId: string) =>
      set((state) => {
        const newRemoving = new Set(state.removingCursors)
        newRemoving.add(userId)
        return { removingCursors: newRemoving }
      }),
      
    setActive: (active: boolean) =>
      set({ isActive: active }),
      
    clearAllCursors: () =>
      set({
        cursors: new Map(),
        localCursor: null,
        isActive: false,
        removingCursors: new Set(),
      }),
  }))
}

// 사용자별 랜덤 색상 생성
export const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#00D2D3', '#FF9F43', '#EE5A24', '#0984E3'
  ]
  
  // userId를 기반으로 일관된 색상 선택
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Data Packet 타입 정의
export interface CursorDataPacket {
  type: 'cursor_update' | 'cursor_hide'
  userId: string
  userName: string
  color: string
  x?: number
  y?: number
  timestamp: number
}
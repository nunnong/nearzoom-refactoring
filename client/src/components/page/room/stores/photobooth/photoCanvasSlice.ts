import { StateCreator } from 'zustand'
import { ParticipantTransform, PhotoCanvasState, DEFAULT_PARTICIPANT_CONFIG } from '../../types/photoCanvas'

export interface PhotoCanvasSlice extends PhotoCanvasState {
  // Yjs 동기화 메서드 (진실의 원천)
  syncFromYjs: (participants: Record<string, ParticipantTransform>, selectedParticipant: string | null) => void
  // 로컬 전용 메서드 (Yjs를 통해서만 업데이트)
  updateParticipantTransform: (id: string, transform: Partial<ParticipantTransform>) => void
  addParticipant: (id: string, initialPosition?: { x: number; y: number }) => void
  removeParticipant: (id: string) => void
  setSelectedParticipant: (id: string | null) => void
  clearAllParticipants: () => void
}

export const createPhotoCanvasSlice: StateCreator<
  PhotoCanvasSlice,
  [],
  [],
  PhotoCanvasSlice
> = (set, get) => ({
  participants: {},
  selectedParticipant: null,

  // Yjs에서 상태를 직접 동기화 (Single Source of Truth)
  syncFromYjs: (participants: Record<string, ParticipantTransform>, selectedParticipant: string | null) => {
    set({ participants, selectedParticipant })
  },

  updateParticipantTransform: (id: string, transform: Partial<ParticipantTransform>) => {
    // 주의: 이 메서드는 직접 호출하지 않고, Yjs를 통해서만 업데이트
    // PhotoCanvas나 ParticipantVideo에서는 updatePhotoCanvasState를 직접 호출
    set((state) => ({
      participants: {
        ...state.participants,
        [id]: {
          ...state.participants[id],
          ...transform,
          lastInteractionTime: Date.now(), // 자동으로 timestamp 추가
        },
      },
    }))
  },

  addParticipant: (id: string, initialPosition?: { x: number; y: number }) => {
    set((state) => {
      if (state.participants[id]) return state

      const participantCount = Object.keys(state.participants).length
      const defaultX = 100 + (participantCount % 3) * 350
      const defaultY = 100 + Math.floor(participantCount / 3) * 280

      const newParticipant: ParticipantTransform = {
        id,
        x: initialPosition?.x ?? defaultX,
        y: initialPosition?.y ?? defaultY,
        width: DEFAULT_PARTICIPANT_CONFIG.width,
        height: DEFAULT_PARTICIPANT_CONFIG.height,
        rotation: DEFAULT_PARTICIPANT_CONFIG.rotation,
        scaleX: DEFAULT_PARTICIPANT_CONFIG.scaleX,
        scaleY: DEFAULT_PARTICIPANT_CONFIG.scaleY,
        lastInteractionTime: Date.now(), // 생성 시간 기록
      }

      return {
        participants: {
          ...state.participants,
          [id]: newParticipant,
        },
      }
    })
  },

  removeParticipant: (id: string) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.participants
      return {
        participants: rest,
        selectedParticipant: state.selectedParticipant === id ? null : state.selectedParticipant,
      }
    })
  },

  setSelectedParticipant: (id: string | null) => {
    set({ selectedParticipant: id })
  },

  clearAllParticipants: () => {
    set({
      participants: {},
      selectedParticipant: null,
    })
  },
})
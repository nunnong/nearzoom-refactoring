import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { CreateRoomData, JoinRoomData } from '@/lib/api/room'

interface RoomStore {
  // 상태
  roomData: CreateRoomData | JoinRoomData | null
  
  // 액션
  setRoomData: (data: CreateRoomData | JoinRoomData) => void
  clearRoomData: () => void
  
  // 헬퍼
  isHost: boolean
  setIsHost: (isHost: boolean) => void
}

export const useRoomStore = create<RoomStore>()(
  devtools(
    persist(
    (set, get) => ({
      // 초기 상태
      roomData: null,
      isHost: false,
      
      // 액션들
      setRoomData: (data) => {
        console.log('Room 데이터 저장:', data)
        set({ roomData: data })
      },
      
      clearRoomData: () => {
        console.log('Room 데이터 삭제')
        set({ roomData: null, isHost: false })
      },
      
      setIsHost: (isHost) => {
        set({ isHost })
      },
    }),
    {
      name: 'room-storage', // sessionStorage 키
      storage: createJSONStorage(() => sessionStorage), // sessionStorage 사용
      
      // 선택적: 특정 필드만 persist
      partialize: (state) => ({
        roomData: state.roomData,
        isHost: state.isHost,
      }),
    }
    ),
    {
      name: 'room-store', // DevTools에서 표시될 이름
    }
  )
)
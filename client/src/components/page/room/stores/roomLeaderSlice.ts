// Room Leader slice types and state management (LiveKit based)

export interface RoomLeaderState {
  roomName: string                  // 방 이름
  currentUsername: string           // 현재 사용자 identity
  roomLeader: string | null         // 현재 방장 identity (LiveKit에서 계산)
  isRoomLeader: boolean            // 현재 사용자가 방장인지 (LiveKit에서 계산)
}

export interface RoomLeaderActions {
  setRoomName: (name: string) => void
  setCurrentUsername: (username: string) => void
  setRoomLeader: (leader: string | null) => void
  setIsRoomLeader: (isLeader: boolean) => void
}

export type RoomLeaderSlice = RoomLeaderState & RoomLeaderActions

export const defaultRoomLeaderState: RoomLeaderState = {
  roomName: '',
  currentUsername: '',
  roomLeader: null,
  isRoomLeader: false,
}

export const createRoomLeaderSlice = (set: any) => ({
  ...defaultRoomLeaderState,
  
  setRoomName: (name: string) =>
    set({ roomName: name }),
    
  setCurrentUsername: (username: string) =>
    set({ currentUsername: username }),
    
  setRoomLeader: (leader: string | null) =>
    set((state: any) => {
      const currentUsername = state.currentUsername || ''
      console.log('👑 Room leader set to:', leader)
      return {
        roomLeader: leader,
        isRoomLeader: leader === currentUsername,
      }
    }),
    
  setIsRoomLeader: (isLeader: boolean) =>
    set({ isRoomLeader: isLeader }),
})
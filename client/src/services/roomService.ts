import { API_ENDPOINTS } from '@/constants/api'
import { api } from '@/lib/api'

interface CreateRoomData {
  title: string
  description?: string
  maxParticipants?: number
}

export const roomService = {
  // 방 생성
  createRoom: async (roomData: CreateRoomData) => {
    const response = await api.post(API_ENDPOINTS.CREATE_ROOM, roomData)
    return response.data
  },

  // 방 목록 가져오기
  getRooms: async () => {
    const response = await api.get('/room/list') // API_ENDPOINTS에 추가 필요
    return response.data
  },

  // 방 정보 가져오기
  getRoom: async (roomId: number) => {
    const response = await api.get(`/room/${roomId}`) // API_ENDPOINTS에 추가 필요
    return response.data
  },

  // 방 참가
  joinRoom: async (roomId: number) => {
    const response = await api.post(`/room/${roomId}/join`) // API_ENDPOINTS에 추가 필요
    return response.data
  },
}

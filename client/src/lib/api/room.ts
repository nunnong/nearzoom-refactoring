import api from '@/lib/axios'

// axios interceptor가 자동으로 토큰 처리하므로 getAuthHeaders 함수 제거

interface ApiResponse<T> {
  error: boolean
  message: string
  data?: T
}

export interface CreateRoomData {
  roomId: number
  serverUrl: string
  participantToken: string
  participantName: string
  createdAt: string
}

export interface JoinRoomData {
  roomId: number
  serverUrl: string
  participantToken: string
  participantName: string
  createdAt: string
}

export interface RoomInfoData {
  roomId: number
  serverUrl: string
  participants: Array<{
    id: string
    name: string
    email: string
    isHost: boolean
  }>
  createdAt: string
  retrievedAt: string
}

export const roomAPI = {
  async createRoom(metadata?: string): Promise<CreateRoomData> {
    try {
      console.log('=== 방 생성 API 호출 시작 ===')

      const response = await api.post('/room/create', metadata || '{}')
      console.log('방 생성 성공 응답:', response.data)

      const result: ApiResponse<CreateRoomData> = response.data

      if (result.error) {
        throw new Error(result.message)
      }

      if (!result.data) {
        throw new Error('방 생성 응답에 데이터가 없습니다')
      }

      return result.data
    } catch (error) {
      console.error('방 생성 api 오류:', error)
      throw error
    }
  },

  async joinRoom(roomId: string | number): Promise<JoinRoomData> {
    try {
      console.log('=== 방 참가 API 호출 시작 ===')
      console.log('참가할 방 ID (원본):', roomId)

      const numericRoomId =
        typeof roomId === 'string' ? parseInt(roomId, 10) : roomId

      if (isNaN(numericRoomId)) {
        throw new Error('유효하지 않은 방 ID입니다')
      }

      console.log('참가할 방 ID (숫자):', numericRoomId)

      const requestBody = { roomId: numericRoomId }
      console.log('요청 본문:', requestBody)

      const response = await api.post('/room/join', requestBody)
      console.log('방 참가 성공 응답:', response.data)

      const result: ApiResponse<JoinRoomData> = response.data

      if (result.error) {
        throw new Error(result.message)
      }

      if (!result.data) {
        throw new Error('방 참가 응답에 데이터가 없습니다')
      }

      return result.data
    } catch (error) {
      console.error('방 참가 api 오류:', error)
      throw error
    }
  },

  async getRoomInfo(roomId: string | number): Promise<RoomInfoData> {
    try {
      console.log('=== 방 정보 조회 API 호출 시작 ===')

      const numericRoomId =
        typeof roomId === 'string' ? parseInt(roomId, 10) : roomId

      if (isNaN(numericRoomId)) {
        throw new Error('유효하지 않은 방 ID입니다')
      }

      console.log('조회할 방 ID (숫자):', numericRoomId)

      const response = await api.get(`/room/${numericRoomId}/info`)
      console.log('방 정보 조회 성공 응답:', response.data)

      const result: ApiResponse<RoomInfoData> = response.data

      if (result.error) {
        throw new Error(result.message)
      }

      if (!result.data) {
        throw new Error('방 정보 조회 응답에 데이터가 없습니다')
      }

      return result.data
    } catch (error) {
      console.error('방 정보 조회 api 오류:', error)
      throw error
    }
  },
}

export const generateRoomUrl = (roomId: number | string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/room/${roomId}`
  }
  return `https://www.nearzoom.store/room/${roomId}`
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return '알 수 없는 오류가 발생했습니다.'
}

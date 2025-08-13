// src/lib/api/room.ts - axios 버전으로 완전히 수정

import api from '@/lib/axios' // 🔥 기존 axios 인스턴스 사용 (인터셉터 포함)
import type { ApiError } from '@/types/auth'

// 🔥 API Response 타입 (백엔드 응답 형식에 맞춤)
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
  // 🔥 방 생성 - axios 사용
  async createRoom(metadata?: string): Promise<CreateRoomData> {
    try {
      console.log('=== 방 생성 API 호출 시작 (axios) ===')
      console.log('메타데이터:', metadata)
      
      // axios 인터셉터가 자동으로 토큰 추가, 갱신 처리
      const response = await api.post<ApiResponse<CreateRoomData>>(
        '/room/create',
        metadata || '{}'
      )

      console.log('방 생성 응답:', response.data)

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      if (!response.data.data) {
        throw new Error('방 생성 응답에 데이터가 없습니다')
      }

      console.log('✅ 방 생성 성공:', response.data.data)
      return response.data.data
    } catch (error) {
      console.error('❌ 방 생성 API 오류:', error)
      
      // axios 인터셉터에서 이미 ApiError로 변환됨
      if (error && typeof error === 'object' && 'message' in error) {
        throw error
      }
      
      throw new Error('방 생성에 실패했습니다.')
    }
  },

  // 🔥 방 참가 - axios 사용
  async joinRoom(roomId: string | number): Promise<JoinRoomData> {
    try {
      console.log('=== 방 참가 API 호출 시작 (axios) ===')
      console.log('참가할 방 ID (원본):', roomId)
      
      const numericRoomId = typeof roomId === 'string' ? parseInt(roomId, 10) : roomId
      
      if (isNaN(numericRoomId)) {
        throw new Error('유효하지 않은 방 ID입니다')
      }
      
      console.log('참가할 방 ID (숫자):', numericRoomId)
      
      // axios 인터셉터가 자동으로 토큰 추가, 갱신 처리
      const response = await api.post<ApiResponse<JoinRoomData>>(
        '/room/join',
        { roomId: numericRoomId }
      )

      console.log('방 참가 응답:', response.data)

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      if (!response.data.data) {
        throw new Error('방 참가 응답에 데이터가 없습니다')
      }

      console.log('✅ 방 참가 성공:', response.data.data)
      return response.data.data
    } catch (error) {
      console.error('❌ 방 참가 API 오류:', error)
      
      // axios 인터셉터에서 이미 ApiError로 변환됨
      if (error && typeof error === 'object' && 'message' in error) {
        throw error
      }
      
      throw new Error('방 참가에 실패했습니다.')
    }
  },

  // 🔥 방 정보 조회 - axios 사용
  async getRoomInfo(roomId: string | number): Promise<RoomInfoData> {
    try {
      console.log('=== 방 정보 조회 API 호출 시작 (axios) ===')
      
      const numericRoomId = typeof roomId === 'string' ? parseInt(roomId, 10) : roomId
      
      if (isNaN(numericRoomId)) {
        throw new Error('유효하지 않은 방 ID입니다')
      }
      
      console.log('조회할 방 ID (숫자):', numericRoomId)
      
      // axios 인터셉터가 자동으로 토큰 추가, 갱신 처리
      const response = await api.get<ApiResponse<RoomInfoData>>(
        `/room/${numericRoomId}/info`
      )

      console.log('방 정보 조회 응답:', response.data)

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      if (!response.data.data) {
        throw new Error('방 정보 조회 응답에 데이터가 없습니다')
      }

      console.log('✅ 방 정보 조회 성공:', response.data.data)
      return response.data.data
    } catch (error) {
      console.error('❌ 방 정보 조회 API 오류:', error)
      
      // axios 인터셉터에서 이미 ApiError로 변환됨
      if (error && typeof error === 'object' && 'message' in error) {
        throw error
      }
      
      throw new Error('방 정보 조회에 실패했습니다.')
    }
  }
}

// 🔥 유틸리티 함수들 (기존과 동일)
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
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as ApiError).message
  }
  return '알 수 없는 오류가 발생했습니다.'
}
import { API_ENDPOINTS } from '@/constants/api'
import api from '@/lib/axios'

// 타입 정의
export interface MyPhotoListCondition {
  heart?: boolean
  partnerEmails?: string[]        // 수정: string[] 타입으로 변경
  startDate?: string             // LocalDate를 문자열로 변환 (YYYY-MM-DD)
  endDate?: string               // LocalDate를 문자열로 변환 (YYYY-MM-DD)
  cursor?: number
  limit?: number
}

export interface MyPhotoResponse {
  photoId: number
  imageUrl: string
  createdAt: string          // "2025-01-12T10:30:00" 형식
  heart: number              // 0 또는 1 (백엔드에서 숫자로 옴)
  editable: boolean          // true: 편집 가능, false: 편집됨
  partnerEmails: string      // "juyy99@gmail.com" 형식
}

export interface MyPhotoListResponse {
  photos: MyPhotoResponse[]
  hasNext: boolean
  nextCursor?: number
}

export interface HeartUpdateRequest {
  photoId: number
  heart: boolean
}

export interface PhotoDeleteRequest {
  photoId: number
}

export interface PhotoEditSaveRequest {
  photoId: number
}

export const myroomService = {
  // 사진 목록 조회 (필터링 및 페이징 지원)
  getPhotos: async (condition: MyPhotoListCondition = {}): Promise<MyPhotoListResponse> => {
    const params = new URLSearchParams()
    
    if (condition.heart !== undefined) {
      params.append('heart', condition.heart.toString())
    }
    
    if (condition.partnerEmails && condition.partnerEmails.length > 0) {
      condition.partnerEmails.forEach(email => {
        params.append('partnerEmails', email)
      })
    }
    
    if (condition.startDate) {
      params.append('startDate', condition.startDate)
    }
    if (condition.endDate) {
      params.append('endDate', condition.endDate)
    }
    if (condition.cursor) {
      params.append('cursor', condition.cursor.toString())
    }
    if (condition.limit) {
      params.append('limit', condition.limit.toString())
    }
    
    const response = await api.get(`${API_ENDPOINTS.PHOTOS}?${params.toString()}`)
    return response.data
  },

  // 사진 좋아요 토글
  updateHeart: async (request: HeartUpdateRequest): Promise<void> => {
    await api.post(API_ENDPOINTS.HEART, request)
  },

  // 사진 삭제
  deletePhoto: async (request: PhotoDeleteRequest): Promise<void> => {
    await api.delete(API_ENDPOINTS.DELETE_PHOTO, { data: request })
  },

  // 편집본 저장 (상태만 변경)
  saveEditedPhoto: async (request: PhotoEditSaveRequest): Promise<void> => {
    await api.post(API_ENDPOINTS.SAVE_EDITED, request)
  },
}
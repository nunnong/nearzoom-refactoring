import { API_ENDPOINTS } from '@/constants/api'
import { api } from '@/lib/api'

// 백엔드 DTO에 맞춘 타입 정의
export interface MyPhotoListCondition {
  cursor?: number | null // 페이징 커서 (이전 요청의 마지막 photoId)
  limit?: number // 한 페이지에 조회할 개수 (기본값: 20)
  heart?: boolean // 좋아요 여부 필터
  partnerEmails?: string[] // 함께 찍은 사용자 이메일 목록
  startDate?: string // 조회 시작일 (YYYY-MM-DD 형식)
  endDate?: string // 조회 종료일 (YYYY-MM-DD 형식)
}

// 백엔드 응답 DTO와 정확히 일치
export interface MyPhotoResponse {
  photoId: number
  imageUrl: string
  createdAt: string // "2025-01-12T10:30:00" 형식
  heart: number // 0 또는 1 (백엔드에서 숫자로 옴)
  editable: boolean // true: 편집 가능, false: 편집됨
  partnerEmails: string // "juyy99@gmail.com" 형식
}

export interface MyPhotoListResponse {
  photos: MyPhotoResponse[]
  hasNext: boolean
  nextCursor?: number | null
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

// 편집된 이미지 URL 저장을 위한 타입 (백엔드 컨트롤러 참고)
export interface PhotoEditSaveUrlRequest {
  imageUrl: string
  originalPhotoId: number
}

// 피드 업로드용 사진 정보 응답 타입
export interface PhotoForFeedUploadResponse {
  photoId: number
  imgUrl: string
  takenAt: string // LocalDateTime -> string
  alreadyInFeed: boolean
}

export const myroomService = {
  // 사진 목록 조회 (필터링 및 페이징 지원)
  getPhotos: async (
    condition: MyPhotoListCondition = {}
  ): Promise<MyPhotoListResponse> => {
    console.log('📸 getPhotos API 호출 - condition:', condition)

    const params = new URLSearchParams()

    if (condition.heart !== undefined) {
      // Boolean 값을 직접 전송 (toString() 사용하지 않음)
      params.append('heart', condition.heart ? 'true' : 'false')
      console.log('💖 Heart filter added:', condition.heart)
    }

    if (condition.partnerEmails && condition.partnerEmails.length > 0) {
      condition.partnerEmails.forEach(email => {
        params.append('partnerEmails', email)
        console.log('👥 Partner email filter added:', email)
      })
    }

    if (condition.startDate) {
      params.append('startDate', condition.startDate)
      console.log('📅 Start date filter added:', condition.startDate)
    }
    if (condition.endDate) {
      params.append('endDate', condition.endDate)
      console.log('📅 End date filter added:', condition.endDate)
    }

    if (condition.cursor) {
      params.append('cursor', condition.cursor.toString())
      console.log('🔍 Cursor added:', condition.cursor)
    }
    if (condition.limit) {
      params.append('limit', condition.limit.toString())
      console.log('📏 Limit added:', condition.limit)
    }

    const finalUrl = `${API_ENDPOINTS.PHOTOS}?${params.toString()}`
    console.log('🌐 Final API URL:', finalUrl)

    try {
      const response = await api.get(finalUrl)
      console.log('✅ getPhotos API 성공:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ getPhotos API 실패:', error)
      throw error
    }
  },

  // 사진 좋아요 토글
  updateHeart: async (request: HeartUpdateRequest): Promise<void> => {
    console.log('🔥 updateHeart API 호출:', request)

    // heart 값을 Boolean으로 확실하게 전송
    const apiRequest = {
      photoId: request.photoId,
      heart: Boolean(request.heart), // Boolean 타입으로 확실하게 변환
    }

    console.log('🚀 API 요청 데이터:', apiRequest)

    try {
      const response = await api.post(API_ENDPOINTS.HEART, apiRequest)
      console.log('✅ updateHeart 성공:', response.data)
    } catch (error) {
      console.error('❌ updateHeart 실패:', error)
      throw error
    }
  },

  // 사진 삭제
  deletePhoto: async (request: PhotoDeleteRequest): Promise<void> => {
    await api.delete(API_ENDPOINTS.DELETE_PHOTO, { data: request })
  },

  // 편집본 저장 (상태만 변경)
  saveEditedPhoto: async (request: PhotoEditSaveUrlRequest): Promise<void> => {
    console.log('💾 saveEditedPhoto API 호출:', request)

    // 백엔드가 기대하는 필드명: imgUrl, originalPhotoId
    const apiRequest = {
      imgUrl: request.imageUrl,
      originalPhotoId: request.originalPhotoId,
    }

    console.log('🚀 API 요청 데이터:', apiRequest)

    try {
      const response = await api.post(API_ENDPOINTS.SAVE_EDITED_URL, apiRequest)
      console.log('✅ saveEditedPhoto 성공:', response.data)
    } catch (error) {
      console.error('❌ saveEditedPhoto 실패:', error)
      throw error
    }
  },
}

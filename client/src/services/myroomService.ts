import api from '@/lib/axios'

// 백엔드 DTO에 맞춘 타입 정의
export interface MyPhotoListCondition {
  cursor?: number                // 페이징 커서
  limit?: number                 // 한 페이지 조회 개수 (기본값: 20)
  heart?: boolean               // 좋아요 필터
  partnerEmails?: string[]      // 함께 찍은 사용자 이메일 목록
  startDate?: string           // 조회 시작일 (YYYY-MM-DD)
  endDate?: string             // 조회 종료일 (YYYY-MM-DD)
}

// 백엔드 응답 DTO와 정확히 일치
export interface MyPhotoResponse {
  photoId: number              // 사진 ID
  imageUrl: string             // 사진 이미지 URL
  createdAt: string            // 사진 생성 시간 (LocalDateTime -> string)
  heart: number                // 하트 수 (Integer: 0 또는 1)
  editable: boolean            // 수정 가능 여부 (true: 편집가능, false: 편집됨)
  partnerEmails: string        // 함께 찍은 사용자 이메일 (콤마로 구분된 문자열)
}

export interface MyPhotoListResponse {
  photos: MyPhotoResponse[]
  hasNext: boolean
  nextCursor: number | null    // 백엔드에서 Long 타입으로 반환
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
  takenAt: string              // LocalDateTime -> string
  alreadyInFeed: boolean
}

export const myroomService = {
  // 사진 목록 조회 (필터링 및 페이징 지원)
  getPhotos: async (condition?: MyPhotoListCondition): Promise<MyPhotoListResponse> => {
    try {
      // 조건이 없으면 기본값으로 처리
      if (!condition) {
        console.log('🔍 조건 없음 - 전체 사진 조회 (기본 20개)')
        const response = await api.get('/myroom/photos', { 
          params: { limit: 20 } 
        })
        console.log('✅ 전체 사진 API 응답:', response.data)
        return response.data
      }

      // 🔥 URLSearchParams 사용하여 배열 파라미터 올바르게 처리
      const params = new URLSearchParams()
      
      if (condition.cursor !== undefined) {
        params.append('cursor', condition.cursor.toString())
      }
      
      if (condition.limit !== undefined) {
        params.append('limit', condition.limit.toString())
      } else {
        params.append('limit', '20')  // 기본값
      }
      
      if (condition.heart !== undefined) {
        params.append('heart', condition.heart.toString())
      }
      
      // 🔥 partnerEmails 배열을 개별적으로 추가 (백엔드 @RequestParam List<String> 처리)
      if (condition.partnerEmails && condition.partnerEmails.length > 0) {
        const cleanEmails = condition.partnerEmails
          .map(email => email.trim())
          .filter(email => email)
        
        cleanEmails.forEach(email => {
          params.append('partnerEmails', email)  // 배열 인덱스 없이 동일한 키로 추가
        })
      }
      
      if (condition.startDate) {
        params.append('startDate', condition.startDate)
      }
      
      if (condition.endDate) {
        params.append('endDate', condition.endDate)
      }
      
      const paramString = params.toString()
      console.log('🔍 API 요청 파라미터 (URLSearchParams):', paramString)
      
      // 🔥 params를 문자열로 변환하여 전달
      const response = await api.get(`/myroom/photos?${paramString}`)
      
      console.log('✅ API 응답:', response.data)
      
      return response.data
    } catch (error) {
      console.error('❌ 사진 목록 조회 실패:', error)
      
    
      
      throw error
    }
  },

  // 사진 좋아요 토글
  updateHeart: async (request: HeartUpdateRequest): Promise<void> => {
    try {
      console.log('💖 하트 업데이트 요청:', request)
      
      const response = await api.post('/myroom/photos/heart', request)
      
      console.log('✅ 하트 업데이트 성공:', response.data)
    } catch (error) {
      console.error('❌ 하트 업데이트 실패:', error)
      throw error
    }
  },

  // 사진 삭제
  deletePhoto: async (request: PhotoDeleteRequest): Promise<void> => {
    try {
      console.log('🗑️ 사진 삭제 요청:', request)
      
      const response = await api.delete('/myroom/photos', { data: request })
      
      console.log('✅ 사진 삭제 성공:', response.data)
    } catch (error) {
      console.error('❌ 사진 삭제 실패:', error)
      throw error
    }
  },

  // 편집본 저장 (원본을 수정 불가 상태로 전환)
  saveEditedPhoto: async (request: PhotoEditSaveRequest): Promise<void> => {
    try {
      console.log('✏️ 편집본 저장 요청:', request)
      
      const response = await api.post('/myroom/photos/save-edited', request)
      
      console.log('✅ 편집본 저장 성공:', response.data)
    } catch (error) {
      console.error('❌ 편집본 저장 실패:', error)
      throw error
    }
  },

  // 편집된 이미지 URL 저장 (백엔드 컨트롤러의 saveEditedImageUrl 엔드포인트)
  saveEditedImageUrl: async (imageUrl: string, originalPhotoId: number): Promise<string> => {
    try {
      console.log('🖼️ 편집된 이미지 URL 저장 요청:', { imageUrl, originalPhotoId })
      
      const response = await api.post('/myroom/photos/save-edited-url', null, {
        params: {
          imageUrl,
          originalPhotoId
        }
      })
      
      console.log('✅ 편집된 이미지 URL 저장 성공:', response.data)
      
      // 백엔드 ApiResponse 구조에 맞게 데이터 추출
      return response.data.data || response.data.message || imageUrl
    } catch (error) {
      console.error('❌ 편집된 이미지 URL 저장 실패:', error)
      throw error
    }
  },

  // 피드 업로드용 사진 정보 조회
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoForFeedUploadResponse> => {
    try {
      console.log('📄 피드 업로드용 사진 정보 조회 요청:', photoId)
      
      const response = await api.get(`/myroom/photos/${photoId}/feed-upload-info`)
      
      console.log('✅ 피드 업로드용 사진 정보 조회 성공:', response.data)
      
      // 백엔드 ApiResponse 구조에 맞게 데이터 추출
      return response.data.data || response.data
    } catch (error) {
      console.error('❌ 피드 업로드용 사진 정보 조회 실패:', error)
      throw error
    }
  }
}

// 🔥 디버깅용 헬퍼 함수
export const debugMyroomService = {
  // 현재 설정 확인
  getCurrentConfig: () => {
    return {
      baseURL: api.defaults.baseURL,
      timeout: api.defaults.timeout,
      headers: api.defaults.headers
    }
  },
  
  // 간단한 연결 테스트
  testConnection: async () => {
    try {
      const response = await api.get('/myroom/photos', { 
        params: { limit: 1 } 
      })
      console.log('✅ 연결 테스트 성공:', response.status)
      return true
    } catch (error) {
      console.error('❌ 연결 테스트 실패:', error)
      return false
    }
  },
  
  // URL 파라미터 테스트
  testUrlParams: (condition: MyPhotoListCondition) => {
    const params = new URLSearchParams()
    
    if (condition.partnerEmails && condition.partnerEmails.length > 0) {
      condition.partnerEmails.forEach(email => {
        params.append('partnerEmails', email)
      })
    }
    
    console.log('🧪 URL 테스트 결과:', params.toString())
    return params.toString()
  }
}
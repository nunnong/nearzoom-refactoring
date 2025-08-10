import { API_ENDPOINTS } from '@/constants/api'
import { api } from '@/lib/api'

export const myroomService = {
  // 사진 목록 가져오기
  getPhotos: async () => {
    const response = await api.get(API_ENDPOINTS.PHOTOS)
    return response.data
  },

  // 사진 좋아요
  likePhoto: async (photoId: number) => {
    const response = await api.post(`${API_ENDPOINTS.LIKE}/${photoId}`)
    return response.data
  },

  // 편집된 사진 저장
  saveEditedPhoto: async (photoData: FormData) => {
    const response = await api.post(API_ENDPOINTS.SAVE_EDITED, photoData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 사진 삭제
  deletePhoto: async (photoId: number) => {
    await api.delete(`${API_ENDPOINTS.PHOTOS}/${photoId}`)
  },
}

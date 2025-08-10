import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'
import type { User } from '@/types/auth'

export const userService = {
  // 사용자 정보 가져오기
  getUserInfo: async (): Promise<User> => {
    const response = await api.get(API_ENDPOINTS.USER_INFO)
    return response.data
  },

  // 사용자 정보 업데이트
  updateUserInfo: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put(API_ENDPOINTS.USER_INFO, userData)
    return response.data
  },

  // 회원 탈퇴
  deleteUser: async (): Promise<void> => {
    await api.delete(API_ENDPOINTS.USER_INFO)
  },
}

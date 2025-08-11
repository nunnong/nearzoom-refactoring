import type { User } from '@/types/auth'

// 백엔드 사용자 응답 타입
interface BackendUserResponse {
  id?: number
  userName?: string
  name?: string
  userEmail?: string
  email?: string
  userProfileImage?: string
  profileImage?: string
  socialType?: string
  createdAt?: string
  updatedAt?: string
}

export const userTransformer = {
  fromBackend: (rawData: BackendUserResponse): User => {
    return {
      id: rawData.id || 0,
      name: rawData.userName || rawData.name || '',
      email: rawData.userEmail || rawData.email || '',
      profileImage: rawData.userProfileImage || rawData.profileImage,
      socialType: (rawData.socialType as 'GOOGLE' | 'KAKAO') || 'GOOGLE',
      createdAt: rawData.createdAt || new Date().toISOString(),
      updatedAt: rawData.updatedAt || new Date().toISOString(),
    }
  }
}
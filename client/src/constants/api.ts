// constants/api.ts
// 백엔드 API 서버 주소
export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.nearzoom.store'
    : 'http://localhost:8080'

// 프론트엔드 콜백 URL
export const FRONTEND_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://nearzoom.store'
    : 'http://localhost:3000' // 프론트엔드 포트

export const API_ENDPOINTS = {
  // Auth
  REFRESH: '/auth/refresh',

  // MyRoom
  PHOTOS: '/myroom/photos',
  HEART: '/myroom/photos/heart',
  DELETE_PHOTO: '/myroom/photos',
  SAVE_EDITED_URL: '/myroom/photos/save-edited-url', // imageUrl, originalPhotoId
  SAVE_FACE_IMAGE: '/user/save-face-image',

  // PhotoPrompt
  PHOTO_SELECTION: '/photoprompt/selection',
  PHOTO_BACKGROUND: '/photoprompt/background',

  // Follow System(피드 쪽)
  FOLLOW: '/follows',
  UNFOLLOW: '/follows',
  FOLLOWING_LIST: '/follows/following',
  FOLLOWERS_LIST: '/follows/followers',
  FOLLOW_CHECK: '/follows/check',

  // Likes (피드 쪽)
  LIKE_PHOTO: '/likes',
  UNLIKE_PHOTO: '/likes',
  LIKE_COUNT: '/likes',

  // User Management
  USER_INFO: '/user/userInfo', // (닉네임, 프로필, 참고 사진)
  LOGOUT: '/user/logout',
  SIGNOUT: '/user/signout',
}

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]
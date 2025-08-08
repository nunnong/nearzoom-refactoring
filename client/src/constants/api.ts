// constants/api.ts
// 백엔드 API 서버 주소
export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://nearzoom.store'
    : 'http://localhost:8080'

// 프론트엔드 콜백 URL (백엔드가 리다이렉트할 주소)
export const FRONTEND_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://nearzoom.store'
    : 'http://localhost:3000'

export const API_ENDPOINTS = {
  // Auth
  REFRESH: '/auth/refresh',

  // MyRoom
  PHOTOS: '/myroom/photos',
  LIKE: '/myroom/photos/like',
  SAVE_EDITED: '/myroom/photos/save-edited',

  // Room
  CREATE_ROOM: '/room/create',

  // PhotoPrompt -> 프론트에서 호출하나???
  PHOTO_SELECTION: '/photoprompt/selection',
  PHOTO_BACKGROUND: '/photoprompt/background',

  // Users
  USER_INFO: '/user/userInfo',
  LOGOUT: '/user/logout',
}

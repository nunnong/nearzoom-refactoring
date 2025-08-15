// constants/api.ts
// 백엔드 API 서버 주소
export const API_BASE_URL = 'https://api.nearzoom.store'

// 프론트엔드 콜백 URL
export const FRONTEND_BASE_URL = 'https://nearzoom.store'

export const API_ENDPOINTS = {
  // Auth
  REFRESH: '/auth/refresh',

  // MyRoom
  PHOTOS: '/myroom/photos',
  HEART: '/myroom/photos/heart',
  DELETE_PHOTO: '/myroom/photos',
  SAVE_EDITED: '/myroom/photos/save-edited',
  SAVE_FACE_IMAGE: '/user/save-face-image',
  IMAGE_PROXY: '/myroom/image', // 이미지 프록시 엔드포인트

  // Room (회의룸)
  CREATE_ROOM: '/room/create',

  // PhotoPrompt
  PHOTO_SELECTION: '/photoprompt/selection',
  PHOTO_BACKGROUND: '/photoprompt/image/background',

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

  // Feeds
  FEEDS: '/feeds',
  FEED_DETAIL: '/feeds',

  // User Management
  USER_INFO: '/user/userInfo',
  EMAIL_USER_INFO: '/user/email-user-info',
  LOGOUT: '/user/logout',
  SIGNOUT: '/user/signout',
}

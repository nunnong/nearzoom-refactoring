// constants/api.ts
// nearzoom.store로 강제 설정
// export const API_BASE_URL = 'https://api.nearzoom.store'
export const API_BASE_URL = 'http://localhost:8080'

// nearzoom.store로 강제 설정
// export const FRONTEND_BASE_URL = 'https://nearzoom.store'
export const FRONTEND_BASE_URL = 'http://localhost:3000'

export const API_ENDPOINTS = {
  // Auth
  REFRESH: '/auth/refresh',

  // MyRoom
  PHOTOS: '/myroom/photos',
  HEART: '/myroom/photos/heart',
  DELETE_PHOTO: '/myroom/photos',
  SAVE_EDITED: '/myroom/photos/save-edited',
  SAVE_EDITED_URL: '/myroom/photos/save-edited-url', // 추가
  FEED_UPLOAD_INFO: '/myroom/photos',
  SAVE_FACE_IMAGE: '/user/save-face-image',
  IMAGE_PROXY: '/myroom/image', //

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

  // User Management
  USER_INFO: '/user/userInfo', // (닉네임, 이메일, 프로필, 참고 사진)
  LOGOUT: '/user/logout',
  SIGNOUT: '/user/signout',
}

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]

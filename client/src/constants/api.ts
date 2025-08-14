// constants/api.ts
// 백엔드 API 서버 주소
export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.nearzoom.store'
    : 'http://localhost:8080' // 개발 환경에서 백엔드 포트

// 프론트엔드 콜백 URL
export const FRONTEND_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://nearzoom.store' // 프론트엔드 포트
    : 'http://localhost:3000' 

export const API_ENDPOINTS = {
  // Auth
  REFRESH: '/auth/refresh',

  // MyRoom
  PHOTOS: '/myroom/photos',
  HEART: '/myroom/photos/heart',
  DELETE_PHOTO: '/myroom/photos',
  SAVE_EDITED: '/myroom/photos/save-edited',
  SAVE_EDITED_URL: '/myroom/photos/save-edited-url',  // 추가
  FEED_UPLOAD_INFO: '/myroom/photos',
  SAVE_FACE_IMAGE: '/user/save-face-image',
  IMAGE_PROXY: '/myroom/image', // 이미지 프록시 엔드포인트

  // Room (회의룸)
  CREATE_ROOM: '/room/create',

  // PhotoPrompt
  PHOTO_SELECTION: '/photoprompt/selection',
  PHOTO_BACKGROUND: '/photoprompt/background',

  // 🔥 백엔드 FeedController - @RequestMapping("/feeds")
  FEEDS: '/feeds',
  FEED_DETAIL: '/feeds',  // GET /feeds/{feedId}
  USER_FEEDS: '/feeds/users',  // GET /feeds/users/{userId}
  FOLLOWING_FEEDS: '/feeds/following',  // GET /feeds/following
  RANDOM_FEEDS: '/feeds/random',  // GET /feeds/random
  SEARCH_FEEDS: '/feeds/search',  // GET /feeds/search

  // 🔥 백엔드 FollowController - @RequestMapping("follows") (주의: "follows"임)
  FOLLOWS: '/follows',  // POST/DELETE /follows/{followeeId}
  FOLLOW_FOLLOWING: '/follows/following',  // GET /follows/following/{userId}
  FOLLOW_FOLLOWERS: '/follows/followers',  // GET /follows/followers/{userId}
  FOLLOW_COUNT: '/follows/count',  // GET /follows/count/{userId}
  FOLLOW_CHECK: '/follows/check',  // GET /follows/check/{followeeId}

  // 🔥 백엔드 LikesController - @RequestMapping("/likes")
  LIKES: '/likes',  // POST/DELETE /likes/{feedId}
  LIKE_CHECK: '/likes/check',  // GET /likes/check/{feedId}

  // 🔥 백엔드 UserController - @RequestMapping("user")
  USER: '/user',
  USER_INFO: '/user/userInfo',  // GET /user/userInfo
  USER_LOGOUT: '/user/logout',  // POST /user/logout
  USER_SIGNOUT: '/user/signout',  // DELETE /user/signout

  // 기존 호환성 유지용 (기존 코드에서 사용 중인 것들)
  FOLLOW: '/follows',  // FOLLOWS와 동일
  UNFOLLOW: '/follows',  // FOLLOWS와 동일
  FOLLOWING_LIST: '/follows/following',  // FOLLOW_FOLLOWING과 동일
  FOLLOWERS_LIST: '/follows/followers',  // FOLLOW_FOLLOWERS와 동일
  LIKE_PHOTO: '/likes',  // LIKES와 동일
  UNLIKE_PHOTO: '/likes',  // LIKES와 동일
  LIKE_COUNT: '/likes',  // LIKES와 동일
  EMAIL_USER_INFO: '/user/email-user-info',
  LOGOUT: '/user/logout',
  SIGNOUT: '/user/signout',
}

// 🔥 타입 안전성을 위한 타입 export
export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]
// 애플리케이션 상수

/**
 * API 관련 상수
 */
export const API = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  TIMEOUT: 10000,
} as const

/**
 * 애플리케이션 설정
 */
export const APP_CONFIG = {
  NAME: 'A605 공통 프로젝트',
  VERSION: '1.0.0',
  DESCRIPTION: 'Next.js 기반 프론트엔드 애플리케이션',
} as const

/**
 * 테마 관련 상수
 */
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  USER: 'user',
  TOKEN: 'token',
} as const

/**
 * 테스트 이미지 데이터
 */
export const TEST_IMAGES = [
  {
    id: '1',
    src: '/test.jpg',
    alt: '테스트 이미지 1',
    isEdited: false,
    hashtags: ['2024.01.15', '민수', '영희'],
  },
  {
    id: '2',
    src: '/test2.jpg',
    alt: '테스트 이미지 2',
    isEdited: false,
    hashtags: ['2024.01.20', '철수'],
  },
  {
    id: '3',
    src: '/test3.jpg',
    alt: '테스트 이미지 3',
    isEdited: false,
    hashtags: ['2024.02.01', '엄마', '아빠', '지현'],
  },
  {
    id: '4',
    src: '/test4.jpg',
    alt: '테스트 이미지 4',
    isEdited: false,
    hashtags: ['2024.02.14', '수진'],
  },
  {
    id: '5',
    src: '/test5.jpg',
    alt: '테스트 이미지 5',
    isEdited: false,
    hashtags: ['2024.02.28', '현우', '소영', '재민'],
  },
  {
    id: '6',
    src: '/test6.jpg',
    alt: '테스트 이미지 6',
    isEdited: false,
    hashtags: ['2024.03.10', '은지', '태희'],
  },
  {
    id: '7',
    src: '/test7.jpg',
    alt: '테스트 이미지 7',
    isEdited: false,
    hashtags: ['2024.03.22', '동현', '미나', '준호', '서연'],
  },
  {
    id: '8',
    src: '/test8.png',
    alt: '테스트 이미지 8',
    isEdited: false,
    hashtags: ['2024.04.01', '용훈'],
  },
]

export const EMAIL_LIST = [
  'acetip@naver.com',
  'juyy99@gmail.com',
  'dnlwlgns1117@gmail.com',
  't25kwon@gmail.com',
  'sojung0734@naver.com',
  'jieun8764@gmail.com ',
]

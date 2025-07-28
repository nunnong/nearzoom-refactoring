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
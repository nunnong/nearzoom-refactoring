// src/lib/api/types.ts

// ============================================================================
// 🔥 백엔드 API 응답 타입 정의
// ============================================================================

/**
 * 백엔드 표준 API 응답 형식
 * {
 *   "error": boolean,
 *   "message": string,
 *   "data": T
 * }
 */
export interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

/**
 * 에러 응답 타입
 */
export interface ApiError {
  error: true
  message: string
  data?: null
}

/**
 * 성공 응답 타입
 */
export interface ApiSuccess<T> {
  error: false
  message: string
  data: T
}
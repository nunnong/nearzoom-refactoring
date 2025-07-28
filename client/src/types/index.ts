// 공통 타입 정의

/**
 * 기본 컴포넌트 Props
 */
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  data: T
  message: string
  success: boolean
}

/**
 * 페이지네이션 타입
 */
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * 로딩 상태 타입
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'
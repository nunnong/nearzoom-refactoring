'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  
  // 🔥 백엔드 연동 액션
  apiEndpoint?: string          // API 호출 엔드포인트
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  apiData?: any                 // API 요청 데이터
  onApiSuccess?: (data: any) => void  // API 성공 콜백
  onApiError?: (error: string) => void // API 에러 콜백
  confirmRequired?: boolean     // 확인 필요 여부
  confirmMessage?: string       // 확인 메시지
  loading?: boolean             // 로딩 상태
}

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'api-error' | 'api-success'
  title: string
  message?: string
  duration?: number
  onRemove: (id: string) => void
  actions?: ToastAction[]
  customIcon?: React.ComponentType<{ className?: string }>
  showProgress?: boolean
  pauseOnHover?: boolean
  
  // 🔥 백엔드 연동 관련 props
  apiContext?: {
    endpoint?: string           // 관련 API 엔드포인트
    method?: string            // HTTP 메서드
    requestId?: string         // 요청 ID (재시도용)
    timestamp?: number         // 요청 시간
  }
  retryable?: boolean          // 재시도 가능 여부
  onRetry?: () => Promise<void> // 재시도 함수
  showDetails?: boolean        // 상세 정보 표시
  details?: string             // 상세 오류 정보
  persistent?: boolean         // 지속적 표시 (자동 사라지지 않음)
}

// 백엔드 연동용 토스트 생성 헬퍼
export interface CreateToastOptions {
  type: ToastProps['type']
  title: string
  message?: string
  apiContext?: ToastProps['apiContext']
  retryable?: boolean
  onRetry?: () => Promise<void>
  actions?: ToastAction[]
  duration?: number
  persistent?: boolean
}

// ============================================================================
// Toast 컴포넌트 (백엔드 연동 최적화)
// ============================================================================

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onRemove,
  actions,
  customIcon,
  showProgress = true,
  pauseOnHover = true,
  
  // 🔥 백엔드 연동 props
  apiContext,
  retryable = false,
  onRetry,
  showDetails = false,
  details,
  persistent = false,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isExpanded, setIsExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)

  // 🔥 지속적 토스트는 자동으로 사라지지 않음
  const effectiveDuration = persistent || type === 'loading' ? 0 : duration

  // ============================================================================
  // 타이머 관리
  // ============================================================================

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  const startTimer = useCallback((remainingTime: number = effectiveDuration) => {
    if (remainingTime <= 0) return // 지속적 토스트는 타이머 없음
    
    clearTimers()
    startTimeRef.current = Date.now()
    
    // 자동 제거 타이머
    timerRef.current = setTimeout(() => {
      handleClose()
    }, remainingTime)

    // 프로그레스 바 업데이트
    if (showProgress) {
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const newProgress = Math.max(0, ((remainingTime - elapsed) / remainingTime) * 100)
        setProgress(newProgress)
        
        if (newProgress <= 0) {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current)
            progressTimerRef.current = null
          }
        }
      }, 50)
    }
  }, [effectiveDuration, showProgress])

  const pauseTimer = useCallback(() => {
    if (!pauseOnHover || isPaused || effectiveDuration <= 0) return
    
    setIsPaused(true)
    pauseTimeRef.current = Date.now()
    clearTimers()
  }, [pauseOnHover, isPaused, effectiveDuration, clearTimers])

  const resumeTimer = useCallback(() => {
    if (!pauseOnHover || !isPaused || effectiveDuration <= 0) return
    
    setIsPaused(false)
    const pausedDuration = Date.now() - pauseTimeRef.current
    const elapsed = pauseTimeRef.current - startTimeRef.current
    const remainingTime = effectiveDuration - elapsed
    
    if (remainingTime > 0) {
      startTimer(remainingTime)
    }
  }, [pauseOnHover, isPaused, effectiveDuration, startTimer])

  // ============================================================================
  // 백엔드 연동 액션 처리
  // ============================================================================

  const handleActionClick = useCallback(async (action: ToastAction, index: number) => {
    // 확인이 필요한 경우
    if (action.confirmRequired && action.confirmMessage) {
      if (!window.confirm(action.confirmMessage)) {
        return
      }
    }

    // API 호출이 있는 경우
    if (action.apiEndpoint) {
      setActionLoading(prev => ({ ...prev, [index]: true }))
      
      try {
        console.log(`=== Toast Action API 호출 ===`, {
          endpoint: action.apiEndpoint,
          method: action.apiMethod,
          data: action.apiData
        })

        let response: any

        switch (action.apiMethod) {
          case 'GET':
            response = await api.get<ApiResponse<any>>(action.apiEndpoint)
            break
          case 'POST':
            response = await api.post<ApiResponse<any>>(action.apiEndpoint, action.apiData)
            break
          case 'PUT':
            response = await api.put<ApiResponse<any>>(action.apiEndpoint, action.apiData)
            break
          case 'DELETE':
            response = await api.delete<ApiResponse<any>>(action.apiEndpoint)
            break
          default:
            throw new Error(`지원하지 않는 HTTP 메서드: ${action.apiMethod}`)
        }

        if (response.data.error) {
          throw new Error(response.data.message)
        }

        console.log('=== Toast Action API 성공 ===', response.data.data)
        action.onApiSuccess?.(response.data.data)

        // API 성공 시 토스트 닫기
        handleClose()

      } catch (error) {
        console.error('Toast Action API 실패:', error)
        const errorMessage = error instanceof Error ? error.message : 'API 호출에 실패했습니다.'
        action.onApiError?.(errorMessage)
      } finally {
        setActionLoading(prev => ({ ...prev, [index]: false }))
      }
    } else {
      // 일반 onClick 처리
      action.onClick()
    }
  }, [])

  // 🔥 백엔드 연동 재시도 핸들러
  const handleRetry = useCallback(async () => {
    if (!onRetry) return

    try {
      await onRetry()
      console.log('=== Toast 재시도 성공 ===')
      handleClose()
    } catch (error) {
      console.error('Toast 재시도 실패:', error)
      // 재시도 실패는 별도 처리하지 않음 (기존 토스트 유지)
    }
  }, [onRetry])

  // ============================================================================
  // 초기화 및 정리
  // ============================================================================

  useEffect(() => {
    setIsVisible(true)
    if (effectiveDuration > 0) {
      startTimer()
    }

    return () => {
      clearTimers()
    }
  }, [startTimer, clearTimers, effectiveDuration])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    clearTimers()
    setTimeout(() => {
      onRemove(id)
    }, 300)
  }, [id, onRemove, clearTimers])

  // ============================================================================
  // 스타일 및 아이콘 설정
  // ============================================================================

  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      progressColor: 'bg-yellow-500',
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      progressColor: 'bg-blue-500',
    },
    // 🔥 백엔드 연동 전용 타입들
    loading: {
      icon: () => (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
      ),
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      progressColor: 'bg-blue-500',
    },
    'api-error': {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      progressColor: 'bg-red-500',
    },
    'api-success': {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      progressColor: 'bg-green-500',
    },
  } as const

  const config = typeConfig[type]
  const Icon = customIcon || config.icon

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm transform rounded-lg border shadow-lg transition-all duration-300 ${
        config.bgColor
      } ${config.borderColor} ${
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Progress bar (지속적 토스트는 표시 안함) */}
      {showProgress && effectiveDuration > 0 && !persistent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${config.progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className={`p-4 ${showProgress && effectiveDuration > 0 && !persistent ? 'pt-5' : ''}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.titleColor}`}>{title}</p>
            {message && (
              <p className={`mt-1 text-sm ${config.messageColor}`}>{message}</p>
            )}

            {/* 🔥 API 컨텍스트 정보 */}
            {apiContext && (isExpanded || showDetails) && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                <div>엔드포인트: {apiContext.endpoint}</div>
                {apiContext.method && <div>메서드: {apiContext.method}</div>}
                {apiContext.requestId && <div>요청 ID: {apiContext.requestId}</div>}
                {apiContext.timestamp && (
                  <div>시간: {new Date(apiContext.timestamp).toLocaleTimeString()}</div>
                )}
              </div>
            )}

            {/* 🔥 상세 오류 정보 */}
            {details && (isExpanded || showDetails) && (
              <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                {details}
              </div>
            )}
            
            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* 🔥 재시도 버튼 (백엔드 연동) */}
              {retryable && onRetry && (
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  🔄 다시 시도
                </button>
              )}

              {/* 일반 액션들 */}
              {actions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleActionClick(action, index)}
                  disabled={actionLoading[index]}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                    action.variant === 'primary'
                      ? `${config.iconColor} bg-white hover:bg-gray-50 border border-current`
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {actionLoading[index] ? (
                    <div className="flex items-center">
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                      처리 중...
                    </div>
                  ) : (
                    action.label
                  )}
                </button>
              ))}

              {/* 🔥 상세 정보 토글 */}
              {(apiContext || details) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {isExpanded ? '간단히' : '상세히'}
                </button>
              )}
            </div>
          </div>
          
          {/* 닫기 버튼 */}
          <div className="ml-4 flex flex-shrink-0">
            <button
              className="inline-flex rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              onClick={handleClose}
              aria-label="알림 닫기"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 지속적 토스트 표시 */}
      {persistent && (
        <div className="absolute top-2 right-8">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
            지속
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Toast Container 컴포넌트 (백엔드 연동 최적화)
// ============================================================================

interface ToastContainerProps {
  toasts: ToastProps[]
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxToasts?: number
  groupByType?: boolean  // 🔥 타입별 그룹화
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
  maxToasts = 5,
  groupByType = false,
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  } as const

  // 🔥 타입별 그룹화 및 우선순위 정렬
  const processedToasts = React.useMemo(() => {
    let sortedToasts = [...toasts]

    if (groupByType) {
      // 우선순위: loading > error/api-error > warning > success/api-success > info
      const typePriority = {
        loading: 1,
        error: 2,
        'api-error': 2,
        warning: 3,
        success: 4,
        'api-success': 4,
        info: 5,
      } as const

      sortedToasts.sort((a, b) => {
        const priorityA = typePriority[a.type] || 99
        const priorityB = typePriority[b.type] || 99
        return priorityA - priorityB
      })
    }

    return sortedToasts.slice(0, maxToasts)
  }, [toasts, maxToasts, groupByType])

  return (
    <div 
      className={`pointer-events-none fixed z-50 flex flex-col space-y-2 ${positionClasses[position]}`}
      aria-live="polite"
      aria-label="알림"
    >
      {processedToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// ============================================================================
// 백엔드 연동 편의 함수들
// ============================================================================

// 🔥 백엔드 API 에러용 토스트 생성
export const createApiErrorToast = (
  error: string,
  apiContext?: ToastProps['apiContext'],
  retryFn?: () => Promise<void>
): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'api-error',
  title: 'API 오류',
  message: error,
  apiContext,
  retryable: !!retryFn,
  onRetry: retryFn,
  duration: 8000, // 에러는 좀 더 오래 표시
  showDetails: true,
})

// 🔥 백엔드 API 성공용 토스트 생성
export const createApiSuccessToast = (
  message: string,
  apiContext?: ToastProps['apiContext']
): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'api-success',
  title: '성공',
  message,
  apiContext,
  duration: 3000, // 성공은 짧게 표시
})

// 🔥 백엔드 로딩용 토스트 생성
export const createLoadingToast = (
  message: string,
  apiContext?: ToastProps['apiContext']
): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'loading',
  title: '처리 중...',
  message,
  apiContext,
  persistent: true, // 로딩은 지속적 표시
  showProgress: false,
})

export default Toast
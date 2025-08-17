// src/components/ui/Toast.tsx - 간단한 백엔드 연동

'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

// ============================================================================
// 간단한 타입 정의
// ============================================================================

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  title: string
  message?: string
  duration?: number
  onRemove: (id: string) => void
  showProgress?: boolean
  persistent?: boolean
}

// ============================================================================
// Toast 컴포넌트 (간단 버전)
// ============================================================================

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onRemove,
  showProgress = true,
  persistent = false,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 지속적 토스트는 자동으로 사라지지 않음
  const effectiveDuration = persistent || type === 'loading' ? 0 : duration

  // ============================================================================
  // 타이머 관리
  // ============================================================================

  const startTimer = useCallback(() => {
    if (effectiveDuration <= 0) return

    timerRef.current = setTimeout(() => {
      handleClose()
    }, effectiveDuration)

    // 프로그레스 바
    if (showProgress) {
      const startTime = Date.now()
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.max(0, ((effectiveDuration - elapsed) / effectiveDuration) * 100)
        setProgress(newProgress)
        
        if (newProgress <= 0) {
          clearInterval(progressInterval)
        }
      }, 50)
    }
  }, [effectiveDuration, showProgress])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    setTimeout(() => {
      onRemove(id)
    }, 300)
  }, [id, onRemove])

  // ============================================================================
  // 초기화
  // ============================================================================

  useEffect(() => {
    setIsVisible(true)
    startTimer()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [startTimer])

  // ============================================================================
  // 스타일 설정
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
  } as const

  const config = typeConfig[type]
  const Icon = config.icon

  // ============================================================================
  // 렌더링
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
      role="alert"
    >
      {/* Progress bar */}
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
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.titleColor}`}>{title}</p>
            {message && (
              <p className={`mt-1 text-sm ${config.messageColor}`}>{message}</p>
            )}
          </div>
          
          {/* 닫기 버튼 */}
          <div className="ml-4 flex flex-shrink-0">
            <button
              className="inline-flex rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              onClick={handleClose}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 지속적 토스트 표시 */}
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
// Toast Container 컴포넌트
// ============================================================================

interface ToastContainerProps {
  toasts: ToastProps[]
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxToasts?: number
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  } as const

  const displayToasts = toasts.slice(0, maxToasts)

  return (
    <div className={`pointer-events-none fixed z-50 flex flex-col space-y-2 ${positionClasses[position]}`}>
      {displayToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// ============================================================================
// 편의 함수들 (백엔드 연동용)
// ============================================================================

// 성공 토스트
export const createSuccessToast = (title: string, message?: string): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'success',
  title,
  message,
  duration: 3000,
})

// 에러 토스트
export const createErrorToast = (title: string, message?: string): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'error',
  title,
  message,
  duration: 5000,
})

// 경고 토스트
export const createWarningToast = (title: string, message?: string): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'warning',
  title,
  message,
  duration: 4000,
})

// 정보 토스트
export const createInfoToast = (title: string, message?: string): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'info',
  title,
  message,
  duration: 4000,
})

// 로딩 토스트
export const createLoadingToast = (title: string, message?: string): Omit<ToastProps, 'id' | 'onRemove'> => ({
  type: 'loading',
  title,
  message,
  persistent: true,
  showProgress: false,
})

// ============================================================================
// Toast Hook (상태 관리)
// ============================================================================

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onRemove'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastProps = {
      ...toast,
      id,
      onRemove: removeToast,
    }
    
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const removeAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // 편의 메서드들
  const success = useCallback((title: string, message?: string) => {
    return addToast(createSuccessToast(title, message))
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    return addToast(createErrorToast(title, message))
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    return addToast(createWarningToast(title, message))
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    return addToast(createInfoToast(title, message))
  }, [addToast])

  const loading = useCallback((title: string, message?: string) => {
    return addToast(createLoadingToast(title, message))
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
    loading,
  }
}

export default Toast
'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  onRemove: (id: string) => void
  actions?: ToastAction[]
  customIcon?: React.ComponentType<{ className?: string }>
  showProgress?: boolean
  pauseOnHover?: boolean
}

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
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)

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

  const startTimer = useCallback((remainingTime: number = duration) => {
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
  }, [duration, showProgress])

  const pauseTimer = useCallback(() => {
    if (!pauseOnHover || isPaused) return
    
    setIsPaused(true)
    pauseTimeRef.current = Date.now()
    clearTimers()
  }, [pauseOnHover, isPaused, clearTimers])

  const resumeTimer = useCallback(() => {
    if (!pauseOnHover || !isPaused) return
    
    setIsPaused(false)
    const pausedDuration = Date.now() - pauseTimeRef.current
    const elapsed = pauseTimeRef.current - startTimeRef.current
    const remainingTime = duration - elapsed
    
    if (remainingTime > 0) {
      startTimer(remainingTime)
    }
  }, [pauseOnHover, isPaused, duration, startTimer])

  useEffect(() => {
    // 진입 애니메이션
    setIsVisible(true)
    startTimer()

    return () => {
      clearTimers()
    }
  }, [startTimer, clearTimers])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    clearTimers()
    setTimeout(() => {
      onRemove(id)
    }, 300)
  }, [id, onRemove, clearTimers])

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
  } as const

  const config = typeConfig[type]
  const Icon = customIcon || config.icon

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
      {/* Progress bar */}
      {showProgress && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${config.progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className={`p-4 ${showProgress ? 'pt-5' : ''}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.titleColor}`}>{title}</p>
            {message && (
              <p className={`mt-1 text-sm ${config.messageColor}`}>{message}</p>
            )}
            
            {/* Actions */}
            {actions && actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      action.variant === 'primary'
                        ? `${config.iconColor} bg-white hover:bg-gray-50 border border-current`
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
    </div>
  )
}

// Toast Container 컴포넌트
interface ToastContainerProps {
  toasts: ToastProps[]
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
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
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  } as const

  // 최대 토스트 수 제한
  const visibleToasts = toasts.slice(0, maxToasts)

  return (
    <div 
      className={`pointer-events-none fixed z-50 flex flex-col space-y-2 ${positionClasses[position]}`}
      aria-live="polite"
      aria-label="알림"
    >
      {visibleToasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

export default Toast
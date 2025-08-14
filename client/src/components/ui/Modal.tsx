'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { ApiLoadingSpinner } from './LoadingSpinner'

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

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean

  // 🔥 백엔드 연동을 위한 추가 props
  type?: 'default' | 'confirm' | 'form' | 'loading' | 'error' | 'success'
  variant?: 'default' | 'destructive' | 'warning' | 'info'
  
  // API 관련
  isLoading?: boolean
  loadingText?: string
  onConfirm?: () => Promise<void> | void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  disableConfirm?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
  
  // 백엔드 연동 상황
  apiEndpoint?: string
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  apiData?: any
  onApiSuccess?: (data: any) => void
  onApiError?: (error: string) => void
  
  // 유틸리티
  persistent?: boolean  // 사용자가 닫을 수 없는 모달 (API 처리 중 등)
  maxHeight?: string
  scrollable?: boolean
}

// ============================================================================
// Modal 컴포넌트 (백엔드 연동 최적화)
// ============================================================================

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,

  // 🔥 백엔드 연동 props
  type = 'default',
  variant = 'default',
  isLoading = false,
  loadingText = 'API 호출 중...',
  onConfirm,
  onCancel,
  confirmText = '확인',
  cancelText = '취소',
  disableConfirm = false,
  autoClose = false,
  autoCloseDelay = 3000,
  
  // API 관련
  apiEndpoint,
  apiMethod = 'POST',
  apiData,
  onApiSuccess,
  onApiError,
  
  // 유틸리티
  persistent = false,
  maxHeight,
  scrollable = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  
  // ============================================================================
  // 백엔드 연동 상태 관리
  // ============================================================================
  
  const [internalLoading, setInternalLoading] = useState(false)
  const [apiResult, setApiResult] = useState<{ success?: any; error?: string } | null>(null)

  // 최종 로딩 상태 (외부 prop 또는 내부 상태)
  const finalLoading = isLoading || internalLoading

  // ============================================================================
  // 백엔드 API 호출 함수
  // ============================================================================

  const callBackendAPI = useCallback(async () => {
    if (!apiEndpoint) return

    setInternalLoading(true)
    setApiResult(null)

    try {
      console.log(`=== Modal API 호출 시작 ===`, {
        endpoint: apiEndpoint,
        method: apiMethod,
        data: apiData
      })

      let response: any

      switch (apiMethod) {
        case 'GET':
          response = await api.get<ApiResponse<any>>(apiEndpoint)
          break
        case 'POST':
          response = await api.post<ApiResponse<any>>(apiEndpoint, apiData)
          break
        case 'PUT':
          response = await api.put<ApiResponse<any>>(apiEndpoint, apiData)
          break
        case 'DELETE':
          response = await api.delete<ApiResponse<any>>(apiEndpoint)
          break
        default:
          throw new Error(`지원하지 않는 HTTP 메서드: ${apiMethod}`)
      }

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      console.log('=== Modal API 호출 성공 ===', response.data.data)

      setApiResult({ success: response.data.data })
      onApiSuccess?.(response.data.data)

      // 성공 시 자동 닫기
      if (autoClose) {
        setTimeout(() => {
          onClose()
        }, autoCloseDelay)
      }

    } catch (error) {
      console.error('Modal API 호출 실패:', error)
      const errorMessage = error instanceof Error ? error.message : 'API 호출에 실패했습니다.'
      
      setApiResult({ error: errorMessage })
      onApiError?.(errorMessage)
    } finally {
      setInternalLoading(false)
    }
  }, [apiEndpoint, apiMethod, apiData, onApiSuccess, onApiError, autoClose, autoCloseDelay, onClose])

  // ============================================================================
  // 접근성 및 포커스 관리
  // ============================================================================

  // 포커스 트랩을 위한 포커스 가능한 요소들 선택자
  const focusableElementsSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="email"]:not([disabled])',
    'input[type="password"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ')

  // 포커스 트랩 구현
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current || e.key !== 'Tab') return

    const focusableElements = modalRef.current.querySelectorAll(focusableElementsSelector)
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [focusableElementsSelector])

  // ESC 키 처리 (persistent 모달이거나 로딩 중일 때는 무시)
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape && !persistent && !finalLoading) {
      onClose()
    }
  }, [closeOnEscape, onClose, persistent, finalLoading])

  // 배경 클릭 처리 (persistent 모달이거나 로딩 중일 때는 무시)
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick && !persistent && !finalLoading) {
      onClose()
    }
  }, [closeOnBackdropClick, onClose, persistent, finalLoading])

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 확인 버튼 핸들러
  const handleConfirm = useCallback(async () => {
    try {
      if (apiEndpoint) {
        // API 호출이 설정된 경우
        await callBackendAPI()
      } else if (onConfirm) {
        // 커스텀 확인 로직
        await onConfirm()
      } else {
        // 기본 동작 (모달 닫기)
        onClose()
      }
    } catch (error) {
      console.error('확인 처리 중 오류:', error)
    }
  }, [apiEndpoint, callBackendAPI, onConfirm, onClose])

  // 취소 버튼 핸들러
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      onClose()
    }
  }, [onCancel, onClose])

  // ============================================================================
  // 모달 열림/닫힘 효과
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      // 현재 포커스된 요소 저장
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // 이벤트 리스너 등록
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', trapFocus)
      
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden'
      
      // 첫 번째 포커스 가능한 요소에 포커스
      setTimeout(() => {
        if (!finalLoading) {
          const firstFocusable = modalRef.current?.querySelector(focusableElementsSelector) as HTMLElement
          firstFocusable?.focus()
        }
      }, 100)
    } else {
      // 이벤트 리스너 제거
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', trapFocus)
      
      // 배경 스크롤 복원
      document.body.style.overflow = 'unset'
      
      // 이전 포커스 복원
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }

      // 결과 초기화
      setApiResult(null)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape, trapFocus, focusableElementsSelector, finalLoading])

  // ============================================================================
  // 스타일 클래스 계산
  // ============================================================================

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4 h-full max-h-screen',
  } as const

  const variantClasses = {
    default: 'border-gray-200',
    destructive: 'border-red-200',
    warning: 'border-yellow-200',
    info: 'border-blue-200',
  } as const

  const getHeaderColor = () => {
    switch (variant) {
      case 'destructive': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'info': return 'bg-blue-50 border-blue-200'
      default: return 'bg-white border-gray-200'
    }
  }

  const getTitleColor = () => {
    switch (variant) {
      case 'destructive': return 'text-red-900'
      case 'warning': return 'text-yellow-900'
      case 'info': return 'text-blue-900'
      default: return 'text-gray-900'
    }
  }

  // ============================================================================
  // Footer 렌더링 (타입별)
  // ============================================================================

  const renderFooter = () => {
    if (footer) return footer

    if (type === 'confirm' || type === 'form' || onConfirm || apiEndpoint) {
      return (
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={finalLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={finalLoading || disableConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : variant === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {finalLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                처리 중...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      )
    }

    return null
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby="modal-content"
    >
      <div
        ref={modalRef}
        className={`
          mx-4 w-full transform rounded-lg bg-white shadow-xl transition-all duration-200 ease-out
          ${sizeClasses[size]} 
          ${size === 'full' ? 'my-4' : ''} 
          ${variantClasses[variant]}
          ${className}
        `}
        style={{ 
          maxHeight: maxHeight || (size === 'full' ? '100%' : '90vh'),
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`border-b px-6 py-4 ${getHeaderColor()}`}>
            <div className="flex items-center justify-between">
              {title && (
                <h3 
                  id="modal-title"
                  className={`text-xl font-semibold ${getTitleColor()}`}
                >
                  {title}
                </h3>
              )}
              {showCloseButton && !persistent && !finalLoading && (
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors ml-auto"
                  aria-label="모달 닫기"
                  type="button"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div 
          id="modal-content"
          className={`px-6 py-6 flex-1 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}
        >
          {/* 🔥 로딩 중일 때 로딩 스피너 표시 */}
          {finalLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ApiLoadingSpinner 
                text={loadingText}
                size="lg"
              />
            </div>
          ) : apiResult?.error ? (
            // 🔥 API 에러 표시
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 text-center">{apiResult.error}</p>
              {apiEndpoint && (
                <button
                  onClick={callBackendAPI}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  다시 시도
                </button>
              )}
            </div>
          ) : apiResult?.success ? (
            // 🔥 API 성공 표시
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-600 text-center">성공적으로 처리되었습니다!</p>
            </div>
          ) : (
            // 🔥 일반 컨텐츠
            children
          )}
        </div>

        {/* Footer */}
        {!finalLoading && renderFooter() && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
            {renderFooter()}
          </div>
        )}

        {/* 🔥 로딩 중일 때 persistent 표시 */}
        {(persistent || finalLoading) && (
          <div className="absolute top-2 right-2">
            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {finalLoading ? '처리 중' : '필수'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 백엔드 연동 상황별 편의 컴포넌트들
// ============================================================================

// 🔥 확인 모달 (API 호출 포함)
export const ConfirmModal: React.FC<Omit<ModalProps, 'type'>> = (props) => (
  <Modal {...props} type="confirm" />
)

// 🔥 삭제 확인 모달 (DELETE API 호출)
export const DeleteConfirmModal: React.FC<Omit<ModalProps, 'type' | 'variant'>> = (props) => (
  <Modal 
    {...props} 
    type="confirm" 
    variant="destructive"
    title={props.title || '삭제 확인'}
    confirmText={props.confirmText || '삭제'}
    apiMethod="DELETE"
  />
)

// 🔥 폼 제출 모달 (POST API 호출)
export const FormModal: React.FC<Omit<ModalProps, 'type'>> = (props) => (
  <Modal {...props} type="form" />
)

// 🔥 로딩 모달 (닫을 수 없음)
export const LoadingModal: React.FC<Omit<ModalProps, 'type' | 'persistent'>> = (props) => (
  <Modal 
    {...props} 
    type="loading" 
    persistent={true}
    showCloseButton={false}
    closeOnBackdropClick={false}
    closeOnEscape={false}
  />
)

export default Modal
'use client'

import React, { useEffect, useRef, useCallback } from 'react'

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
}

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
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // 포커스 트랩을 위한 포커스 가능한 요소들 선택자
  const focusableElementsSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
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

  // ESC 키 처리
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose()
    }
  }, [closeOnEscape, onClose])

  // 배경 클릭 처리
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose()
    }
  }, [closeOnBackdropClick, onClose])

  // 모달 열림/닫힘 처리
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
        const firstFocusable = modalRef.current?.querySelector(focusableElementsSelector) as HTMLElement
        firstFocusable?.focus()
      }, 0)
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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape, trapFocus, focusableElementsSelector])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4 h-full max-h-screen',
  } as const

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
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {title && (
                <h3 
                  id="modal-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  {title}
                </h3>
              )}
              {showCloseButton && (
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
          className={`px-6 py-6 ${size === 'full' ? 'flex-1 overflow-y-auto' : ''}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
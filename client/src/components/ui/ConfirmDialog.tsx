// src/components/ui/ConfirmDialog.tsx
'use client'

import React, { useEffect, useCallback } from 'react'
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export type DialogType = 'info' | 'warning' | 'success' | 'error'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  showCancel?: boolean
  confirmButtonVariant?: 'primary' | 'danger' | 'success'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  showCancel = true,
  confirmButtonVariant = 'primary'
}) => {
  // ESC 키 처리 및 포커스 트랩
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    
    if (e.key === 'Escape' && showCancel) {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm()
    }
  }, [isOpen, showCancel, onCancel, onConfirm])

  // 키보드 이벤트 리스너 등록/해제 및 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  const handleBackgroundClick = useCallback(() => {
    if (showCancel) {
      onCancel()
    }
  }, [showCancel, onCancel])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />
    }
  }

  const getIconBackgroundColor = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100'
      case 'success':
        return 'bg-green-100'
      case 'error':
        return 'bg-red-100'
      default:
        return 'bg-blue-100'
    }
  }

  const getConfirmButtonStyles = () => {
    switch (confirmButtonVariant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
        onClick={handleBackgroundClick}
        aria-hidden="true"
      />
      
      {/* 모달 컨테이너 */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="p-6 pb-4">
            <div className="flex items-center">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getIconBackgroundColor()}`}>
                {getIcon()}
              </div>
            </div>
            <div className="mt-3 text-center">
              <h3 
                id="dialog-title"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {title}
              </h3>
              <div className="mt-2">
                <p 
                  id="dialog-description"
                  className="text-sm text-gray-500 whitespace-pre-line"
                >
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${getConfirmButtonStyles()}`}
              onClick={onConfirm}
              autoFocus
            >
              {confirmText}
            </button>
            
            {showCancel && (
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                onClick={onCancel}
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
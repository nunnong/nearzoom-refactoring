'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import React, { useEffect } from 'react'

interface ExitConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  // 🔥 키보드 이벤트 처리
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter') {
        onConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    // 🔥 body 스크롤 방지
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  // 🔥 백드롭 클릭 처리 개선
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div className="flex items-start space-x-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              id="modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              편집 중인 내용이 있습니다
            </h3>
            <p 
              id="modal-description"
              className="text-sm text-gray-600 mt-1"
            >
              저장하지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            autoFocus // 🔥 기본 포커스를 안전한 선택지에
          >
            계속 편집하기
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            나가기
          </button>
        </div>
        
        {/* 🔥 키보드 힌트 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">ESC</kbd> 취소 · 
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Enter</kbd> 확인
          </p>
        </div>
      </div>
    </div>
  )
}

export default ExitConfirmModal
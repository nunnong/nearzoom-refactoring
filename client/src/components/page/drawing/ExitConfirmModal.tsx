'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import React from 'react'

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              편집 중인 내용이 있습니다
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              저장하지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            계속 편집하기
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExitConfirmModal
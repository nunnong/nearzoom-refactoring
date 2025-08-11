'use client'

import React from 'react'
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'

interface DrawingHeaderProps {
  hasChanges: boolean
  onGoBack: () => void
  onSave: () => void
}

const DrawingHeader: React.FC<DrawingHeaderProps> = ({
  hasChanges,
  onGoBack,
  onSave,
}) => {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onGoBack}
            className="flex items-center space-x-2 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>돌아가기</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-gray-900">이미지 편집</h1>
            <p className="text-xs text-red-500 font-medium">
              ⚠️ 편집은 한 번만 가능합니다. 저장 후에는 더 이상 편집할 수 없습니다.
            </p>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!hasChanges}
          className={`flex items-center space-x-2 rounded-md px-4 py-2 text-white transition-colors ${
            hasChanges
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'cursor-not-allowed bg-gray-400'
          }`}
          title={
            hasChanges ? '편집 내용을 저장합니다 (저장 후 편집 불가)' : '변경사항이 없습니다'
          }
        >
          <CheckIcon className="h-5 w-5" />
          <span>저장</span>
        </button>
      </div>
    </header>
  )
}

export default DrawingHeader
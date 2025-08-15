'use client'

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import React from 'react'

interface ImageItem {
  photoId: string
  imgUrl: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

interface DeleteConfirmModalProps {
  isOpen: boolean
  image: ImageItem | null
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  image,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !image) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              사진 삭제 확인
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Image Preview */}
          <div className="mb-4 flex justify-center">
            <div className="overflow-hidden rounded-lg">
              <img
                src={image.imgUrl}
                alt={image.imgUrl}
                className="h-32 w-32 object-cover"
              />
            </div>
          </div>

          {/* Message */}
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-gray-900">
              {image.imgUrl}
            </p>
            <p className="text-sm text-gray-600">
              이 사진을 영구적으로 삭제하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              삭제된 사진은 복구할 수 없습니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 border-t border-gray-200 p-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal
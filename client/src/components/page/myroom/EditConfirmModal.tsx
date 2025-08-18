'use client'

import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import React from 'react'

interface ImageItem {
  photoId: string
  imgUrl: string
  isLiked?: boolean
  isEdited?: boolean
  editable?: number
  hashtags?: string[]
  createdAt?: string    
  partnerEmails?: string | string[]
}

interface EditConfirmModalProps {
  isOpen: boolean
  image: ImageItem | null
  onConfirm: () => void
  onCancel: () => void
}

const EditConfirmModal: React.FC<EditConfirmModalProps> = ({
  isOpen,
  image,
  onConfirm,
  onCancel,
}) => {
  const router = useRouter()

  if (!isOpen || !image) return null

  // 1. /feed/edit?photoId=... 형태로 이동하게 변경
  const handleEditClick = () => {
    console.log('EditConfirmModal 편집하기 버튼 클릭됨')
    console.log(`photoId: ${image.photoId}로 피드 편집 페이지 이동`)
    
    // 피드 편집 페이지로 이동
    router.push(`/drawing?photoId=${image.photoId}`)
    
    // 모달 닫기
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">이미지 편집</h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Image Preview */}
        <div className="mb-4">
          <img
            src={image.imgUrl}
            alt={image.imgUrl}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>

        {/* 이미지 정보 */}
        <div className="mb-6 space-y-4">
          {/* 날짜 정보 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">생성 날짜</h4>
            <div className="text-sm text-gray-600">
              {image.createdAt ? (
                new Date(image.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              ) : (
                '날짜 정보 없음'
              )}
            </div>
          </div>

          {/* 함께한 친구 정보 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">With</h4>
            <div className="text-sm text-gray-600">
              {image.partnerEmails ? (
                <div className="space-y-2">
                  {typeof image.partnerEmails === 'string' ? (
                    image.partnerEmails.split(',').map((email, index) => (
                      <span 
                        key={index}
                        className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full mr-2 mb-1 text-sm font-medium"
                      >
                        @{email.trim()}
                      </span>
                    ))
                  ) : Array.isArray(image.partnerEmails) ? (
                    image.partnerEmails.map((email, index) => (
                      <span 
                        key={index}
                        className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full mr-2 mb-1 text-sm font-medium"
                      >
                        @{email}
                      </span>
                    ))
                  ) : (
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      @{image.partnerEmails}
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                  ME
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleEditClick}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
            <span>편집하기</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditConfirmModal
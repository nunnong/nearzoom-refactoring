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

  // 그림판(DrawingCanvas)으로 이동: /drawing?id=...&src=...&returnUrl=...
  const handleEditClick = () => {
    if (!image?.photoId || !image?.imgUrl) {
      console.error('[EditConfirmModal] 유효하지 않은 이미지 데이터', image)
      return
    }

    const id = image.photoId
    const srcRaw = image.imgUrl
    const src = encodeURIComponent(srcRaw)
    const returnUrl = '/myroom'
    const targetUrl = `/drawing?id=${id}&src=${src}&returnUrl=${returnUrl}`

    try {
      console.log('[EditConfirmModal] 그림판으로 이동 시도', { id, srcRaw, targetUrl })
      router.push(targetUrl)
    } catch (e) {
      console.error('[EditConfirmModal] router.push 실패, 폴백으로 이동', e)
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl
      }
    }

    // 폴백: 잠시 후 위치가 바뀌지 않았으면 강제로 이동
    if (typeof window !== 'undefined') {
      const before = window.location.pathname + window.location.search
      setTimeout(() => {
        const current = window.location.pathname + window.location.search
        if (current === before) {
          console.warn('[EditConfirmModal] URL 변경 감지 못함, 강제 이동 실행')
          window.location.href = targetUrl
        }
      }, 400)
    }

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
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-700 transition-colors"
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
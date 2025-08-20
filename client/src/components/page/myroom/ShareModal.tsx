'use client'

import {
  XMarkIcon,
  ShareIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSuccessToast } from '@/components/ui/Toast'

interface ImageItem {
  photoId: string
  imgUrl: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
  partnerEmails?: string | string[]
  takenAt?: string  // 촬영 날짜 추가
  createdAt?: string  // 생성 날짜 추가
}

interface ShareModalProps {
  isOpen: boolean
  image: ImageItem | null
  onClose: () => void
  onShareKakao: (imageId: string) => void
  showToast?: (toast: any) => void
}

const ShareModal: React.FC<ShareModalProps> = React.memo(({
  isOpen,
  image,
  onClose,
  onShareKakao,
  showToast,
}) => {
  const router = useRouter()
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  
  // 날짜 포맷팅 함수
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '날짜 정보 없음'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return '날짜 형식 오류'
    }
  }, [])

  // 메모이제이션된 콜백 함수들
  const handleKakaoShare = useCallback(() => {
    if (image) {
      onShareKakao(image.photoId)
      onClose()
    }
  }, [image, onShareKakao, onClose])

  const handleFeedCreate = useCallback(() => {
    if (image) {
      const params = new URLSearchParams({ photoId: String(image.photoId) })
      router.push(`/feed/edit?${params.toString()}`)
      onClose()
    }
  }, [image, router, onClose])

  const handleEmailCopy = useCallback(async (email: string) => {
    try {
      await navigator.clipboard.writeText(email.trim())
      setCopySuccess(`${email.trim()} 이메일이 복사되었습니다!`)
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setCopySuccess(null), 3000)
      
      // Toast가 있는 경우에만 사용
      if (showToast) {
        const toast = createSuccessToast(
          `${email.trim()} 이메일이 복사되었습니다!`
        )
        showToast(toast)
      }
    } catch (error) {
      console.error('이메일 복사 실패:', error)
      setCopySuccess('이메일 복사에 실패했습니다.')
      
      setTimeout(() => setCopySuccess(null), 3000)
    }
  }, [showToast])

  const handleDownload = useCallback(async () => {
    if (!image) return
    
    try {
      // 이미지 URL에서 실제 이미지 데이터 가져오기
      const response = await fetch(image.imgUrl)
      const blob = await response.blob()
      
      // Blob URL 생성
      const blobUrl = window.URL.createObjectURL(blob)
      
      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `photo-${image.photoId}.jpg`
      document.body.appendChild(link)
      link.click()
      
      // 정리
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      // 성공 메시지 표시
      setCopySuccess('이미지가 다운로드되었습니다!')
      setTimeout(() => setCopySuccess(null), 3000)
    } catch (error) {
      console.error('이미지 다운로드 실패:', error)
      setCopySuccess('이미지 다운로드에 실패했습니다.')
      setTimeout(() => setCopySuccess(null), 3000)
    }
  }, [image])

  const handleEmailClick = useCallback((email: string) => {
    // 이메일을 클릭하면 해당 사람의 피드로 이동
    const cleanEmail = email.trim()
    router.push(`/profile?email=${encodeURIComponent(cleanEmail)}`)
    onClose()
  }, [router, onClose])

  // 메모이제이션된 값들
  const partnerEmailsList = useMemo(() => {
    const raw = image?.partnerEmails
    if (!raw) return null
    if (Array.isArray(raw)) return raw.map(email => email.trim())
    return raw.split(',').map(email => email.trim())
  }, [image?.partnerEmails])

  const hasPartnerEmails = useMemo(() => {
    return partnerEmailsList && partnerEmailsList.length > 0
  }, [partnerEmailsList])

  // 조건부 return은 모든 Hooks 이후에
  if (!isOpen || !image) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-300 p-4">
          <div className="flex items-center space-x-2">
            <ShareIcon className="h-5 w-5 text-black" />
            <h3 className="text-lg font-semibold text-black">공유하기</h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center space-x-2 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
            <span>닫기</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Copy Success Message */}
          {copySuccess && (
            <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-md">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-black">✓</span>
                <p className="text-sm font-medium text-black">{copySuccess}</p>
              </div>
            </div>
          )}
          
          {/* Image and Email Section */}
          <div className="flex items-start space-x-4 mb-6">
            {/* Image Preview */}
            <div className="flex-shrink-0">
              <div className="overflow-hidden rounded-lg border-2 border-gray-300">
                <img
                  src={image.imgUrl}
                  alt="공유할 사진"
                  className="h-24 w-24 object-cover"
                />
              </div>
            </div>

            {/* 함께 찍은 사람 - EditConfirmModal과 동일한 배지 형태 */}
            {hasPartnerEmails ? (
              <div className="flex-1">
                <h4 className="text-sm font-medium text-black mb-2">With</h4>
                <div className="space-y-2">
                  <div>
                    {partnerEmailsList?.map((email, index) => (
                      <span 
                        key={index}
                        className="inline-block bg-gray-200 text-black px-3 py-1 rounded-full mr-2 mb-1 text-sm font-medium"
                      >
                        @{email}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-600 mb-2">함께 찍은 사람</h4>
                <p className="text-sm text-gray-500">함께 찍은 사람이 없습니다</p>
              </div>
            )}
          </div>

          {/* Date Information Section */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
            <h4 className="text-sm font-medium text-black mb-3"> 날짜 정보</h4>
            <div className="space-y-2">
              {image.takenAt && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600"> 촬영:</span>
                  <span className="text-sm text-black font-medium">
                    {formatDate(image.takenAt)}
                  </span>
                </div>
              )}
              {image.createdAt && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600"> 저장:</span>
                  <span className="text-sm text-black font-medium">
                    {formatDate(image.createdAt)}
                  </span>
                </div>
              )}
              {!image.takenAt && !image.createdAt && (
                <p className="text-sm text-gray-500">날짜 정보가 없습니다</p>
              )}
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            {/* Feed Create */}
            <button
              onClick={handleFeedCreate}
              className="flex w-full items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-black focus:ring-offset-2 focus:outline-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                <PencilSquareIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-black">
                  피드 게시물 작성하기
                </p>
                <p className="text-sm text-gray-600">
                  사진과 함께 게시물을 작성해보세요
                </p>
              </div>
            </button>
            
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex w-full items-center space-x-3 rounded-lg border border-gray-300 p-3 text-left transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
              </div>
              <div>
                <p className="font-medium text-black">사진 다운로드</p>
                <p className="text-sm text-gray-600">사진을 다운로드하여 저장해보세요</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ShareModal

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Edit } from 'lucide-react'
import api from '@/lib/axios'

interface UploadSelfieModalProps {
  isOpen: boolean
  onClose: () => void
  onImageUpdated?: () => void
}

export default function UploadSelfieModal({
  isOpen,
  onClose,
  onImageUpdated
}: UploadSelfieModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentReferenceImage, setCurrentReferenceImage] = useState<string | null>(null)
  const [hasExistingImage, setHasExistingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/user/userInfo')
      const profile = response.data.data
      
      if (profile.faceImageUrl) {
        setCurrentReferenceImage(profile.faceImageUrl)
        setHasExistingImage(true)
      } else {
        setCurrentReferenceImage(null)
        setHasExistingImage(false)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        setSelectedImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSave = async () => {
    if (!selectedImage) return

    try {
      setIsUploading(true)

      const base64Response = await fetch(selectedImage)
      const blob = await base64Response.blob()
      const formData = new FormData()
      formData.append('file', blob, 'profile.jpg')

      const uploadResponse = await api.post(
        'https://image.nearzoom.store/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: false,
        }
      )

      const imageUrl = uploadResponse.data?.data?.file_url
      if (!imageUrl) throw new Error('이미지 URL을 받아올 수 없습니다.')

      await api.put('/user/save-face-image', null, {
        params: { prettyFaceUrl: imageUrl }
      })

      setCurrentReferenceImage(imageUrl)
      setHasExistingImage(true)
      setSelectedImage(null)
      
      onImageUpdated?.()
      onClose()
      
    } catch (error: any) {
      console.error('프로필 이미지 저장 실패:', error)
      alert('프로필 이미지 저장에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const displayImage = selectedImage || currentReferenceImage

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="mx-4 w-96 max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl relative">
        {/* X 버튼을 우측 상단에 절대 위치로 배치 */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center justify-center p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-medium text-blue-500">이</span>
            <span className="text-lg font-medium text-red-500">어</span>
            <span className="text-lg font-medium text-yellow-500">줌</span>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          <h2 className="mb-3 text-xl font-medium text-gray-800">
            {hasExistingImage ? '참조 사진 교체' : '참조 사진 등록'}
          </h2>

          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            {hasExistingImage 
              ? '새로운 참조 사진으로 교체하거나 현재 사진을 그대로 사용하세요.'
              : '가장 잘 나온 사진 하나를 업로드해주세요. AI가 이를 참조하여 더 예쁘고 자연스러운 사진을 만들어 드립니다.'
            }
          </p>

          {/* AI 사진 합성용 태그 */}
          <div className="mb-6 flex items-center space-x-2 rounded-full border border-blue-200 px-4 py-2 text-blue-600 w-fit">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium">AI 사진 합성용</span>
          </div>

          {/* 참조 이미지 */}
          <div className="mb-8 flex justify-center">
            <div className="h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-orange-200 via-green-200 to-blue-200 p-1">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                {displayImage ? (
                  <img src={displayImage} alt="참조 사진" className="h-full w-full object-cover" />
                ) : (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <circle cx="50" cy="50" r="45" fill="#ff9999" />
                    <circle cx="35" cy="40" r="3" fill="#000" />
                    <circle cx="65" cy="40" r="3" fill="#000" />
                    <path d="M 30 60 Q 50 75 70 60" stroke="#000" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* 업로드/교체 버튼 */}
          {!selectedImage && (
            <button
              onClick={handleUploadClick}
              className="mb-4 flex w-full items-center justify-center space-x-2 rounded-full bg-blue-50 py-3 text-blue-600 transition-colors hover:bg-blue-100"
            >
              <Edit size={16} />
              <span className="font-medium">
                {hasExistingImage ? '다른 사진으로 교체' : '사진 업로드'}
              </span>
            </button>
          )}

          {/* 저장 버튼 */}
          {selectedImage && (
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="mb-3 w-full rounded-full bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? '저장 중...' : '저장'}
            </button>
          )}

          {/* 취소/계속하기 버튼 */}
          {selectedImage ? (
            <button
              onClick={() => setSelectedImage(null)}
              className="w-full rounded-full py-3 font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              취소
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full rounded-full py-3 font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              {hasExistingImage ? '현재 사진 유지' : '나중에 등록'}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}
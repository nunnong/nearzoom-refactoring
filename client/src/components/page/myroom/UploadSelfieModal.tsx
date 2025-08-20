'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Edit } from 'lucide-react'
import api from '@/lib/axios'
import { resizeImage } from '@/utils/imageOptimizer'

// 🚀 이미지 업로드 엔드포인트 상수
const IMAGE_UPLOAD_URL = 'https://image.nearzoom.store/upload'

interface UploadSelfieModalProps {
  isOpen: boolean
  onClose: () => void
  onImageUpdated?: () => void
}

export default function UploadSelfieModal({
  isOpen,
  onClose,
  onImageUpdated,
}: UploadSelfieModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentReferenceImage, setCurrentReferenceImage] = useState<
    string | null
  >(null)
  const [hasExistingImage, setHasExistingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  const fetchUserProfile = async () => {
    try {
      console.log('🔍 사용자 프로필 가져오기 시작')
      const response = await api.get('/user/userInfo')
      console.log('📡 API 응답 전체:', response)
      console.log('📡 API 응답 데이터:', response.data)
      console.log('📡 API 응답 상태:', response.status)
      console.log('📡 API 응답 헤더:', response.headers)
      
      const profile = response.data.data
      console.log('👤 프로필 데이터:', profile)
      
      // 🚀 모든 프로필 키와 값 상세 분석
      console.log('🔑 모든 프로필 키:', Object.keys(profile))
      console.log('📋 모든 프로필 값:', profile)
      
      // 🚀 이미지 관련 필드들 찾기
      const imageFields = Object.keys(profile).filter(key => 
        key.toLowerCase().includes('image') || 
        key.toLowerCase().includes('photo') || 
        key.toLowerCase().includes('face') ||
        key.toLowerCase().includes('profile') ||
        key.toLowerCase().includes('avatar')
      )
      console.log('🖼️ 이미지 관련 필드들:', imageFields)
      
      // 🚀 각 이미지 필드의 값 확인
      imageFields.forEach(field => {
        console.log(`📸 ${field}:`, profile[field])
      })
      
      // 🚀 faceImageUrl 필드 확인 (통일)
      const faceImageUrl = profile.faceImageUrl
      console.log('📸 faceImageUrl 값:', faceImageUrl)
      
      // 🚀 다른 가능한 이미지 필드들도 확인
      const possibleImageFields = [
        'profileImage',
        'profileImageUrl', 
        'faceImage',
        'faceImageUrl',
        'avatar',
        'avatarUrl',
        'photo',
        'photoUrl'
      ]
      
      let foundImageUrl = null
      for (const field of possibleImageFields) {
        if (profile[field]) {
          console.log(`✅ 이미지 URL 발견: ${field} = ${profile[field]}`)
          foundImageUrl = profile[field]
          break
        }
      }
      
      if (foundImageUrl) {
        setCurrentReferenceImage(foundImageUrl)
        setHasExistingImage(true)
        console.log('✅ 기존 이미지 설정 완료:', foundImageUrl)
      } else {
        setCurrentReferenceImage(null)
        setHasExistingImage(false)
        console.log('❌ 기존 이미지 없음 - 모든 이미지 필드 확인됨')
      }
    } catch (error) {
      console.error('❌ 사용자 프로필 가져오기 실패:', error)
      // 🚀 에러 발생 시에도 모달은 계속 열어둠
      setHasExistingImage(false)
    }
  }

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        console.log(
          '원본 이미지 크기:',
          (file.size / 1024 / 1024).toFixed(2) + 'MB'
        )

        // 이미지 최적화
        const optimizedImage = await resizeImage(file)
        console.log(
          '최적화된 이미지 크기:',
          (optimizedImage.size / 1024 / 1024).toFixed(2) + 'MB'
        )

        // 미리보기용 base64 변환
        const reader = new FileReader()
        reader.onload = e => {
          setSelectedImage(e.target?.result as string)
        }
        reader.readAsDataURL(optimizedImage)

        // 업로드용 Blob 저장
        setOptimizedBlob(optimizedImage)
      } catch (error) {
        console.error('이미지 최적화 실패:', error)
        // 실패시 원본 사용
        const reader = new FileReader()
        reader.onload = e => {
          setSelectedImage(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        setOptimizedBlob(file)
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSave = async () => {
    if (!selectedImage || !optimizedBlob) return

    try {
      setIsUploading(true)
      console.log('🚀 이미지 저장 시작')
      console.log('📸 선택된 이미지:', selectedImage.substring(0, 100) + '...')

      // 최적화된 Blob 직접 사용
      const formData = new FormData()
      formData.append('file', optimizedBlob, 'profile.png')
      formData.append('type', 'profile')

      // 🚀 이미지 업로드
      console.log('📤 이미지 업로드 시작:', IMAGE_UPLOAD_URL)
      console.log('🔑 업로드 요청 헤더:', {
        'Content-Type': 'multipart/form-data'
      })
      
      const uploadResponse = await api.post(
        IMAGE_UPLOAD_URL,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: false,
        }
      )

      console.log('📤 업로드 응답 전체:', uploadResponse)
      console.log('📤 업로드 응답 데이터:', uploadResponse.data)

      const imageUrl = uploadResponse.data?.data?.file_url
      if (!imageUrl) {
        console.error('❌ 이미지 URL을 받아올 수 없습니다:', uploadResponse.data)
        throw new Error('이미지 URL을 받아올 수 없습니다.')
      }

      console.log('✅ 이미지 업로드 성공, URL:', imageUrl)

      await api.put('/user/save-face-image', null, {
        params: { prettyFaceUrl: imageUrl },
      })

      console.log('💾 프로필 저장 응답:', uploadResponse.data)
      console.log('🎉 이미지 저장 완료!')

      // 🚀 상태 업데이트
      setCurrentReferenceImage(imageUrl)
      setHasExistingImage(true)
      setSelectedImage(null)
      setOptimizedBlob(null)

      // 🚀 콜백 호출
      onImageUpdated?.()
      onClose()
    } catch (error: any) {
      console.error('프로필 이미지 저장 실패:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        error,
      })

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        '알 수 없는 오류가 발생했습니다.'
      alert(`참조 이미지 저장에 실패했습니다: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const displayImage = selectedImage || currentReferenceImage

  return (
    <div className="bg-opacity-30 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="relative mx-4 w-96 max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 transition-colors hover:bg-gray-100"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* 헤더 - 로고 */}
        <div className="flex items-center justify-center pt-4 pb-2 mt-4">
          <img src="/vogue_logo.png" alt="vogue" className="h-4 w-auto" />
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          <h2 className="mb-3 text-xl font-medium text-gray-800">
            {hasExistingImage ? '참조 사진 교체' : '참조 사진 등록'}
          </h2>

          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            {hasExistingImage
              ? '새로운 참조 사진으로 교체하거나 현재 사진을 그대로 사용하세요.'
              : '가장 잘 나온 사진 하나를 업로드해주세요. AI가 이를 참조하여 더 예쁘고 자연스러운 사진을 만들어 드립니다.'}
          </p>

          {/* AI 사진 합성용 태그 */}
          <div className="mb-6 flex w-fit items-center space-x-2 rounded-full border border-blue-200 px-4 py-2 text-blue-600">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm font-medium">AI 사진 합성용</span>
          </div>

          {/* 참조 이미지 */}
          <div className="mb-8 flex justify-center">
            <div className="h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-orange-200 via-green-200 to-blue-200 p-1">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="참조 사진"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <circle cx="50" cy="50" r="45" fill="#ff9999" />
                    <circle cx="35" cy="40" r="3" fill="#000" />
                    <circle cx="65" cy="40" r="3" fill="#000" />
                    <path
                      d="M 30 60 Q 50 75 70 60"
                      stroke="#000"
                      strokeWidth="2"
                      fill="none"
                    />
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

'use client'

import React, { useState, useRef } from 'react'
import { X, Globe, Edit, Trash2, Upload } from 'lucide-react'
import api from '@/lib/axios'

interface UploadSelfieModalProps {
  isOpen: boolean
  onClose: () => void
  userProfile?: {
    name?: string
    email?: string
    profileImage?: string
    faceImageUrl?: string
  } | null
}

export default function UploadSelfieModal({ isOpen, onClose, userProfile }: UploadSelfieModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentReferenceImage, setCurrentReferenceImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      // userProfile에서 참조 사진 URL 가져오기 (이전에 올려놨던 것)
      const referenceImageUrl = userProfile?.faceImageUrl
      setCurrentReferenceImage(referenceImageUrl || null)
    }
  }, [isOpen, userProfile])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setSelectedImage(result)
        // 임시 미리보기용으로만 사용 (저장하지 않음)
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
      
      // 1단계: 이미지 파일을 업로드해서 URL 받기
      const base64Response = await fetch(selectedImage)
      const blob = await base64Response.blob()
      
      const formData = new FormData()
      formData.append('file', blob, 'profile.jpg')
      
      // **이미지 업로드 API 호출 (URL을 반환받음)**
      const uploadResponse = await api.post('https://image.nearzoom.store/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: false // CORS 에러 방지를 위해 credentials 비활성화 -> 이거 고쳐야 하나?
      })
      
      const imageUrl = uploadResponse.data.data.fileurl || uploadResponse.data.fileurl
      
      // 2단계: 받은 URL을 프로필 이미지로 저장 (save-face-image 엔드포인트로 url 보내기)
      // URL 파라미터로 전송하도록 변경
const saveResponse = await api.put(`/user/save-face-image?prettyFaceUrl=${encodeURIComponent(imageUrl)}`, null, {
  headers: {
    'Content-Type': 'application/json'
  }
})
      
      // 저장 완료 후 모달 닫기
      onClose()
      
      // 페이지 새로고침하여 업데이트된 프로필 이미지 반영
      window.location.reload()
      
    } catch (error: any) {
      console.error('프로필 이미지 저장 실패:')
      console.error('Error object:', error)
      console.error('Error response:', error?.response)
      console.error('Error data:', error?.response?.data)
      console.error('Error status:', error?.response?.status)
      console.error('Error message:', error?.message)
      
      let errorMessage = '프로필 이미지 저장에 실패했습니다.'
      if (error?.response?.data?.message) {
        errorMessage += ` (${error.response.data.message})`
      } else if (error?.message) {
        errorMessage += ` (${error.message})`
      }
      
      alert(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = () => {
    setSelectedImage(null)
    setCurrentReferenceImage(null)
    // 실제 서버에서 삭제하는 API 호출이 필요하다면 여기에 추가
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-96 max-w-sm mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-blue-500 font-medium text-lg">이</span>
            <span className="text-red-500 font-medium text-lg">어</span>
            <span className="text-yellow-500 font-medium text-lg">줌</span>
            <span className="text-gray-700 ml-1"></span>
          </div>
          
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <div className="flex flex-col items-center">
              <div className="w-1 h-1 bg-gray-600 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          <h2 className="text-xl font-medium text-gray-800 mb-3">참조 사진</h2>
          
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            가장 잘 나온 사진 하나를 업로드해주세요. AI가 이를 참조하여 더 예쁘고 자연스러운 사진을 만들어 드립니다.
          </p>

          {/* 모두에게 표시 버튼 */}
          <button className="flex items-center space-x-2 text-blue-600 border border-blue-200 rounded-full px-4 py-2 mb-6 hover:bg-blue-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium">AI 사진 합성용</span>
          </button>

          {/* 참조 이미지 */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 via-green-200 to-blue-200 p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                {selectedImage || currentReferenceImage ? (
                  <img 
                    src={selectedImage || currentReferenceImage || ''}
                    alt="참조 사진"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="#ff9999"/>
                    <circle cx="35" cy="40" r="3" fill="#000"/>
                    <circle cx="65" cy="40" r="3" fill="#000"/>
                    <path d="M 30 60 Q 50 75 70 60" stroke="#000" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex space-x-3">
            <button 
              onClick={handleUploadClick}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 text-blue-600 py-3 rounded-full hover:bg-blue-100 transition-colors"
            >
              <Edit size={16} />
              <span className="font-medium">{currentReferenceImage ? '교체' : '업로드'}</span>
            </button>
            
            <button 
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center space-x-2 bg-gray-50 text-gray-700 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Trash2 size={16} />
              <span className="font-medium">삭제</span>
            </button>
          </div>

          {/* 저장 버튼 */}
          {selectedImage && (
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? '저장 중...' : '저장'}
            </button>
          )}

          {/* 숨겨진 파일 입력 */}
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
'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { XCircleIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { saveReferenceImage } from '@/utils/localStorage'

export default function UploadSelfiePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        setSelectedImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        setSelectedImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedImage) {
      alert('이미지를 선택해주세요.')
      return
    }

    setIsUploading(true)

    try {
      // 참고 이미지로 저장 (실제로는 서버에 업로드)
      saveReferenceImage(selectedImage)

      // localStorage에 셀피 업로드 상태 저장
      localStorage.setItem('userSelfie', selectedImage)

      console.log('Selfie uploaded and saved as reference image')

      // 업로드 완료 후 이전 페이지 또는 마이룸으로 리다이렉트
      const returnUrl = new URLSearchParams(window.location.search).get(
        'returnUrl'
      )
      router.push(returnUrl || '/myroom')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSkip = () => {
    const returnUrl = new URLSearchParams(window.location.search).get(
      'returnUrl'
    )
    router.push(returnUrl || '/myroom')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}

        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            참고 이미지 업로드
          </h1>

          <button
            onClick={handleSkip}
            disabled={isUploading}
            className="w-full rounded-md bg-gray-100 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            나중에 하기
          </button>
          
          <p className="text-gray-600">
            더 완벽한 이미지 생성을 위해 예쁜 사진을 업로드해주세요
          </p>
        </div>

        {/* Image Upload Area */}
        <div className="mb-6">
          {!selectedImage ? (
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-12 text-center transition-colors hover:border-gray-400"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-4 text-lg text-gray-600">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="mt-2 text-sm text-gray-500">
                PNG, JPG, GIF (최대 5MB)
              </p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Preview"
                className="h-64 w-full rounded-lg object-cover"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {selectedImage && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>팁:</strong> 얼굴이 선명하게 보이는 정면 사진을
            업로드하면 <br/>더 좋은 결과를 얻을 수 있어요!
          </p>
        </div>
      </div>
    </div>
  )
}

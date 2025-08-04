'use client'

import React, { useState, useRef, useEffect } from 'react'
import { XMarkIcon, PhotoIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getReferenceImage, deleteReferenceImage } from '@/utils/localStorage'

interface UploadSelfieModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (imageData: string) => void
}

const UploadSelfieModal: React.FC<UploadSelfieModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [existingImage, setExistingImage] = useState<{id: string, src: string, uploadedAt: string} | null>(null)
  const [imageError, setImageError] = useState<boolean>(false)
  const [imageLoading, setImageLoading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 기존 참고 이미지 로드
  useEffect(() => {
    if (isOpen) {
      const image = getReferenceImage()
      setExistingImage(image)
      setImageError(false)
      setImageLoading(true)
    }
  }, [isOpen])

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      // 파일 크기 제한 (5MB)
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
      // 직접 파일 처리
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
      onUpload(selectedImage)

      // 모달 초기화
      setSelectedImage(null)

      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }
  const handleCancel = () => {
    setSelectedImage(null)
    onClose()
  }

  const handleDeleteExistingImage = () => {
    if (confirm('현재 참고 이미지를 삭제하시겠습니까?')) {
      deleteReferenceImage()
      setExistingImage(null)
    }
  }

  const handleUseExistingImage = (imageSrc: string) => {
    onUpload(imageSrc)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            참고 이미지 업로드
          </h3>
          <button
            onClick={handleCancel}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Existing Image Section */}
          {existingImage && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                현재 참고 이미지
              </h4>
              <div className="relative group">
                <div 
                  className="relative cursor-pointer rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors"
                  onClick={() => handleUseExistingImage(existingImage.src)}
                  style={{
                    height: '192px',
                    overflow: 'visible'
                  }}
                >
                  {imageLoading && (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {imageError ? (
                    <div className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                      <PhotoIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">이미지를 불러올 수 없습니다</span>
                      <span className="text-xs text-gray-400 mt-1">데이터 형식을 확인해주세요</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={existingImage.src}
                        alt="저장된 참고 이미지"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        style={{ 
                          display: 'block',
                          width: '100%',
                          height: '192px',
                          objectFit: 'cover',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          opacity: '1',
                          visibility: 'visible',
                          position: 'relative',
                          zIndex: '1'
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                        <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          이 이미지 사용하기
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    업로드: {new Date(existingImage.uploadedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={handleDeleteExistingImage}
                    className="flex items-center space-x-1 rounded px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <TrashIcon className="h-3 w-3" />
                    <span className="text-xs">삭제</span>
                  </button>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-gray-500 mb-3">또는 새 이미지로 교체하세요</p>
              </div>
            </div>
          )}

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
        </div>

        {/* Footer */}
        {selectedImage && (
          <div className="border-t bg-gray-50 p-4">
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isUploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        )}

        {/* Footer for when no new image is selected */}
        {!selectedImage && !existingImage && (
          <div className="border-t bg-gray-50 p-4">
            <p className="text-xs text-gray-500 text-center">
              참고 이미지를 업로드하면 AI가 더 정확한 스타일링을 도와드립니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadSelfieModal

// src/components/page/feed/PhotoUploadModal.tsx
'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  XMarkIcon,
  PhotoIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 타입 정의
export interface ImageInfo {
  id: string
  name: string
  size: number
  lastModified: number
}

export interface SavedImage {
  id: string
  src: string
  alt: string
  isLiked: boolean
  isEdited?: boolean
  hashtags?: string[]
  createdAt?: string
}

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onPhotoSelect: (imageData: string, imageInfo?: ImageInfo) => void
  onPhotoUpload?: (file: File) => void
  feedId?: string
}

// ✅ 타입 안전성을 위한 세션 인터페이스 정의
interface FeedSession {
  sessionId: string
  feedId?: string
  returnUrl: string
  createdAt: string
  expiresAt: string
}

// 간단한 세션 관리 (실제 구현 시 별도 파일로 분리)
const createFeedSession = (feedId?: string): string => {
  const sessionId = `feed_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const session: FeedSession = {
    sessionId,
    feedId,
    returnUrl: typeof window !== 'undefined' ? window.location.href : '',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  }
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('feed_photo_session', JSON.stringify(session))
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }
  return sessionId
}

// ✅ 파일 검증 함수
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: '이미지 파일만 업로드 가능합니다.' }
  }
  
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: '파일 크기는 10MB 이하여야 합니다.' }
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'JPG, PNG, GIF, WebP 파일만 지원됩니다.' }
  }
  
  return { isValid: true }
}

// ✅ 로컬 스토리지 안전 접근 함수들
const safeGetLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error)
    return null
  }
}

const safeSetLocalStorage = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Failed to set ${key} to localStorage:`, error)
    return false
  }
}

const safeRemoveLocalStorage = (key: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error)
    return false
  }
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onPhotoSelect,
  onPhotoUpload,
  feedId
}) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('gallery')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'liked' | 'edited'>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [savedImages, setSavedImages] = useState<SavedImage[]>([])
  const [error, setError] = useState<string | null>(null)

  // myroom으로 이동
  const handleGoToMyroom = useCallback(() => {
    try {
      const sessionId = createFeedSession(feedId)
      router.push(`/myroom?feedSession=${sessionId}&action=upload`)
      onClose()
    } catch (error) {
      console.error('Failed to navigate to myroom:', error)
      setError('myroom으로 이동할 수 없습니다.')
    }
  }, [feedId, router, onClose])

  // ✅ 저장된 이미지 로드 함수 분리
  const loadSavedImages = useCallback((): SavedImage[] => {
    const imagesData = safeGetLocalStorage('photo_memories')
    if (!imagesData) return []
    
    try {
      const parsedImages = JSON.parse(imagesData)
      return Array.isArray(parsedImages) ? parsedImages : []
    } catch (error) {
      console.error('Failed to parse saved images:', error)
      return []
    }
  }, [])

  // ✅ myroom에서 돌아온 사진 체크 함수 분리
  const checkReturnedPhoto = useCallback(() => {
    const photoData = safeGetLocalStorage('selected_feed_photo')
    if (!photoData) return
    
    try {
      const parsed = JSON.parse(photoData)
      onPhotoSelect(parsed.imageSrc, {
        id: parsed.imageId,
        name: 'Selected Photo',
        size: 0,
        lastModified: Date.now()
      })
      safeRemoveLocalStorage('selected_feed_photo')
      alert('사진이 피드에 추가되었습니다!')
      onClose()
    } catch (error) {
      console.error('Failed to process returned photo:', error)
      setError('선택한 사진을 처리할 수 없습니다.')
    }
  }, [onPhotoSelect, onClose])

  // 컴포넌트 마운트 시 이미지 로드 및 돌아온 사진 체크
  useEffect(() => {
    if (!isOpen) return
    
    setSavedImages(loadSavedImages())
    checkReturnedPhoto()
  }, [isOpen, loadSavedImages, checkReturnedPhoto])

  // ✅ 에러 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // 파일 업로드
  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateFile(file)
    if (!validation.isValid) {
      setError(validation.error || '파일이 유효하지 않습니다.')
      return
    }

    setIsUploading(true)
    setError(null)
    
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        if (imageData) {
          onPhotoSelect(imageData, {
            id: `upload_${Date.now()}`,
            name: file.name,
            size: file.size,
            lastModified: file.lastModified
          })
          onPhotoUpload?.(file)
          onClose()
        }
      }
      
      reader.onerror = () => {
        setError('파일을 읽는 중 오류가 발생했습니다.')
        setIsUploading(false)
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('File upload error:', error)
      setError('파일 업로드에 실패했습니다.')
      setIsUploading(false)
    }
  }, [onPhotoSelect, onPhotoUpload, onClose])

  // 드래그 앤 드롭
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) {
      setError('드롭된 파일이 없습니다.')
      return
    }
    
    if (files.length > 1) {
      setError('한 번에 하나의 파일만 업로드할 수 있습니다.')
      return
    }
    
    handleFileUpload(files[0])
  }, [handleFileUpload])

  // 파일 선택
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
    // ✅ 같은 파일 재선택 가능하도록 값 초기화
    e.target.value = ''
  }, [handleFileUpload])

  // 저장된 이미지 선택
  const handleImageSelect = useCallback((image: SavedImage) => {
    try {
      onPhotoSelect(image.src, {
        id: image.id,
        name: image.alt || 'Saved Image',
        size: 0,
        lastModified: Date.now()
      })
      onClose()
    } catch (error) {
      console.error('Failed to select image:', error)
      setError('이미지를 선택할 수 없습니다.')
    }
  }, [onPhotoSelect, onClose])

  // 좋아요 토글
  const toggleImageLike = useCallback((imageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const updatedImages = savedImages.map(img => 
        img.id === imageId ? { ...img, isLiked: !img.isLiked } : img
      )
      
      setSavedImages(updatedImages)
      if (!safeSetLocalStorage('photo_memories', JSON.stringify(updatedImages))) {
        setError('좋아요 상태를 저장할 수 없습니다.')
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      setError('좋아요 토글에 실패했습니다.')
    }
  }, [savedImages])

  // 이미지 삭제
  const deleteImage = useCallback((imageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('정말 이 이미지를 삭제하시겠습니까?')) return
    
    try {
      const filteredImages = savedImages.filter(img => img.id !== imageId)
      setSavedImages(filteredImages)
      if (!safeSetLocalStorage('photo_memories', JSON.stringify(filteredImages))) {
        setError('이미지 삭제를 저장할 수 없습니다.')
      }
    } catch (error) {
      console.error('Failed to delete image:', error)
      setError('이미지 삭제에 실패했습니다.')
    }
  }, [savedImages])

  // ✅ 이미지 필터링을 useMemo로 최적화
  const filteredImages = useMemo(() => {
    let filtered = [...savedImages]

    // 카테고리 필터
    if (selectedCategory === 'liked') {
      filtered = filtered.filter(img => img.isLiked)
    } else if (selectedCategory === 'edited') {
      filtered = filtered.filter(img => img.isEdited)
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(img => 
        img.alt.toLowerCase().includes(query) ||
        img.hashtags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 날짜순 정렬 (최신순)
    return filtered.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime()
      const bTime = new Date(b.createdAt || 0).getTime()
      return bTime - aTime
    })
  }, [savedImages, selectedCategory, searchQuery])

  // ✅ 모달이 닫혔을 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('gallery')
      setSearchQuery('')
      setSelectedCategory('all')
      setError(null)
      setIsUploading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">사진 추가</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="닫기"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* ✅ 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 flex-shrink-0">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 탭 메뉴 */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'gallery'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📸 저장된 사진
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⬆️ 새 사진 업로드
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upload' ? (
            /* 업로드 탭 */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 직접 업로드 */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isUploading
                      ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                  }`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center space-y-2">
                      <CloudArrowUpIcon className="h-10 w-10 text-blue-500 animate-bounce" />
                      <p className="text-blue-600 font-medium">업로드 중...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <PhotoIcon className="h-12 w-12 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">직접 업로드</h3>
                        <p className="text-sm text-gray-500 mb-3">
                          파일을 드래그하거나 클릭하여 선택<br />
                          <span className="text-xs text-gray-400">최대 10MB, JPG/PNG/GIF/WebP</span>
                        </p>
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">파일 선택</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* myroom으로 이동 */}
                <div
                  onClick={handleGoToMyroom}
                  className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer border-green-300 hover:border-green-400 hover:bg-green-50"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <ArrowTopRightOnSquareIcon className="h-12 w-12 text-green-500" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">myroom에서 선택</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        myroom으로 이동하여 사진 업로드 및 선택<br />
                        <span className="text-xs text-gray-400">기존 사진도 선택 가능</span>
                      </p>
                      <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">myroom으로 이동</div>
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            /* 갤러리 탭 */
            <div className="space-y-4">
              {/* 검색 및 필터 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="사진 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: '전체', icon: '📷' },
                    { key: 'liked', label: '좋아요', icon: '❤️' },
                    { key: 'edited', label: '편집됨', icon: '✏️' }
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key as 'all' | 'liked' | 'edited')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 이미지 그리드 */}
              {filteredImages.length === 0 ? (
                <div className="text-center py-12">
                  <PhotoIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || selectedCategory !== 'all' ? '검색 결과가 없습니다' : '저장된 사진이 없습니다'}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery || selectedCategory !== 'all'
                      ? '다른 검색어나 필터를 시도해보세요'
                      : 'myroom으로 이동하여 새 사진을 업로드해보세요'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-200"
                      onClick={() => handleImageSelect(image)}
                    >
                      <div className="aspect-square">
                        <img 
                          src={image.src} 
                          alt={image.alt} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/api/placeholder/200/200?text=Error'
                          }}
                        />
                      </div>
                      
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                        <button
                          onClick={(e) => toggleImageLike(image.id, e)}
                          className="p-1.5 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                          aria-label={image.isLiked ? "좋아요 취소" : "좋아요"}
                        >
                          {image.isLiked ? (
                            <HeartSolidIcon className="h-4 w-4 text-red-500" />
                          ) : (
                            <HeartIcon className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={(e) => deleteImage(image.id, e)}
                          className="p-1.5 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                          aria-label="이미지 삭제"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                      
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {image.isLiked && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">❤️</span>
                        )}
                        {image.isEdited && (
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">✏️</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {activeTab === 'gallery' ? `${filteredImages.length}개의 사진` : '직접 업로드하거나 myroom에서 선택하세요'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

export default PhotoUploadModal
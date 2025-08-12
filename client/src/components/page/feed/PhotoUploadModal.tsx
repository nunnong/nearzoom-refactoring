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

// 🔥 백엔드 API 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

const getAuthToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

const createAuthHeaders = () => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('로그인이 필요합니다.')
  }
  return {
    'Authorization': `Bearer ${token}`
  }
}

// 🔥 백엔드 API 서비스
const apiService = {
  // 사진 업로드 (실제 Photo 엔티티 생성)
  uploadPhoto: async (file: File, roomId: string): Promise<{ photoId: number; imgUrl: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('roomId', roomId)

    const response = await fetch(`${API_BASE_URL}/photos/upload`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: formData
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      throw new Error('사진 업로드에 실패했습니다.')
    }

    const data = await response.json()
    return data.data
  },

  // 피드 생성 (업로드된 사진으로)
  createFeed: async (photoId: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/feeds/${photoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthHeaders()
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      if (response.status === 404) {
        throw new Error('사진을 찾을 수 없습니다.')
      }
      throw new Error('피드 생성에 실패했습니다.')
    }

    const data = await response.json()
    return data.data
  },

  // 사진 목록 조회 (향후 구현)
  getPhotos: async (roomId: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/photos?roomId=${roomId}`, {
      headers: createAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('사진 목록 조회에 실패했습니다.')
    }

    const data = await response.json()
    return data.data || []
  }
}

// 타입 정의
export interface ImageInfo {
  id: string
  name: string
  size: number
  lastModified: number
  photoId?: number // 🔥 백엔드 photoId 추가
}

export interface SavedImage {
  id: string
  src: string
  alt: string
  isLiked: boolean
  isEdited?: boolean
  hashtags?: string[]
  createdAt?: string
  photoId?: number // 🔥 백엔드 photoId 추가
}

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onPhotoSelect: (imageData: string, imageInfo?: ImageInfo) => void
  onPhotoUpload?: (file: File, photoId?: number) => void
  onFeedCreate?: (feedData: any) => void // 🔥 피드 생성 콜백 추가
  feedId?: string
  roomId?: string // 🔥 룸 ID 추가
}

// ✅ 타입 안전성을 위한 세션 인터페이스 정의
interface FeedSession {
  sessionId: string
  feedId?: string
  roomId?: string
  returnUrl: string
  createdAt: string
  expiresAt: string
}

// 간단한 세션 관리
const createFeedSession = (feedId?: string, roomId?: string): string => {
  const sessionId = `feed_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const session: FeedSession = {
    sessionId,
    feedId,
    roomId,
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
  onFeedCreate,
  feedId,
  roomId = 'default_room' // 🔥 기본 룸 ID
}) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('gallery')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'liked' | 'edited'>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [isCreatingFeed, setIsCreatingFeed] = useState(false) // 🔥 피드 생성 로딩 상태
  const [savedImages, setSavedImages] = useState<SavedImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null) // 🔥 성공 메시지

  // 🔥 로그인 체크
  const isLoggedIn = useMemo(() => !!getAuthToken(), [])

  // myroom으로 이동
  const handleGoToMyroom = useCallback(() => {
    try {
      const sessionId = createFeedSession(feedId, roomId)
      router.push(`/myroom?feedSession=${sessionId}&action=upload`)
      onClose()
    } catch (error) {
      console.error('Failed to navigate to myroom:', error)
      setError('myroom으로 이동할 수 없습니다.')
    }
  }, [feedId, roomId, router, onClose])

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
        lastModified: Date.now(),
        photoId: parsed.photoId
      })
      safeRemoveLocalStorage('selected_feed_photo')
      setSuccess('사진이 피드에 추가되었습니다!')
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        onClose()
      }, 2000)
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

  // ✅ 에러/성공 메시지 자동 제거
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // 🔥 파일 업로드 및 피드 생성
  const handleFileUpload = useCallback(async (file: File, createFeedImmediately = false) => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.')
      return
    }

    const validation = validateFile(file)
    if (!validation.isValid) {
      setError(validation.error || '파일이 유효하지 않습니다.')
      return
    }

    setIsUploading(true)
    setError(null)
    
    try {
      // 1. 백엔드에 사진 업로드 (Photo 엔티티 생성)
      const uploadResult = await apiService.uploadPhoto(file, roomId)
      
      // 2. 프론트엔드에서 이미지 표시용 데이터 생성
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        if (imageData) {
          const imageInfo: ImageInfo = {
            id: `upload_${Date.now()}`,
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            photoId: uploadResult.photoId
          }

          // 3. 부모 컴포넌트에 선택된 사진 전달
          onPhotoSelect(imageData, imageInfo)
          onPhotoUpload?.(file, uploadResult.photoId)

          // 4. 즉시 피드 생성 옵션
          if (createFeedImmediately) {
            await handleCreateFeed(uploadResult.photoId)
          } else {
            setSuccess('사진이 업로드되었습니다!')
            setTimeout(() => onClose(), 1500)
          }
        }
      }
      
      reader.onerror = () => {
        setError('파일을 읽는 중 오류가 발생했습니다.')
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('File upload error:', error)
      setError(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }, [isLoggedIn, roomId, onPhotoSelect, onPhotoUpload, onClose])

  // 🔥 피드 생성 함수
  const handleCreateFeed = useCallback(async (photoId: number) => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.')
      return
    }

    setIsCreatingFeed(true)
    setError(null)

    try {
      const feedData = await apiService.createFeed(photoId)
      onFeedCreate?.(feedData)
      setSuccess('피드가 성공적으로 생성되었습니다!')
      
      // 2초 후 모달 닫기
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Feed creation error:', error)
      setError(error instanceof Error ? error.message : '피드 생성에 실패했습니다.')
    } finally {
      setIsCreatingFeed(false)
    }
  }, [isLoggedIn, onFeedCreate, onClose])

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

  // 🔥 저장된 이미지 선택 및 피드 생성
  const handleImageSelect = useCallback(async (image: SavedImage, createFeedImmediately = false) => {
    try {
      const imageInfo: ImageInfo = {
        id: image.id,
        name: image.alt || 'Saved Image',
        size: 0,
        lastModified: Date.now(),
        photoId: image.photoId
      }

      onPhotoSelect(image.src, imageInfo)

      if (createFeedImmediately && image.photoId) {
        await handleCreateFeed(image.photoId)
      } else {
        setSuccess('사진이 선택되었습니다!')
        setTimeout(() => onClose(), 1500)
      }
    } catch (error) {
      console.error('Failed to select image:', error)
      setError('이미지를 선택할 수 없습니다.')
    }
  }, [onPhotoSelect, onClose, handleCreateFeed])

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
      setSuccess(null)
      setIsUploading(false)
      setIsCreatingFeed(false)
    }
  }, [isOpen])

  // 🔥 로그인하지 않은 경우
  if (!isLoggedIn && isOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">
            사진을 업로드하고 피드를 생성하려면 로그인해주세요.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => {
                onClose()
                router.push('/login')
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    )
  }

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
            disabled={isUploading || isCreatingFeed}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* ✅ 에러/성공 메시지 */}
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

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 flex-shrink-0">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* 탭 메뉴 */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab('gallery')}
            disabled={isUploading || isCreatingFeed}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
              activeTab === 'gallery'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📸 저장된 사진
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            disabled={isUploading || isCreatingFeed}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
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
                    isUploading || isCreatingFeed
                      ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                  }`}
                  onClick={() => !(isUploading || isCreatingFeed) && fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center space-y-2">
                      <CloudArrowUpIcon className="h-10 w-10 text-blue-500 animate-bounce" />
                      <p className="text-blue-600 font-medium">업로드 중...</p>
                    </div>
                  ) : isCreatingFeed ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-blue-600 font-medium">피드 생성 중...</p>
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
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isUploading || isCreatingFeed
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer border-green-300 hover:border-green-400 hover:bg-green-50'
                  }`}
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
                disabled={isUploading || isCreatingFeed}
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
                    disabled={isUploading || isCreatingFeed}
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as 'all' | 'liked' | 'edited')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isUploading || isCreatingFeed}
                  >
                    <option value="all">전체</option>
                    <option value="liked">좋아요</option>
                    <option value="edited">편집됨</option>
                  </select>
                </div>
              </div>

              {/* 저장된 이미지 그리드 */}
              {filteredImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 aspect-square"
                      onClick={() => handleImageSelect(image)}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      
                      {/* 오버레이 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                          {/* 좋아요 버튼 */}
                          <button
                            onClick={(e) => toggleImageLike(image.id, e)}
                            className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                            aria-label={image.isLiked ? '좋아요 취소' : '좋아요'}
                          >
                            {image.isLiked ? (
                              <HeartSolidIcon className="h-4 w-4 text-red-500" />
                            ) : (
                              <HeartIcon className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                          
                          {/* 삭제 버튼 */}
                          <button
                            onClick={(e) => deleteImage(image.id, e)}
                            className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                            aria-label="삭제"
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* 이미지 정보 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                        <div className="text-white text-xs">
                          {image.isLiked && <span className="inline-block mr-1">❤️</span>}
                          {image.isEdited && <span className="inline-block mr-1">✨</span>}
                          {image.hashtags && image.hashtags.length > 0 && (
                            <span className="text-blue-300">
                              #{image.hashtags[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 🔥 즉시 피드 생성 버튼 */}
                      {image.photoId && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleImageSelect(image, true)
                            }}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            disabled={isCreatingFeed}
                          >
                            즉시 피드 생성
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">저장된 사진이 없습니다</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? '검색 결과가 없습니다.' : 'myroom에서 사진을 업로드하고 저장해보세요.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={isUploading || isCreatingFeed}
                  >
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    사진 업로드하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🔥 하단 액션 버튼 (업로드 탭에서만) */}
        {activeTab === 'upload' && (
          <div className="border-t p-6 flex-shrink-0">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isUploading || isCreatingFeed}
              >
                취소
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isUploading || isCreatingFeed}
              >
                {isUploading ? '업로드 중...' : '파일 선택'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PhotoUploadModal
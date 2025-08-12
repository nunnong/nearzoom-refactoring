'use client'

import {
  HeartIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Masonry from 'react-masonry-css'

import DeleteConfirmModal from './DeleteConfirmModal'
import EditConfirmModal from './EditConfirmModal'
import ShareModal from './ShareModal'
import AuthenticatedImage from './AuthenticatedImage'
import { myroomService } from '@/services/myroomService'

interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

interface ImageArchiveProps {
  images?: ImageItem[]
  onLike?: (imageId: string) => void
  onShareKakao?: (imageId: string) => void
  onDelete?: (imageId: string) => void
  onEdit?: (imageId: string) => void
  onLoadMore?: () => Promise<void>
  hasMoreProp?: boolean
}

// debounce 함수
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const ImageArchive: React.FC<ImageArchiveProps> = ({
  images: propImages,
  onLike,
  onShareKakao,
  onDelete,
  onEdit,
  onLoadMore,
  hasMoreProp,
}) => {
  const [images, setImages] = useState<ImageItem[]>(propImages || [])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // 반응형 limit 계산 함수
  const calculateLimit = useCallback(() => {
    const screenWidth = window.innerWidth
    if (screenWidth < 640) return 6   // 모바일: 1열 × 6개
    if (screenWidth < 768) return 12  // 작은 태블릿: 2열 × 6개  
    if (screenWidth < 1024) return 18 // 태블릿: 3열 × 6개
    if (screenWidth < 1280) return 24 // 데스크톱: 4열 × 6개
    if (screenWidth < 1536) return 30 // 큰 데스크톱: 5열 × 6개
    return 36 // 매우 큰 화면: 6열 × 6개
  }, [])

  // 초기 사진 데이터 가져오기 (커서 기반)
  const fetchPhotos = useCallback(async (cursor: number | null = null, isReset: boolean = false) => {
    if (propImages && propImages.length > 0) {
      return
    }

    try {
      if (!cursor) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }
      
      const limit = calculateLimit()
      
      const condition: any = { limit }
      if (cursor) {
        condition.cursor = cursor
      }
      
      const response = await myroomService.getPhotos(condition)
      
      // myroomService.getPhotos()는 MyPhotoListResponse를 직접 반환
      const photosData = response.photos           // MyPhotoResponse[] photos
      const nextCursor = response.nextCursor       // number | undefined nextCursor  
      const hasNext = response.hasNext             // boolean hasNext
      
      if (!Array.isArray(photosData)) {
        throw new Error('응답 데이터가 배열 형식이 아닙니다.')
      }
      
      const formattedImages: ImageItem[] = photosData.map((photo: any) => ({
        id: photo.photoId.toString(),         // DB photo_id
        // photoId만 저장 (AuthenticatedImage에서 /myroom/image/{photoId} 요청에 사용)
        src: photo.photoId.toString(), // 숫자 photoId만 저장
        alt: `Photo ${photo.photoId}`,        // 기본값
        isLiked: photo.heart === 1,          // DB heart (1: true, 0: false)
        isEdited: !photo.editable,           // DB editable (false면 편집됨)
        hashtags: []                         // hashtags 필드 없음
      }))

      // hasNext가 false면 더 이상 불러올 데이터가 없음
      if (!hasNext) {
        setHasMore(false)
      }

      if (isReset || !cursor) {
        setImages(formattedImages)
        setCursor(nextCursor ?? null)
      } else {
        setImages(prev => [...prev, ...formattedImages])
        setCursor(nextCursor ?? null)
      }
      
    } catch (err: any) {
      let errorMessage = '사진을 불러오는데 실패했습니다.'
      if (err?.response?.status === 404) {
        errorMessage = '아직 생성된 사진이 없습니다.'
      } else if (err?.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.'
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [propImages, calculateLimit])

  // 더 많은 사진 로드
  const fetchMorePhotos = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !cursor) return
    
    await fetchPhotos(cursor, false)
  }, [hasMore, loadingMore, loading, cursor, fetchPhotos])

  // 초기 로드
  useEffect(() => {
    fetchPhotos(null, true)
  }, [fetchPhotos])

  // 무한 스크롤 설정
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return

    const currentRef = loadMoreRef.current

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchMorePhotos()
        }
      },
      {
        rootMargin: '100px', // 요소가 뷰포트에 100px 전에 미리 로드
        threshold: 0.1
      }
    )

    observerRef.current.observe(currentRef)

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef)
      }
    }
  }, [hasMore, loadingMore, loading, fetchMorePhotos])

  // 반응형 리사이즈 이벤트
  useEffect(() => {
    const handleResize = debounce(() => {
      // 화면 크기가 바뀌면 처음부터 다시 로드
      setImages([])
      setCursor(null)
      setHasMore(true)
      setError(null)
      fetchPhotos(null, true)
    }, 300)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fetchPhotos, calculateLimit])

  // 모달 상태들
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [imageToDelete, setImageToDelete] = useState<ImageItem | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false)
  const [imageToShare, setImageToShare] = useState<ImageItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [imageToEdit, setImageToEdit] = useState<ImageItem | null>(null)

  const handleDeleteClick = (image: ImageItem): void => {
    setImageToDelete(image)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = (): void => {
    if (imageToDelete) {
      onDelete?.(imageToDelete.id)
      // 로컬 상태에서도 삭제
      setImages(prev => prev.filter(img => img.id !== imageToDelete.id))
      setDeleteModalOpen(false)
      setImageToDelete(null)
    }
  }

  const handleDeleteCancel = (): void => {
    setDeleteModalOpen(false)
    setImageToDelete(null)
  }

  const handleShareClick = (image: ImageItem): void => {
    setImageToShare(image)
    setShareModalOpen(true)
  }

  const handleShareClose = (): void => {
    setShareModalOpen(false)
    setImageToShare(null)
  }

  const handleEditClick = (image: ImageItem): void => {
    if (!image.isEdited) {
      setImageToEdit(image)
      setEditModalOpen(true)
    }
  }

  const handleEditConfirm = (): void => {
    if (imageToEdit) {
      onEdit?.(imageToEdit.id)
      // 로컬 상태에서도 편집 상태 업데이트
      setImages(prev => prev.map(img => 
        img.id === imageToEdit.id ? { ...img, isEdited: true } : img
      ))
      setEditModalOpen(false)
      setImageToEdit(null)
    }
  }

  const handleEditCancel = (): void => {
    setEditModalOpen(false)
    setImageToEdit(null)
  }

  const handleLikeClick = (imageId: string): void => {
    // 로컬 상태에서 즉시 업데이트 (Optimistic UI)
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, isLiked: !img.isLiked } : img
    ))
    onLike?.(imageId)
  }

  const breakpointColumnsObj = {
    default: 6,
    1536: 5,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1,
  }

  // 로딩 상태 표시
  if (loading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
        <p className="text-gray-500">사진을 불러오는 중...</p>
      </div>
    )
  }

  // 에러 상태 표시
  if (error && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-red-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-red-600">오류 발생</h3>
        <p className="text-gray-500">{error}</p>
        <button 
          onClick={() => fetchPhotos(null, true)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  // 이미지가 없을 때 표시할 메시지
  if (!loading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-600">
          아직 생성한 이미지가 없습니다
        </h3>
        <p className="text-gray-500">
          메인 페이지에서 AI와 함께 창작한 작품들이 여기에 저장됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {images.map(image => (
          <div
            key={image.id}
            data-image-id={image.id}
            className="group relative mb-4 overflow-hidden rounded-lg"
          >
            <AuthenticatedImage
              photoId={image.src} // src가 이제 photoId
              alt={image.alt}
              className="w-full cursor-pointer rounded-lg shadow-md transition-all duration-300 ease-in-out group-hover:scale-105"
              onError={() => {
                // 에러 처리
                const parent = document.querySelector(`[data-image-id="${image.id}"]`) as HTMLElement
                if (parent && !parent.dataset.errorHandled) {
                  parent.dataset.errorHandled = 'true'
                  parent.style.display = 'none'
                }
              }}
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

            {/* Like Button - Top Right */}
            <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <button
                onClick={() => handleLikeClick(image.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
                aria-label={image.isLiked ? 'Unlike image' : 'Like image'}
              >
                {image.isLiked ? (
                  <HeartSolidIcon className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 text-white" />
                )}
              </button>
            </div>

            {/* Bottom Action Buttons */}
            <div className="absolute right-3 bottom-3 left-3 flex justify-between opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              {/* Share Button - Left */}
              <button
                onClick={() => handleShareClick(image)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
                aria-label="Share image"
              >
                <ShareIcon className="h-4 w-4 text-white" />
              </button>

              {/* Share.png Button - Left Center */}
              <button
                onClick={() => {/* Share.png 관련 새로운 기능 */}}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
                aria-label="Share with Share.png"
              >
                <img src="/Share.png" alt="Share" className="h-5 w-5 object-contain" />
              </button>

              {/* Delete Button - Center */}
              <button
                onClick={() => handleDeleteClick(image)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-red-500/80"
                aria-label="Delete image"
              >
                <TrashIcon className="h-4 w-4 text-white" />
              </button>

              {/* Edit Button - Right */}
              <button
                onClick={() => handleEditClick(image)}
                disabled={image.isEdited}
                className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 ${
                  image.isEdited
                    ? 'cursor-not-allowed bg-gray-500/60'
                    : 'bg-white/20 hover:scale-110 hover:bg-blue-500/80'
                }`}
                aria-label={
                  image.isEdited ? 'Image already edited' : 'Edit image'
                }
              >
                {image.isEdited ? (
                  <span className="px-1 text-xs font-medium text-white">
                    edited
                  </span>
                ) : (
                  <PencilIcon className="h-4 w-4 text-white" />
                )}
              </button>
            </div>

            {/* Hashtags Overlay - Top Left */}
            <div className="absolute top-3 left-3 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <div className="max-w-[200px] rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
                {image.hashtags && image.hashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {image.hashtags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs font-medium text-white"
                      >
                        #{tag}
                      </span>
                    ))}
                    {image.hashtags.length > 3 && (
                      <span className="text-xs font-medium text-gray-300">
                        +{image.hashtags.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-white">{image.alt}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </Masonry>

      {/* 무한 스크롤 로딩 인디케이터 */}
      {hasMore && (
        <div 
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {loadingMore && (
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm text-gray-500">더 많은 사진을 불러오는 중...</span>
            </div>
          )}
        </div>
      )}

      {/* 더 이상 불러올 사진이 없을 때 */}
      {!hasMore && images.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">모든 사진을 불러왔습니다</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        image={imageToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        image={imageToShare}
        onClose={handleShareClose}
        onShareKakao={onShareKakao || (() => {})}
      />

      {/* Edit Confirm Modal */}
      <EditConfirmModal
        isOpen={editModalOpen}
        image={imageToEdit}
        onConfirm={handleEditConfirm}
        onCancel={handleEditCancel}
      />

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={async () => {
              if (onLoadMore && !loadingMore) {
                setLoadingMore(true)
                try {
                  await onLoadMore()
                } catch (error) {
                  console.error('Failed to load more images:', error)
                } finally {
                  setLoadingMore(false)
                }
              }
            }}
            disabled={loadingMore}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                더 불러오는 중...
              </>
            ) : (
              '더 보기'
            )}
          </button>
        </div>
      )}
    </>
  )
}

export default ImageArchive
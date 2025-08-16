
import {
  HeartIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Masonry from 'react-masonry-css'

import DeleteConfirmModal from './DeleteConfirmModal'
import EditConfirmModal from './EditConfirmModal'
import ShareModal from './ShareModal'
import { myroomService } from '@/services/myroomService'
import { ImageItem } from './Dashboard'

interface ImageArchiveProps {
  images?: ImageItem[]
  onLike?: (photoId: string) => void
  onShareKakao?: (photoId: string) => void
  onDelete?: (photoId: string) => void
  onEdit?: (photoId: string, editedImageUrl: string) => Promise<void>
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
}

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

const ImageArchive: React.FC<ImageArchiveProps> = React.memo(({
  images = [],
  onLike,
  onShareKakao,
  onDelete,
  onEdit,
  onLoadMore,
  hasMore = false,
}) => {
  // 모달 상태들
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [imageToDelete, setImageToDelete] = useState<ImageItem | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false)
  const [imageToShare, setImageToShare] = useState<ImageItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [imageToEdit, setImageToEdit] = useState<ImageItem | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // 무한 스크롤을 위한 ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // 더 많은 이미지 로드
  const fetchMoreImages = useCallback(async () => {
    if (!hasMore || loadingMore || !onLoadMore) return
    
    setLoadingMore(true)
    try {
      await onLoadMore()
    } catch (error) {
      console.error('Failed to load more images:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, onLoadMore])

  // 모달 열기/닫기 함수들
  const openDeleteModal = useCallback((image: ImageItem) => {
    setImageToDelete(image)
    setDeleteModalOpen(true)
  }, [])

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false)
    setImageToDelete(null)
  }, [])

  const openShareModal = useCallback((image: ImageItem) => {
    setImageToShare(image)
    setShareModalOpen(true)
  }, [])

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false)
    setImageToShare(null)
  }, [])

  const openEditModal = useCallback((image: ImageItem) => {
    setImageToEdit(image)
    setEditModalOpen(true)
  }, [])

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false)
    setImageToEdit(null)
  }, [])

  // 이미지 액션 핸들러들
  const handleLike = useCallback((photoId: string) => {
    onLike?.(photoId)
  }, [onLike])

  const handleShareKakao = useCallback((photoId: string) => {
    onShareKakao?.(photoId)
  }, [onShareKakao])

  const handleDelete = useCallback((photoId: string) => {
    onDelete?.(photoId)
  }, [onDelete])

  const handleEdit = useCallback(async (photoId: string, editedImageUrl: string) => {
    await onEdit?.(photoId, editedImageUrl)
  }, [onEdit])

  // 메모이제이션된 값들
  const breakpointColumns = useMemo(() => ({
    default: 5,
    1400: 4,
    1100: 4,
    900: 3,
    600: 2,
    400: 1
  }), [])

  const imageCount = useMemo(() => images.length, [images])

  // 무한 스크롤 설정
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || !onLoadMore) return

    const currentRef = loadMoreRef.current

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loadingMore) {
          fetchMoreImages()
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.1
      }
    )

    observerRef.current.observe(currentRef)

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef)
      }
    }
  }, [hasMore, loadingMore, fetchMoreImages, onLoadMore])

  const handleDeleteClick = (image: ImageItem): void => {
    setImageToDelete(image)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = (): void => {
    if (imageToDelete) {
      onDelete?.(imageToDelete.photoId)
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
    if (image.editable === 1) {  // editable === 1인 경우만 편집 가능
      setImageToEdit(image)
      setEditModalOpen(true)
    }
  }

  const handleEditConfirm = async (): Promise<void> => {
    if (imageToEdit) {
      try {
        // 편집 페이지로 이동 (photoId와 imgUrl 파라미터 전달)
        const editUrl = `/drawing?id=${imageToEdit.photoId}&src=${encodeURIComponent(imageToEdit.imgUrl)}&returnUrl=${encodeURIComponent('/myroom')}`
        window.location.href = editUrl
        
        setEditModalOpen(false)
        setImageToEdit(null)
      } catch (error) {
        console.error('편집 시작 실패:', error)
      }
    }
  }

  const handleEditCancel = (): void => {
    setEditModalOpen(false)
    setImageToEdit(null)
  }

  const handleLikeClick = (photoId: string): void => {
    onLike?.(photoId)
  }

  // 이미지가 없을 때 표시할 메시지
  if (images.length === 0) {
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
        breakpointCols={breakpointColumns}
        className="-ml-2 flex w-auto px-6"
        columnClassName="pl-2 bg-clip-padding"
      >
        {images.map(image => (
          <div
            key={image.photoId}
            data-image-id={image.photoId}
            className="group relative mb-2 overflow-hidden rounded-lg"
          >
            <img
              src={image.imgUrl}
              alt={image.alt || '이미지'}
              className="w-full h-auto cursor-pointer rounded-lg shadow-sm transition-all duration-300 ease-in-out group-hover:scale-105"
              loading="lazy"
              onError={() => {
                // 에러 처리
                const parent = document.querySelector(`[data-image-id="${image.photoId}"]`) as HTMLElement
                if (parent && !parent.dataset.errorHandled) {
                  parent.dataset.errorHandled = 'true'
                  parent.style.display = 'none'
                }
              }}
            />

            <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

            <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <button
                onClick={() => handleLikeClick(image.photoId)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
                aria-label={image.isLiked ? 'Unlike image' : 'Like image'}
              >
                {image.isLiked ? (
                  <HeartSolidIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <HeartIcon className="h-4 w-4 text-white" />
                )}
              </button>
            </div>

            <div className="absolute right-2 bottom-2 left-2 flex justify-between opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              {/* Share Button - Left */}
              <button
                onClick={() => handleShareClick(image)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
                aria-label="Share image"
              >
                <ShareIcon className="h-3 w-3 text-white" />
              </button>
              
              {/* Delete Button - Center */}
              <button
                onClick={() => handleDeleteClick(image)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-red-500/80"
                aria-label="Delete image"
              >
                <TrashIcon className="h-3 w-3 text-white" />
              </button>

              {/* Edit Button - Right */}
              <button
                onClick={() => handleEditClick(image)}
                disabled={image.editable === 0}
                className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 ${
                  image.editable === 0
                    ? 'cursor-not-allowed bg-gray-500/60'
                    : 'bg-white/20 hover:scale-110 hover:bg-blue-500/80'
                }`}
                aria-label={
                  image.editable === 0 ? 'Image already edited' : 'Edit image'
                }
              >
                {image.editable === 0 ? (
                  <span className="px-1 text-xs font-medium text-white">
                    edited
                  </span>
                ) : (
                  <PencilIcon className="h-3 w-3 text-white" />
                )}
              </button>
            </div>

            {/* Hashtags Overlay - Top Left */}
            <div className="absolute top-2 left-2 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <div className="max-w-[150px] rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                {image.hashtags && image.hashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-0.5">
                    {image.hashtags.slice(0, 3).map((tag, index) => (
                      <span
                        key={`${image.photoId}-tag-${index}`}
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
                  <p className="text-xs font-medium text-white">{image.alt || '이미지'}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </Masonry>

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

      {!hasMore && images.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">모든 사진을 불러왔습니다</p>
        </div>
      )}

      {/* Load More Button (추가 옵션) */}
      {hasMore && onLoadMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchMoreImages}
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
    </>
  )
})

export default ImageArchive
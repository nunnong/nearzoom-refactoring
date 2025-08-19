'use client'

import React, { useState, useCallback, forwardRef } from 'react'
import Masonry from 'react-masonry-css'
import {
  HeartIcon,
  HeartIcon as HeartSolidIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

import DeleteConfirmModal from './DeleteConfirmModal'
import ShareModal from './ShareModal'
import EditConfirmModal from './EditConfirmModal'

// 이미지 확대 모달 컴포넌트
const ImageZoomModal = ({ 
  isOpen, 
  image, 
  onClose 
}: { 
  isOpen: boolean; 
  image: ImageItem | null; 
  onClose: () => void; 
}) => {
  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-4xl max-h-[90vh] mx-4">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* 이미지 */}
        <img
          src={image.imgUrl}
          alt={image.alt || '확대된 이미지'}
          className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        
        {/* 이미지 정보 */}
        <div className="mt-4 text-center text-white">
          <p className="text-sm opacity-80">
            {image.alt || '이미지'}
          </p>
        </div>
      </div>
    </div>
  );
};

export interface ImageItem {
  photoId: string
  imgUrl: string
  alt?: string
  isLiked?: boolean
  isEdited?: boolean
  editable?: number         // 1: 편집 가능, 0: 편집 불가능
  hashtags?: string[]
}

interface ImageArchiveProps {
  images: ImageItem[]
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  onLike?: (photoId: string) => Promise<void>
  onShareKakao?: (photoId: string) => void
  onDelete?: (photoId: string) => Promise<void>
  onEdit?: (photoId: string, editedImageUrl: string) => Promise<void>
}

const ImageArchive = forwardRef<HTMLDivElement, ImageArchiveProps>(({
  images,
  onLoadMore,
  hasMore,
  onLike,
  onShareKakao,
  onDelete,
  onEdit
}, loadMoreRef) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ImageItem | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [imageToShare, setImageToShare] = useState<ImageItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [imageToEdit, setImageToEdit] = useState<ImageItem | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [zoomModalOpen, setZoomModalOpen] = useState(false)
  const [imageToZoom, setImageToZoom] = useState<ImageItem | null>(null)

  // 반응형 컬럼 설정
  const breakpointColumns = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  }

  const handleDeleteClick = useCallback((image: ImageItem) => {
    setImageToDelete(image)
    setDeleteModalOpen(true)
  }, [])

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false)
    setImageToDelete(null)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (imageToDelete && onDelete) {
      try {
        await onDelete(imageToDelete.photoId)
        setDeleteModalOpen(false)
        setImageToDelete(null)
      } catch (error) {
        console.error('이미지 삭제 실패:', error)
      }
    }
  }, [imageToDelete, onDelete])

  const handleShareClick = useCallback((image: ImageItem) => {
    console.log('🔗 공유 버튼 클릭됨:', image.photoId)
    setImageToShare(image)
    setShareModalOpen(true)
    console.log('✅ 공유 모달 상태 업데이트됨')
  }, [])

  const handleShareClose = useCallback(() => {
    setShareModalOpen(false)
    setImageToShare(null)
  }, [])

  const handleEditClick = useCallback((image: ImageItem) => {
    setImageToEdit(image)
    setEditModalOpen(true)
  }, [])

  const handleEditConfirm = useCallback(async () => {
    if (imageToEdit) {
      try {
        await onEdit?.(imageToEdit.photoId, 'new_edited_image_url')
        setEditModalOpen(false)
        setImageToEdit(null)
      } catch (error) {
        console.error('이미지 편집 실패:', error)
      }
    }
  }, [imageToEdit, onEdit])

  const handleEditCancel = useCallback(() => {
    setEditModalOpen(false)
    setImageToEdit(null)
  }, [])

  const handleLikeClick = useCallback((photoId: string) => {
    onLike?.(photoId)
  }, [onLike])

  const handleImageZoom = useCallback((image: ImageItem) => {
    setImageToZoom(image)
    setZoomModalOpen(true)
  }, [])

  const handleZoomClose = useCallback(() => {
    setZoomModalOpen(false)
    setImageToZoom(null)
  }, [])

  const fetchMoreImages = useCallback(async () => {
    if (onLoadMore && !loadingMore) {
      setLoadingMore(true)
      try {
        await onLoadMore()
      } catch (error) {
        console.error('추가 이미지 로드 실패:', error)
      } finally {
        setLoadingMore(false)
      }
    }
  }, [onLoadMore, loadingMore])

  // 이미지가 없을 때 표시할 메시지
  if (images.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 이미지가 들어오는 부분만 흰색 둥근 박스 */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <Masonry
          breakpointCols={breakpointColumns}
          className="-ml-6 flex w-auto"
          columnClassName="pl-6 bg-clip-padding"
        >
          {images.map((image, index) => (
            <div
              key={image.photoId}
              data-image-id={image.photoId}
              className="group relative mb-8 overflow-hidden rounded-lg transform hover:scale-105 transition-all duration-300"
            >
              <img
                src={image.imgUrl}
                alt={image.alt || '이미지'}
                className="w-full h-auto cursor-pointer rounded-lg shadow-lg transition-all duration-300 ease-in-out group-hover:scale-110"
                loading="lazy"
                onClick={() => handleImageZoom(image)}
                onError={() => {
                  // 에러 처리
                  const parent = document.querySelector(`[data-image-id="${image.photoId}"]`) as HTMLElement
                  if (parent && !parent.dataset.errorHandled) {
                    parent.dataset.errorHandled = 'true'
                    parent.style.display = 'none'
                  }
                }}
              />

              {/* 돋보기 아이콘 (호버 시 표시) */}
              <div className="absolute top-2 left-2 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
                  <MagnifyingGlassIcon className="h-4 w-4 text-white" />
                </div>
              </div>

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
      </div>

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

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={zoomModalOpen}
        image={imageToZoom}
        onClose={handleZoomClose}
      />
    </>
  )
})

ImageArchive.displayName = 'ImageArchive'

export default ImageArchive
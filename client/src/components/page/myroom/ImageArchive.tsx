'use client'

import {
  HeartIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import React, { useState } from 'react'
import Masonry from 'react-masonry-css'

import DeleteConfirmModal from './DeleteConfirmModal'
import EditConfirmModal from './EditConfirmModal'
import ShareModal from './ShareModal'

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
  onWriteFeed?: (imageId: string) => void // Feed쪽으로 보내기
}

const ImageArchive: React.FC<ImageArchiveProps> = ({
  images = [],
  onLike,
  onShareKakao,
  onDelete,
  onEdit,
  onWriteFeed,
}) => {
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
      setEditModalOpen(false)
      setImageToEdit(null)
    }
  }

  const handleEditCancel = (): void => {
    setEditModalOpen(false)
    setImageToEdit(null)
  }

  const breakpointColumnsObj = {
    default: 6,
    1536: 5,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1,
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
        breakpointCols={breakpointColumnsObj}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {images.map(image => (
          <div
            key={image.id}
            className="group relative mb-4 overflow-hidden rounded-lg"
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full cursor-pointer rounded-lg shadow-md transition-all duration-300 ease-in-out group-hover:scale-105"
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

            {/* Like Button - Top Right */}
            <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <button
                onClick={() => onLike?.(image.id)}
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
}

export default ImageArchive

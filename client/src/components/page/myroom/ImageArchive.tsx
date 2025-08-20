'use client'

import React, { useState, useCallback, forwardRef, useEffect } from 'react'
import Masonry from 'react-masonry-css'
import {
  HeartIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

import DeleteConfirmModal from './DeleteConfirmModal'
import ShareModal from './ShareModal'
import EditConfirmModal from './EditConfirmModal'

// CSS animations for processing effects
const processingStyles = `
  @keyframes processingGlow {
    0% { 
      box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.2);
      border-color: rgb(251, 191, 36);
    }
    100% { 
      box-shadow: 0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.3);
      border-color: rgb(245, 158, 11);
    }
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes scanLine {
    0% { top: 0%; opacity: 1; }
    50% { top: 50%; opacity: 0.8; }
    100% { top: 100%; opacity: 0; }
  }
`

// 이미지 확대 모달 컴포넌트
const ImageZoomModal = ({
  isOpen,
  image,
  onClose,
}: {
  isOpen: boolean
  image: ImageItem | null
  onClose: () => void
}) => {
  if (!isOpen || !image) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] max-w-4xl">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* 이미지 */}
        <img
          src={image.imgUrl}
          alt={image.alt || '확대된 이미지'}
          className="h-auto max-h-[80vh] w-full rounded-lg object-contain shadow-2xl"
        />

        {/* 이미지 정보 */}
        <div className="mt-4 text-center text-white">
          <p className="text-sm opacity-80">{image.alt || '이미지'}</p>
        </div>
      </div>
    </div>
  )
}

export interface ImageItem {
  photoId: string
  imgUrl: string
  alt?: string
  isLiked?: boolean
  isEdited?: boolean
  editable?: number
  hashtags?: string[]
  createdAt?: string
  partnerEmails?: string | string[]
}

interface ProcessingJob {
  jobId: string
  originalImageUrl?: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  currentStepImage?: string
  artifacts?: {
    final?: string
    gpt?: string
  }
  error?: string | null
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

const ImageArchive = forwardRef<HTMLDivElement, ImageArchiveProps>(
  (
    { images, onLoadMore, hasMore, onLike, onShareKakao, onDelete, onEdit },
    loadMoreRef
  ) => {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [imageToDelete, setImageToDelete] = useState<ImageItem | null>(null)
    const [shareModalOpen, setShareModalOpen] = useState(false)
    const [imageToShare, setImageToShare] = useState<ImageItem | null>(null)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [imageToEdit, setImageToEdit] = useState<ImageItem | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const [zoomModalOpen, setZoomModalOpen] = useState(false)
    const [imageToZoom, setImageToZoom] = useState<ImageItem | null>(null)
    const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])

    // 반응형 컬럼 설정 - 사진을 더 작게 만들기 위해 컬럼 수 증가
    const breakpointColumns = {
      default: 6,
      1400: 5,
      1100: 4,
      800: 3,
      600: 2,
      500: 1,
    }

    // 진행중인 이미지용 컬럼 설정 - 컬럼 수를 절반으로 줄여서 이미지를 2배 크게 표시
    const processingBreakpointColumns = {
      default: 3,
      1400: 2,
      1100: 2,
      800: 2,
      600: 1,
      500: 1,
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
      // 편집 시작: 모달만 닫고 상태 정리 (저장은 /drawing에서 수행)
      setEditModalOpen(false)
      setImageToEdit(null)
    }, [])

    const handleEditCancel = useCallback(() => {
      setEditModalOpen(false)
      setImageToEdit(null)
    }, [])

    const handleLikeClick = useCallback(
      (photoId: string) => {
        onLike?.(photoId)
      },
      [onLike]
    )

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

    // Job status polling
    useEffect(() => {
      const loadProcessingJobs = () => {
        const jobData = JSON.parse(localStorage.getItem('jobIds') || '[]')
        if (jobData.length > 0) {
          setProcessingJobs(
            jobData.map((job: any) => ({
              jobId: typeof job === 'string' ? job : job.jobId,
              originalImageUrl: typeof job === 'object' ? job.originalImageUrl : undefined,
              status: 'processing' as const,
              progress: 0,
            }))
          )
        }
      }

      const checkAvailableStepImages = async (jobId: string) => {
        const baseUrl = `https://image.nearzoom.store/media/jobs/${jobId}`
        const stepImages = [
          'gpt_result.jpg',
          'temp_step_1.jpg', 
          'temp_step_2.jpg',
          'temp_step_3.jpg'
        ]
        
        // Check images in reverse order to get the latest available
        for (let i = stepImages.length - 1; i >= 0; i--) {
          try {
            const imageUrl = `${baseUrl}/${stepImages[i]}`
            const response = await fetch(imageUrl, { method: 'HEAD' })
            if (response.ok) {
              return imageUrl
            }
          } catch (error) {
            // Continue to next image
          }
        }
        return null
      }

      const pollJobStatus = async (jobId: string) => {
        try {
          const response = await fetch(`https://image.nearzoom.store/jobs/${jobId}`)
          if (response.ok) {
            const jobData = await response.json()
            
            // Check for available step images
            const currentStepImage = await checkAvailableStepImages(jobId)
            
            handleJobStatusUpdate(jobId, { ...jobData, currentStepImage })
          }
        } catch (error) {
          console.error(`Job status polling failed for ${jobId}:`, error)
        }
      }

      const handleJobStatusUpdate = (jobId: string, jobData: any) => {
        if (jobData.status === 'completed' || jobData.status === 'failed') {
          console.log(`💾 Job ${jobId} ${jobData.status}:`, jobData)
          
          // Remove from processing display
          setProcessingJobs(prev => prev.filter(job => job.jobId !== jobId))
          
          // Remove from localStorage
          const existingJobData = JSON.parse(localStorage.getItem('jobIds') || '[]')
          const updatedJobData = existingJobData.filter((job: any) => {
            const currentJobId = typeof job === 'string' ? job : job.jobId
            return currentJobId !== jobId
          })
          localStorage.setItem('jobIds', JSON.stringify(updatedJobData))
          
          if (jobData.status === 'completed') {
            console.log(`✅ Job completed: ${jobId}`)
          } else {
            console.log(`❌ Job failed: ${jobId}`, jobData.error)
          }
        } else {
          // Update progress for processing jobs
          setProcessingJobs(prev => 
            prev.map(job => 
              job.jobId === jobId 
                ? { 
                    ...job, 
                    status: jobData.status, 
                    progress: Math.max(0, jobData.progress),
                    currentStepImage: jobData.currentStepImage,
                    error: jobData.error 
                  }
                : job
            )
          )
        }
      }

      // Initial load
      loadProcessingJobs()

      // Set up polling interval
      const intervalId = setInterval(() => {
        const currentJobData = JSON.parse(localStorage.getItem('jobIds') || '[]')
        currentJobData.forEach((job: any) => {
          const jobId = typeof job === 'string' ? job : job.jobId
          pollJobStatus(jobId)
        })
      }, 5000) // Poll every 5 seconds

      // Cleanup interval on unmount
      return () => clearInterval(intervalId)
    }, [])

    // 이미지가 없을 때 표시할 메시지
    if (images.length === 0) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-100">
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
        {/* Processing Animation Styles */}
        <style jsx>{processingStyles}</style>
        
        {/* Processing Jobs Section */}
        {processingJobs.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Processing Images ({processingJobs.length})
            </h3>
            <Masonry
              breakpointCols={processingBreakpointColumns}
              className="-ml-6 flex w-auto"
              columnClassName="pl-6 bg-clip-padding"
            >
              {processingJobs.map((job) => (
                <div
                  key={job.jobId}
                  className="group relative mb-8 transform overflow-hidden rounded-lg border-2 border-yellow-400 bg-yellow-50 transition-all duration-300 animate-pulse"
                  style={{
                    boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.2)',
                    animation: 'processingGlow 2s ease-in-out infinite alternate'
                  }}
                >
                  {/* Image Area */}
                  <div className="relative aspect-square w-full">
                    {job.currentStepImage ? (
                      <img
                        src={job.currentStepImage}
                        alt="Processing step"
                        className="h-full w-full rounded-t-lg object-cover"
                        loading="lazy"
                      />
                    ) : job.originalImageUrl ? (
                      <div className="relative h-full w-full">
                        <img
                          src={job.originalImageUrl}
                          alt="Original image being processed"
                          className="h-full w-full rounded-t-lg object-cover"
                          loading="lazy"
                        />
                        {/* Shimmer overlay effect */}
                        <div 
                          className="absolute inset-0 rounded-t-lg"
                          style={{
                            background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
                            animation: 'shimmer 2s infinite linear'
                          }}
                        />
                        {/* Scanning line effect */}
                        <div 
                          className="absolute left-0 right-0 h-0.5 bg-yellow-400 opacity-80"
                          style={{
                            animation: 'scanLine 3s ease-in-out infinite'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-t-lg bg-gradient-to-br from-yellow-100 to-yellow-200">
                        <div className="text-center">
                          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent"></div>
                          <p className="text-xs font-medium text-yellow-700">Starting...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Processing Overlay with progress-based blur */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundColor: `rgba(0, 0, 0, ${0.3 - (job.progress / 100) * 0.15})`,
                        backdropFilter: `blur(${2 - (job.progress / 100) * 1.5}px)`
                      }}
                    />
                    
                    {/* Progress Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {job.progress === 0 ? '🔍 Analyzing...' :
                           job.progress < 30 ? '⚙️ Processing...' :
                           job.progress < 70 ? '🎨 Applying effects...' :
                           job.progress < 90 ? '✨ Finalizing...' : '🏁 Almost done...'}
                        </span>
                        <div className="flex items-center space-x-1">
                          {job.status === 'processing' && (
                            <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
                          )}
                          <span className="text-xs font-medium">
                            {job.progress > 0 ? `${job.progress}%` : 'Starting...'}
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/30">
                        <div
                          className="h-1 rounded-full bg-white transition-all duration-300"
                          style={{ width: `${Math.max(0, job.progress)}%` }}
                        />
                      </div>
                      {job.error && (
                        <p className="mt-1 text-xs text-red-300">{job.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </Masonry>
          </div>
        )}

        {/* 이미지가 들어오는 부분만 흰색 둥근 박스 */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <Masonry
            breakpointCols={breakpointColumns}
            className="-ml-6 flex w-auto"
            columnClassName="pl-6 bg-clip-padding"
          >
            {images.map((image, index) => (
              <div
                key={image.photoId}
                data-image-id={image.photoId}
                className="group relative mb-8 transform overflow-hidden rounded-lg transition-all duration-300 hover:scale-105"
              >
                <img
                  src={image.imgUrl}
                  alt={image.alt || '이미지'}
                  className="h-auto w-full cursor-pointer rounded-lg shadow-lg transition-all duration-300 ease-in-out group-hover:scale-110"
                  loading="lazy"
                  onClick={() => handleImageZoom(image)}
                  onError={() => {
                    // 에러 처리
                    const parent = document.querySelector(
                      `[data-image-id="${image.photoId}"]`
                    ) as HTMLElement
                    if (parent && !parent.dataset.errorHandled) {
                      parent.dataset.errorHandled = 'true'
                      parent.style.display = 'none'
                    }
                  }}
                />

                {/* 돋보기 버튼 제거 - 이미지를 클릭하면 바로 확대됨 */}

                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

                <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
                  <button
                    onClick={() => handleLikeClick(image.photoId)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/30"
                    aria-label={image.isLiked ? 'Unlike image' : 'Like image'}
                  >
                    {image.isLiked ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-600 fill-current" />
                    ) : (
                      <HeartIcon className="h-5 w-4 text-white stroke-2" />
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
                      image.editable === 0
                        ? 'Image already edited'
                        : 'Edit image'
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
                      <p className="text-xs font-medium text-white">
                        {image.alt || '이미지'}
                      </p>
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
                <span className="text-sm text-gray-500">
                  더 많은 사진을 불러오는 중...
                </span>
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
              className="flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loadingMore ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
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
  }
)

ImageArchive.displayName = 'ImageArchive'

export default ImageArchive

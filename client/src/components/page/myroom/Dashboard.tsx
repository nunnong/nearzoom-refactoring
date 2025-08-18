'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useCallback, useMemo } from 'react'
import { useState } from 'react'

import { User } from '@/types/auth'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'

import ImageArchive from './ImageArchive'
import SearchBox from './SearchBox'
import UploadSelfieModal from './UploadSelfieModal'
import { useAuthStore } from '@/stores/authStore'

export interface ImageItem {
  photoId: string
  imgUrl: string
  alt?: string
  isLiked?: boolean
  isEdited?: boolean
  editable?: number         // 1: 편집 가능, 0: 편집 불가능
  hashtags?: string[]
}

interface Filter {
  id: string
  type: 'heart' | 'name' | 'date' | 'edited'
  value: string
  display: string
}



interface DashboardProps {
  images?: ImageItem[]
  userProfile?: User | null
  onRefresh?: (condition?: MyPhotoListCondition) => Promise<void>
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  onLike?: (photoId: string) => Promise<void>
  onShareKakao?: (photoId: string) => void
  onDelete?: (photoId: string) => Promise<void>
  onEdit?: (photoId: string, editedImageUrl: string) => Promise<void>
}

const Dashboard: React.FC<DashboardProps> = ({ 
  images = [], 
  userProfile, 
  onRefresh, 
  onLoadMore, 
  hasMore,
  onLike,
  onShareKakao,
  onDelete,
  onEdit
}) => {
  const router = useRouter()
  const actualUser = userProfile
  
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([]) // 🚀 필터링된 이미지 상태 추가
  const [isUploadSelfieModalOpen, setIsUploadSelfieModalOpen] = useState<boolean>(false)

  // 🚀 이미지 목록 업데이트 시 필터링된 이미지도 업데이트
  useEffect(() => {
    setImageList(images)
    setFilteredImages(images)
  }, [images])

  // 🚀 필터 변경 핸들러 (클라이언트 사이드 필터링)
  const handleFiltersChange = useCallback((filters: Filter[]) => {
    if (filters.length === 0) {
      // 필터가 없으면 모든 이미지 표시
      setFilteredImages(imageList)
      return
    }

    // 클라이언트 사이드에서 필터링 수행
    let filtered = [...imageList]

    filters.forEach(filter => {
      switch (filter.type) {
        case 'heart':
          filtered = filtered.filter(img => img.isLiked)
          break
        case 'edited':
          if (filter.value === 'edited') {
            filtered = filtered.filter(img => img.isEdited)
          } else if (filter.value === 'not_edited') {
            filtered = filtered.filter(img => !img.isEdited)
          }
          break
        case 'date':
          // 날짜 필터링 로직 (필요시 구현)
          break
        case 'name':
          // 이름 필터링 로직 (필요시 구현)
          break
      }
    })

    setFilteredImages(filtered)
  }, [imageList])

  // 🚀 이미지 새로고침
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh()
    }
  }, [onRefresh])

  // 🚀 추가 이미지 로딩
  const handleLoadMore = useCallback(async () => {
    if (onLoadMore && hasMore) {
      await onLoadMore()
    }
  }, [onLoadMore, hasMore])

  // 🚀 좋아요 토글
  const handleLike = useCallback(async (photoId: string) => {
    if (onLike) {
      await onLike(photoId)
    }
  }, [onLike])

  // 🚀 이미지 삭제
  const handleDelete = useCallback(async (photoId: string) => {
    if (onDelete) {
      await onDelete(photoId)
    }
  }, [onDelete])

  // 🚀 이미지 편집
  const handleEdit = useCallback(async (photoId: string, editedImageUrl: string) => {
    if (onEdit) {
      await onEdit(photoId, editedImageUrl)
    }
  }, [onEdit])

  // 🚀 셀피 업로드 모달 열기
  const handleUploadSelfie = useCallback(() => {
    setIsUploadSelfieModalOpen(true)
  }, [])

  // 🚀 셀피 업로드 모달 닫기
  const handleCloseUploadSelfieModal = useCallback(() => {
    setIsUploadSelfieModalOpen(false)
  }, [])

  // 🚀 이미지 공유 (카카오톡)
  const handleShareKakao = useCallback((photoId: string) => {
    if (onShareKakao) {
      onShareKakao(photoId)
    }
  }, [onShareKakao])

  // 🚀 프로필 설정 페이지로 이동
  const handleAccount = useCallback(() => {
    router.push('/profile')
  }, [router])



  return (
    <div className="min-h-screen bg-white">
      {/* 🚀 검색 및 필터 영역 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-6 shadow-sm">
        <div className="flex justify-center">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">ALBUM</h2>
            <p className="text-blue-700 text-sm">나만의 특별한 순간들을 정리해보세요</p>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="w-[30rem] ml-16">
            <SearchBox
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </div>
      </div>

      {/* 🚀 이미지 아카이브 - 깔끔한 흰색 그리드 */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-0">
            {/* 왼쪽 공간 */}
            <div className="col-span-0.5 bg-gray-50 min-h-screen"></div>
            
            {/* 중앙 콘텐츠 영역 */}
            <div className="col-span-11 p-4 bg-white">
              <ImageArchive
                images={filteredImages}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                onLike={handleLike}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onShareKakao={handleShareKakao}
              />
            </div>
            
            {/* 오른쪽 공간 */}
            <div className="col-span-0.5 bg-gray-50 min-h-screen"></div>
          </div>
        </div>
      </div>

      {/* 🚀 셀피 업로드 모달 */}
      {isUploadSelfieModalOpen && (
        <UploadSelfieModal
          isOpen={isUploadSelfieModalOpen}
          onClose={handleCloseUploadSelfieModal}
        />
      )}
    </div>
  )
}

export default Dashboard
'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useCallback, useMemo } from 'react'
import { useState } from 'react'

import { User } from '@/types/auth'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'

import ImageArchive from './ImageArchive'
import SearchBox from './SearchBox'
import UploadSelfieModal from './UploadSelfieModal'
import { useAuth } from '@/hooks/auth'

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
  const { handleLogout, handleDeleteAccount, isLoading } = useAuth()
  const actualUser = userProfile
  
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([]) // 🚀 필터링된 이미지 상태 추가
  const [isUploadSelfieModalOpen, setIsUploadSelfieModalOpen] = useState<boolean>(false)

  // 🚀 이미지 목록 업데이트 시 필터링된 이미지도 업데이트
  useEffect(() => {
    setImageList(images)
    setFilteredImages(images)
    console.log('📸 Dashboard received images:', images)
  }, [images])

  // 🚀 필터 변경 핸들러 (클라이언트 사이드 필터링)
  const handleFiltersChange = useCallback((filters: Filter[]) => {
    console.log('🔍 필터 변경:', filters)
    
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
          filtered = filtered.filter(img => img.isEdited)
          break
        case 'date':
          // 날짜 필터링 로직 (추후 구현)
          break
        case 'name':
          // 이름 검색 필터링 (추후 구현)
          break
      }
    })

    setFilteredImages(filtered)
    console.log('✅ 필터링 완료:', { 
      originalCount: imageList.length, 
      filteredCount: filtered.length,
      filters: filters.map(f => f.type)
    })
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

  // 🚀 로그아웃
  const handleLogoutClick = useCallback(async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      await handleLogout()
      router.push('/')
    }
  }, [handleLogout, router])

  // 🚀 계정 삭제
  const handleDeleteAccountClick = useCallback(async () => {
    const confirmMsg1 = '정말로 계정을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.'
    const confirmMsg2 = '모든 게시물, 팔로우 관계, 개인 정보가 영구적으로 삭제됩니다.\n\n정말로 계속하시겠습니까?'
    
    if (confirm(confirmMsg1)) {
      if (confirm(confirmMsg2)) {
        try {
          await handleDeleteAccount()
          alert('계정이 성공적으로 삭제되었습니다.')
          router.push('/')
        } catch (error) {
          console.error('계정 삭제 실패:', error)
          alert('계정 삭제에 실패했습니다.')
        }
      }
    }
  }, [handleDeleteAccount, router])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🚀 검색 및 필터 영역 - 전체 너비 사용 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <SearchBox 
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* 🚀 이미지 아카이브 - 전체 너비 사용 */}
      <div className="flex-1 p-4">
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
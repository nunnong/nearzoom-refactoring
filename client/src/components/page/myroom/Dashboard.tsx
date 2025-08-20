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
  editable?: number // 1: 편집 가능, 0: 편집 불가능
  hashtags?: string[]
  partnerEmails?: string | string[] // 파트너 이메일 정보
  createdAt?: string // 생성 날짜
  takenAt?: string // 촬영 날짜
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
  onEdit,
}) => {
  const router = useRouter()
  const actualUser = userProfile

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([]) // 🚀 필터링된 이미지 상태 추가
  const [isUploadSelfieModalOpen, setIsUploadSelfieModalOpen] =
    useState<boolean>(false)

  // 🚀 이미지 목록 업데이트 시 필터링된 이미지도 업데이트
  useEffect(() => {
    setImageList(images)
    setFilteredImages(images)
  }, [images])

  // 🚀 필터 변경 핸들러 (클라이언트 사이드 필터링)
  const handleFiltersChange = useCallback(
    (filters: Filter[]) => {
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
            // 날짜 필터링 로직 구현
            if (filter.value.includes('~')) {
              // 범위 날짜 필터 (시작일 ~ 종료일)
              const [startDateStr, endDateStr] = filter.value.split('~').map(d => d.trim())
              
              filtered = filtered.filter(img => {
                const imgDate = img.createdAt || img.takenAt
                if (!imgDate) return false
                
                const imgDateObj = new Date(imgDate)
                const startDate = new Date(startDateStr.replace(/\./g, '-'))
                const endDate = endDateStr ? new Date(endDateStr.replace(/\./g, '-')) : new Date()
                
                // 종료일이 없으면 시작일만 체크
                if (!endDateStr) {
                  return imgDateObj >= startDate
                }
                
                // 범위 내에 있는지 체크
                return imgDateObj >= startDate && imgDateObj <= endDate
              })
            } else {
              // 단일 날짜 필터
              const targetDate = new Date(filter.value.replace(/\./g, '-'))
              
              filtered = filtered.filter(img => {
                const imgDate = img.createdAt || img.takenAt
                if (!imgDate) return false
                
                const imgDateObj = new Date(imgDate)
                const targetDateObj = new Date(targetDate)
                
                // 같은 날짜인지 체크 (년, 월, 일만 비교)
                return imgDateObj.getFullYear() === targetDateObj.getFullYear() &&
                       imgDateObj.getMonth() === targetDateObj.getMonth() &&
                       imgDateObj.getDate() === targetDateObj.getDate()
              })
            }
            break
          case 'name':
            // 이름/이메일/친구 정보로 검색
            const searchTerm = filter.value.toLowerCase()
            filtered = filtered.filter(img => {
              // partnerEmails가 문자열인 경우 (쉼표로 구분된 이메일들)
              if (typeof img.partnerEmails === 'string') {
                const emails = img.partnerEmails.split(',').map(email => email.trim().toLowerCase())
                return emails.some(email => email.includes(searchTerm))
              }
              
              // partnerEmails가 배열인 경우
              if (Array.isArray(img.partnerEmails)) {
                return img.partnerEmails.some(email => 
                  email.toLowerCase().includes(searchTerm)
                )
              }
              
              // hashtags가 있는 경우 해시태그로도 검색
              if (img.hashtags && Array.isArray(img.hashtags)) {
                return img.hashtags.some(tag => 
                  tag.toLowerCase().includes(searchTerm)
                )
              }
              
              return false
            })
            break
        }
      })

      setFilteredImages(filtered)
    },
    [imageList]
  )

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
  const handleLike = useCallback(
    async (photoId: string) => {
      if (onLike) {
        await onLike(photoId)
      }
    },
    [onLike]
  )

  // 🚀 이미지 삭제
  const handleDelete = useCallback(
    async (photoId: string) => {
      if (onDelete) {
        await onDelete(photoId)
      }
    },
    [onDelete]
  )

  // 🚀 이미지 편집
  const handleEdit = useCallback(
    async (photoId: string, editedImageUrl: string) => {
      if (onEdit) {
        await onEdit(photoId, editedImageUrl)
      }
    },
    [onEdit]
  )

  // 🚀 셀피 업로드 모달 열기
  const handleUploadSelfie = useCallback(() => {
    setIsUploadSelfieModalOpen(true)
  }, [])

  // 🚀 셀피 업로드 모달 닫기
  const handleCloseUploadSelfieModal = useCallback(() => {
    setIsUploadSelfieModalOpen(false)
  }, [])

  // 🚀 이미지 공유 (카카오톡)
  const handleShareKakao = useCallback(
    (photoId: string) => {
      if (onShareKakao) {
        onShareKakao(photoId)
      }
    },
    [onShareKakao]
  )

  // 🚀 프로필 설정 페이지로 이동
  const handleAccount = useCallback(() => {
    router.push('/profile')
  }, [router])

  return (
    <div className="min-h-screen bg-white">
      {/*  검색 및 필터 영역 */}
      <div className="bg-black p-6">
        <div className="flex justify-center">
          <div className="mb-4 text-center">
            <div className="mb-2 flex justify-center">
              <img src="/ALBUM_w.svg" alt="Album" className="h-4 w-auto" />
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="ml-16 w-[30rem]">
            <SearchBox onFiltersChange={handleFiltersChange} />
          </div>
        </div>
      </div>

      {/* 🚀 이미지 아카이브 - 깔끔한 흰색 그리드 */}
      <div className="flex-1">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-12 gap-0">
            {/* 왼쪽 공간 */}
            <div className="col-span-0.5 min-h-screen"></div>

            {/* 중앙 콘텐츠 영역 */}
            <div className="col-span-11 bg-white p-4">
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
            <div className="col-span-0.5 min-h-screen bg-gray-50"></div>
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

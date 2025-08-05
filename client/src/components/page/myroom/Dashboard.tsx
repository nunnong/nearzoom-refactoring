'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { useState } from 'react'

import {
  getImagesFromLocal,
  updateImageInLocal,
  deleteImageFromLocal,
  initializeTestImages,
} from '@/utils/localStorage'
import { saveReferenceImage } from '@/utils/localStorage'

import HomeButton from './HomeButton'
import ImageArchive from './ImageArchive'
import LogoutButton from './LogoutButton'
import SearchBox from './SearchBox'
import SideList from './SideList'
import UploadSelfieModal from './UploadSelfieModal'


interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

interface Filter {
  id: string
  type: 'heart' | 'name' | 'date' | 'edited'
  value: string
  display: string
}

interface UserProfile {
  profileImage?: string
  email?: string
  name?: string
}

interface DashboardProps {
  images?: ImageItem[]
  userProfile?: UserProfile
}

const Dashboard: React.FC<DashboardProps> = ({ images = [], userProfile }) => {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([])

  // localStorage에서 이미지 데이터 로드
  useEffect(() => {
    // 첫 로드 시 테스트 데이터 초기화
    initializeTestImages(images)

    // localStorage에서 데이터 로드
    const savedImages = getImagesFromLocal()
    console.log('📸 Loaded images from localStorage:', savedImages)
    setImageList(savedImages)
    setFilteredImages(savedImages)
  }, [images])

  // 페이지 로드 시 localStorage 데이터 새로고침
  useEffect(() => {
    const handleStorageChange = () => {
      const savedImages = getImagesFromLocal()
      setImageList(savedImages)
      setFilteredImages(savedImages)
    }

    // 다른 탭에서 localStorage 변경 시 동기화
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // 현재 활성화된 필터들을 추적
  const [activeFilters, setActiveFilters] = useState<Filter[]>([])

  // imageList가 변경될 때 필터를 다시 적용
  useEffect(() => {
    if (activeFilters.length === 0) {
      setFilteredImages(imageList)
    } else {
      const filtered = imageList.filter(image => {
        return activeFilters.every(filter => {
          switch (filter.type) {
            case 'heart':
              return image.isLiked === true
            case 'name':
              return image.hashtags?.some(tag => 
                tag.toLowerCase().includes(filter.value.toLowerCase())
              )
            case 'date':
              return image.hashtags?.some(tag => {
                // 날짜 범위 검색인 경우
                if (filter.value.includes('~')) {
                  const [startDate, endDate] = filter.value.split('~').map(d => d.trim())
                  return tag >= startDate && tag <= endDate
                }
                // 단일 날짜 검색인 경우
                return tag === filter.value
              })
            case 'edited':
              return filter.value === 'edited' ? image.isEdited === true : image.isEdited !== true
            default:
              return false
          }
        })
      })
      setFilteredImages(filtered)
    }
  }, [imageList, activeFilters])

  const handleFiltersChange = (filters: Filter[]) => {
    setActiveFilters(filters)
  }

  const handleUploadSelfie = (): void => {
    setActiveModal('upload')
  }

  const handleSelfieUpload = (imageData: string): void => {
    // 참고 이미지로 저장
    saveReferenceImage(imageData)
    console.log('Selfie uploaded and saved as reference image')
    setActiveModal(null)
  }


  const handleAccount = (): void => {
    setActiveModal('account')
  }

  const closeModal = (): void => {
    setActiveModal(null)
  }

  const toggleSidebar = (): void => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleLike = (imageId: string): void => {
    const targetImage = imageList.find(img => img.id === imageId)
    const newIsLiked = !targetImage?.isLiked

    console.log(
      '❤️ Toggling like for image:',
      imageId,
      'Current state:',
      targetImage?.isLiked,
      '→ New state:',
      newIsLiked
    )

    // localStorage 업데이트
    updateImageInLocal(imageId, { isLiked: newIsLiked })

    // 로컬 상태 업데이트
    setImageList(prevImages =>
      prevImages.map(img =>
        img.id === imageId ? { ...img, isLiked: newIsLiked } : img
      )
    )
  }

  const handleShareKakao = (imageId: string): void => {
    console.log('Share to KakaoTalk:', imageId)
    // TODO: 카카오톡 공유 API 연동
  }

  const handleDelete = (imageId: string): void => {
    console.log('Deleting image:', imageId)

    // localStorage에서 삭제
    deleteImageFromLocal(imageId)

    // 로컬 상태 업데이트
    setImageList(prevImages => prevImages.filter(img => img.id !== imageId))
  }

  const handleEdit = (imageId: string): void => {
    const imageToEdit = imageList.find(img => img.id === imageId)
    console.log(
      'Edit requested for image:',
      imageId,
      'Image data:',
      imageToEdit
    )

    if (imageToEdit && !imageToEdit.isEdited) {
      // drawing 페이지로 라우팅 (이미지 ID와 src, returnUrl을 쿼리 파라미터로 전달)
      const encodedSrc = encodeURIComponent(imageToEdit.src)
      const currentPath = window.location.pathname
      const encodedReturnUrl = encodeURIComponent(currentPath)
      router.push(
        `/drawing?id=${imageId}&src=${encodedSrc}&returnUrl=${encodedReturnUrl}`
      )
    } else if (imageToEdit?.isEdited) {
      console.log('Cannot edit: Image is already edited')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SideList
        isOpen={isSidebarOpen}
        userProfile={userProfile}
        onUploadSelfie={handleUploadSelfie}
        onAccount={handleAccount}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div
        className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}
      >
        <header className="border-b bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900"></h1>
            </div>
            <div className="flex items-center space-x-3">
              <HomeButton />
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="mb-8 flex flex-col items-center">
            <h2 className="mb-8 text-xl font-semibold text-gray-800">MY ROOM</h2>
            <SearchBox onFiltersChange={handleFiltersChange} />
          </div>
          <ImageArchive
            images={filteredImages}
            onLike={handleLike}
            onShareKakao={handleShareKakao}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </main>
      </div>

      <UploadSelfieModal
        isOpen={activeModal === 'upload'}
        onClose={closeModal}
        onUpload={handleSelfieUpload}
      />


      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">계정 정보</h3>
                <button
                  onClick={closeModal}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    {userProfile?.profileImage ? (
                      <img
                        src={userProfile.profileImage}
                        alt="Profile"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {userProfile?.name || '사용자'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {userProfile?.email || 'user@example.com'}
                    </p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-4">
                  <div className="border-t border-gray-200 pt-4">
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">소셜 로그인</dt>
                        <dd className="text-sm text-gray-900 flex items-center">
                          <div className="flex items-center space-x-1">
                            <div className="w-4 h-4 bg-yellow-400 rounded-sm flex items-center justify-center">
                              <span className="text-xs font-bold text-black">K</span>
                            </div>
                            <span>카카오</span>
                          </div>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">이메일</dt>
                        <dd className="text-sm text-gray-900">{userProfile?.email || 'user@kakao.com'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">가입일</dt>
                        <dd className="text-sm text-gray-900">2024.01.15</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">마지막 로그인</dt>
                        <dd className="text-sm text-gray-900">2024.08.02</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm('정말로 회원탈퇴를 하시겠습니까?\n탈퇴 시 모든 데이터가 삭제됩니다.')) {
                      console.log('회원탈퇴 처리')
                      // TODO: 회원탈퇴 로직 구현
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  회원탈퇴
                </button>
                <button
                  onClick={closeModal}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

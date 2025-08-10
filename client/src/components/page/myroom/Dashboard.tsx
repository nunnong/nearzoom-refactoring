'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { useState } from 'react'

import api from '@/lib/axios'
import { User } from '@/types/auth'

import ImageArchive from './ImageArchive'
import SearchBox from './SearchBox'
import SideList from './SideList'
import HomeButton from './HomeButton'
import LogoutButton from './LogoutButton'
import UploadSelfieModal from './UploadSelfieModal'
import { useAuth } from '@/hooks/auth'

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

interface DashboardProps {
  images?: ImageItem[]
  userProfile?: User | null
}

const Dashboard: React.FC<DashboardProps> = ({ images = [], userProfile }) => {
  console.log('Dashboard - received userProfile:', userProfile)
  console.log('Dashboard - userProfile name:', userProfile?.name)
  console.log('Dashboard - userProfile data:', userProfile?.data)
  
  // ApiResponse 형태의 데이터인 경우 실제 데이터 추출
  const actualUser = userProfile?.data ? {
    name: userProfile.data.userName,
    email: userProfile.data.userEmail,
    profileImage: userProfile.data.userProfileImage,
    socialType: 'GOOGLE' // 현재 구글 로그인
  } : userProfile
  
  console.log('Dashboard - actualUser:', actualUser)
  
  const { handleLogout, isLoading } = useAuth()
  
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true) // 기본값을 true로 변경
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isMyFeedOpen, setIsMyFeedOpen] = useState<boolean>(false)
  const [isUploadSelfieModalOpen, setIsUploadSelfieModalOpen] = useState<boolean>(false)

  // props로 받은 사용자별 이미지 데이터 사용
  useEffect(() => {
    console.log('📸 사용자별 이미지 데이터 로드:', images)
    setImageList(images)
    setFilteredImages(images)
  }, [images])

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
    setIsUploadSelfieModalOpen(true)
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

  const handleLike = async (imageId: string): Promise<void> => {
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

    try {
      // API 호출
      await api.post('/photos/heart', {
        photoId: imageId,
        isLiked: newIsLiked
      })

      // 로컬 상태 업데이트
      setImageList(prevImages =>
        prevImages.map(img =>
          img.id === imageId ? { ...img, isLiked: newIsLiked } : img
        )
      )
    } catch (error) {
      console.error('하트 상태 업데이트 실패:', error)
    }
  }

  const handleShareKakao = (imageId: string): void => {
  const targetImage = imageList.find(img => img.id === imageId)
  if (!targetImage) {
    console.error('Image not found:', imageId)
    return
  }

  if (typeof window !== 'undefined' && (window as any).Kakao && (window as any).Kakao.Share) {
    if (!(window as any).Kakao.isInitialized()) {
      console.error('Kakao SDK not initialized')
      alert('카카오톡 공유 기능을 사용할 수 없습니다.')
      return
    }

    try {
      (window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: targetImage.alt || '내가 그린 그림',
          description: '이어줌에서 함께 그린 특별한 추억이에요!',
          imageUrl: targetImage.src,
          link: {
            webUrl: window.location.href,
            mobileWebUrl: window.location.href,
          },
        },
      })
    } catch (error) {
      console.error('카카오톡 공유 실패:', error)
      alert('카카오톡 공유에 실패했습니다. 다시 시도해주세요.')
    }
  } else {
    console.error('Kakao SDK not loaded')
    alert('카카오톡 공유 기능을 사용할 수 없습니다.')
  }
}

  const handleDelete = (imageId: string): void => {
    console.log('Deleting image:', imageId)

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
        userProfile={actualUser}
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

              {/* Hamburger Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-2">
                      {/* MY FEED with nested dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setIsMyFeedOpen(!isMyFeedOpen)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center justify-between gap-2 text-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                            </svg>
                            MY FEED
                          </div>
                          <svg className={`w-4 h-4 transition-transform ${isMyFeedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* MY FEED Icons Submenu */}
                        {isMyFeedOpen && (
                          <div className="ml-4 border-l-2 border-gray-100">
                            <button
                              onClick={() => {
                                /* Home.png 관련 새로운 기능 */
                                setIsMyFeedOpen(false)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                            >
                              <img src="/Home.png" alt="피드 홈" className="w-5 h-5 object-contain" />
                              Home
                            </button>
                            <button
                              onClick={() => {
                                /* Search.png 관련 새로운 기능 */
                                setIsMyFeedOpen(false)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                            >
                              <img src="/Search.png" alt="모든 피드" className="w-5 h-5 object-contain" />
                              Search
                            </button>
                            <button
                              onClick={() => {
                                /* User.png 관련 새로운 기능 */
                                setIsMyFeedOpen(false)
                                setIsMenuOpen(false)
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-800"
                            >
                              <img src="/User.png" alt="My feed" className="w-5 h-5 object-contain" />
                              Profile
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <hr className="my-2 border-gray-200" />
                      
                      <button
                        onClick={() => {
                          handleLogout()
                          setIsMenuOpen(false)
                        }}
                        disabled={isLoading}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {isLoading ? '로그아웃 중...' : 'LOGOUT'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                    {actualUser?.profileImage ? (
                      <img
                        src={actualUser.profileImage}
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
                      {actualUser?.name || '사용자'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {actualUser?.email || 'user@example.com'}
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
                            {actualUser?.socialType === 'KAKAO' ? (
                              <>
                                <div className="w-4 h-4 bg-yellow-400 rounded-sm flex items-center justify-center">
                                  <span className="text-xs font-bold text-black">K</span>
                                </div>
                                <span>카카오</span>
                              </>
                            ) : actualUser?.socialType === 'GOOGLE' ? (
                              <>
                                <div className="w-4 h-4 bg-white border border-gray-300 rounded-sm flex items-center justify-center">
                                  <span className="text-xs font-bold text-blue-600">G</span>
                                </div>
                                <span>구글</span>
                              </>
                            ) : (
                              <span className="text-gray-500">알 수 없음</span>
                            )}
                          </div>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">이메일</dt>
                        <dd className="text-sm text-gray-900">{actualUser?.email || '이메일 정보 없음'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">사용자명</dt>
                        <dd className="text-sm text-gray-900">{actualUser?.name || '사용자명 없음'}</dd>
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

      {/* Upload Selfie Modal */}
      <UploadSelfieModal
        isOpen={isUploadSelfieModalOpen}
        onClose={() => setIsUploadSelfieModalOpen(false)}
        userProfile={actualUser}
      />
    </div>
  )
}

export default Dashboard

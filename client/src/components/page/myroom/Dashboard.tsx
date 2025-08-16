'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { useState } from 'react'
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon
} from '@heroicons/react/24/solid'

import { User } from '@/types/auth'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'

import ImageArchive from './ImageArchive'
import SearchBox from './SearchBox'
import SideList from './SideList'
import HomeButton from './HomeButton'
import LogoutButton from './LogoutButton'
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
  const actualUser = userProfile
  const { handleLogout, handleDeleteAccount, isLoading } = useAuth()
  
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true) // 사이드바 계속 열어 놓기
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isMyFeedOpen, setIsMyFeedOpen] = useState<boolean>(false)
  const [isUploadSelfieModalOpen, setIsUploadSelfieModalOpen] = useState<boolean>(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🔥 통일된 네비게이션 설정 (Timeline과 동일)
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/timeline',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      current: false,
      showLabel: false
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: false,
      showLabel: false
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: false,
      showLabel: false
    },
    {
      name: 'My Room',
      href: '/myroom',
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: true, // 현재 페이지
      showLabel: false
    }
  ];

  // 네비게이션 핸들러
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  // 로고 클릭 핸들러 (홈으로 이동)
  const handleLogoClick = () => {
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 사용자 정보 표시용
  const displayUser = actualUser ? {
    userId: typeof actualUser.id === 'string' ? parseInt(actualUser.id) : actualUser.id,
    accountName: (actualUser as any)?.accountName || actualUser.email?.split('@')[0] || 'user',
    userName: actualUser.name || actualUser.email || 'User',
    userEmail: actualUser.email || 'user@example.com',
    profileImage: (actualUser as any)?.profileImage || actualUser.profileImage,
  } : null;

  // props로 받은 이미지 데이터 사용 (두 번째 코드 로직)
  useEffect(() => {
    console.log('📸 Dashboard received images:', images)
    setImageList(images)
  }, [images])

  const handleFiltersChange = async (filters: Filter[]) => {
    console.log('🔍 Filter change requested:', filters)

    if (filters.length === 0) {
      console.log('🧹 No filters - loading all photos')
      if (onRefresh) {
        try {
          await onRefresh({})
          console.log('✅ Filter refresh completed (all photos)')
        } catch (error) {
          console.error('❌ Filter refresh failed:', error)
          alert('전체 사진 로딩 중 오류가 발생했습니다. 다시 시도해주세요.')
        }
      }
      return
    }

    const condition: MyPhotoListCondition = {
      limit: 20
    }

    filters.forEach(filter => {
      console.log(`🏷️ Processing filter: ${filter.type} = ${filter.value}`)
      
      switch (filter.type) {
        case 'heart':
          // heart 필터 값을 boolean으로 변환
          condition.heart = filter.value === 'liked' ? true : false
          console.log(`Heart filter value: ${filter.value} → ${condition.heart}`)
          break
        case 'name':
          if (!condition.partnerEmails) {
            condition.partnerEmails = []
          }
          const emailValue = filter.value.trim()
          if (emailValue) {
            condition.partnerEmails.push(emailValue)
          }
          break
        case 'date':
          if (filter.value.includes('~')) {
            const [start, end] = filter.value.split('~').map(d => d.trim().replace(/\./g, '-'))
            condition.startDate = start
            condition.endDate = end
          } else {
            const dateValue = filter.value.replace(/\./g, '-')
            condition.startDate = dateValue
            condition.endDate = dateValue
          }
          break
        case 'edited':
          console.log('Edited filter not implemented in backend')
          break
      }
    })

    console.log('Sending condition to backend:', condition)

    if (onRefresh) {
      try {
        await onRefresh(condition)
        console.log('Filter refresh completed')
      } catch (error) {
        console.error('Filter refresh failed:', error)
        alert('필터 적용 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    }
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

  const handleLike = async (photoId: string): Promise<void> => {
    if (onLike) {
      await onLike(photoId)
    }
  }

  const handleShareKakao = (photoId: string): void => {
    if (onShareKakao) {
      onShareKakao(photoId)
    }
  }

  const handleDelete = async (photoId: string): Promise<void> => {
    if (onDelete) {
      await onDelete(photoId)
    }
  }

  const handleEdit = async (photoId: string, editedImageUrl: string): Promise<void> => {
    if (onEdit) {
      await onEdit(photoId, editedImageUrl)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 기존 SideList 보존 */}
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
        {/* 🔥 Timeline 스타일 네비게이션 바로 변경 */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* 브랜드 - 로고 클릭 시 / 로 이동 */}
              <div className="flex items-center">
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors mr-2"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={handleLogoClick}
                  className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  📖 NearZoom
                </button>
              </div>

              {/* 데스크톱 네비게이션 */}
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navigationItems.map((item) => {
                    const Icon = item.current ? item.activeIcon : item.icon
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigation(item.href)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                          item.current
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        title={item.name}
                      >
                        <Icon className="h-5 w-5" />
                        {item.showLabel && <span>{item.name}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 사용자 정보 & 설정 (데스크톱) */}
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => router.push('/profile')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  title="프로필 설정"
                >
                  <CogIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <img
                    src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=32&background=random`}
                    alt={displayUser?.userName || 'User'}
                    className="h-8 w-8 rounded-full ring-2 ring-gray-100"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=32&background=random`;
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {displayUser?.userName || 'User'}
                  </span>
                </div>
                
                {/* 🔥 기존 로그아웃 버튼 보존 - 모바일에서만 표시하던 것을 데스크톱에도 추가 */}
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

              {/* 모바일 메뉴 버튼 */}
              <div className="md:hidden">
                <button
                  onClick={toggleMobileMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 🔥 모바일 네비게이션 메뉴 */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
                {/* 사용자 정보 */}
                <div className="flex items-center space-x-3 px-3 py-2 mb-3">
                  <img
                    src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=40&background=random`}
                    alt={displayUser?.userName || 'User'}
                    className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=40&background=random`;
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {displayUser?.userName || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{displayUser?.accountName || 'user'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      router.push('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <CogIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* 네비게이션 항목들 - 모바일에서는 모든 라벨 표시 */}
                {navigationItems.map((item) => {
                  const Icon = item.current ? item.activeIcon : item.icon
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </button>
                  )
                })}

                {/* 홈으로 가기 버튼 추가 */}
                <button
                  onClick={handleLogoClick}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <HomeIcon className="h-5 w-5" />
                  <span>Home</span>
                </button>

                {/* 🔥 모바일 로그아웃 버튼 보존 */}
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMobileMenuOpen(false)
                  }}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{isLoading ? '로그아웃 중...' : 'LOGOUT'}</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        <main className="p-8">
          <div className="mb-8 flex flex-col items-center">
            <h2 className="mb-8 text-xl font-semibold text-gray-800">MY ROOM</h2>
            <SearchBox onFiltersChange={handleFiltersChange} />
          </div>
          <ImageArchive
            images={imageList}
            onLike={handleLike}
            onShareKakao={handleShareKakao}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
          />
        </main>
      </div>

      {/* 🔥 모바일 하단 네비게이션 (Timeline과 동일) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center py-2 px-1 transition-colors ${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 🔥 모바일 하단 네비게이션 공간 확보 */}
      <div className="md:hidden h-20"></div>

      {/* 🔥 기존 모달들 보존 */}
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
                      {actualUser?.name || '사용자 정보 로딩 중...'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {actualUser?.email || '이메일 로딩 중...'}
                    </p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-4">
                  <div className="border-t border-gray-200 pt-4">
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">이메일</dt>
                        <dd className="text-sm text-gray-900">{actualUser?.email || '로딩 중...'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">사용자명</dt>
                        <dd className="text-sm text-gray-900">{actualUser?.name || '로딩 중...'}</dd>
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
                  onClick={async () => {
                    if (confirm('정말로 회원탈퇴를 하시겠습니까?\n탈퇴 시 모든 데이터가 삭제됩니다.')) {
                      try {
                        await handleDeleteAccount()
                        alert('회원탈퇴가 완료되었습니다.')
                      } catch (error) {
                        alert('회원탈퇴 중 오류가 발생했습니다.')
                      }
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
        onImageUpdated={() => {
          console.log('참조 이미지가 업데이트되었습니다.')
        }}
      />
    </div>
  )
}

export default Dashboard
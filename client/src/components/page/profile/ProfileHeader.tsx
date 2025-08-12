'use client'

import React from 'react'
import { CalendarDaysIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/outline'
import { useFollowModal } from '@/hooks/useFollowModal'
import FollowListModal from '@/components/ui/FollowListModal'

// 🔥 로컬 타입 정의 (타입 import 오류 방지)
interface UserProfile {
  id: number // 🔥 string → number로 수정
  name: string
  email: string
  profileImage?: string
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  feed: {
    id: string
    name: string
    description: string
    isPublic: boolean
    backgroundColor: string
    backgroundImageUrl?: string
    likesCount: number
    createdAt: string
    updatedAt: string
  }
}

interface ProfileHeaderProps {
  user: UserProfile
  isOwnProfile: boolean
  onEditClick?: () => void
  className?: string
  currentUserId?: string | number // 🔥 number도 허용
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  isOwnProfile,
  onEditClick,
  className = '',
  currentUserId,
}) => {
  // 팔로우 모달 훅 사용
  const {
    isOpen,
    modalType,
    targetUserId,
    openFollowerModal,
    openFollowingModal,
    closeModal,
  } = useFollowModal();

  // 안전한 날짜 처리
  const getFormattedDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR')
    } catch {
      return '알 수 없음'
    }
  }

  // 팔로워 버튼 클릭 핸들러
  const handleFollowersClick = () => {
    openFollowerModal(String(user.id)); // 🔥 number를 string으로 변환
  };

  // 팔로잉 버튼 클릭 핸들러
  const handleFollowingClick = () => {
    openFollowingModal(String(user.id)); // 🔥 number를 string으로 변환
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8 ${className}`}>
        {/* 배경 이미지 */}
        <div 
          className="h-32 bg-gradient-to-r from-blue-400 to-purple-500"
          style={{
            backgroundColor: user.feed.backgroundColor || '#f3f4f6',
            backgroundImage: user.feed.backgroundImageUrl ? `url(${user.feed.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="relative px-6 pb-6">
          {/* 프로필 이미지 */}
          <div className="flex items-end justify-between -mt-12">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 🔥 이미지 로드 실패 시 기본 아이콘으로 대체
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  )}
                  
                  {/* 🔥 이미지 로드 실패 시 표시될 fallback */}
                  {user.profileImage && (
                    <div className="hidden w-full h-full flex items-center justify-center text-gray-400">
                      <UserIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>
              </div>

              {/* 온라인 상태 표시 */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full" />
            </div>

            {/* 편집 버튼 (본인 프로필인 경우만) */}
            {isOwnProfile && onEditClick && (
              <button
                onClick={onEditClick}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                프로필 편집
              </button>
            )}
          </div>

          {/* 사용자 정보 */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{user.name}</h1>
              
              {/* 계정 상태 배지 */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {user.feed.isPublic ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    공개
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    비공개
                  </span>
                )}
                
                {isOwnProfile && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    내 프로필
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-600 mb-1 truncate">@{user.email.split('@')[0]}</p>

            {/* 피드 설명 */}
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{user.feed.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                {user.feed.description || '아직 설명이 없습니다.'}
              </p>
            </div>

            {/* 추가 정보 */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <CalendarDaysIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{getFormattedDate(user.feed.createdAt)}부터 시작</span>
              </div>
              
              {/* 위치 정보 (옵셔널) */}
              <div className="flex items-center">
                <MapPinIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">Seoul, Korea</span>
              </div>
            </div>

            {/* 팔로우 통계 - 🔥 핵심 수정 부분! */}
            <div className="mt-4 flex items-center space-x-6">
              {/* 팔로잉 버튼 - 클릭하면 모달 오픈 */}
              <button 
                onClick={handleFollowingClick}
                className="hover:underline hover:bg-gray-50 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label={`${user.followingCount}명의 팔로잉 목록 보기`}
              >
                <span className="font-semibold text-gray-900">{user.followingCount.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">팔로잉</span>
              </button>
              
              {/* 팔로워 버튼 - 클릭하면 모달 오픈 */}
              <button 
                onClick={handleFollowersClick}
                className="hover:underline hover:bg-gray-50 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label={`${user.followersCount}명의 팔로워 목록 보기`}
              >
                <span className="font-semibold text-gray-900">{user.followersCount.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">팔로워</span>
              </button>

              {/* 좋아요는 버튼이 아님 (클릭 불가) */}
              <div>
                <span className="font-semibold text-gray-900">{user.feed.likesCount.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">좋아요</span>
              </div>
            </div>

            {/* 상호 팔로우 표시 */}
            {!isOwnProfile && user.isFollowing && user.isFollowedBy && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  서로 팔로우 중
                </span>
              </div>
            )}

            {/* 팔로우됨 표시 */}
            {!isOwnProfile && user.isFollowedBy && !user.isFollowing && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                  나를 팔로우함
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔥 팔로우 모달 추가 */}
      <FollowListModal
        userId={targetUserId}
        type={modalType}
        isOpen={isOpen}
        onClose={closeModal}
        currentUserId={currentUserId ? String(currentUserId) : undefined} // 🔥 string 변환
      />
    </>
  )
}

export default ProfileHeader
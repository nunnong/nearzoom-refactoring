'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserIcon } from '@heroicons/react/24/outline'
import { FeedLoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { profileAPI } from '@/lib/api/profile'

// 분리된 컴포넌트들
import ProfileHeader from '@/components/page/profile/ProfileHeader'
import ProfileInfo from '@/components/page/profile/ProfileInfo'
import UserFeedTimeline from '@/components/page/profile/UserFeedTimeline'

// 타입 정의
interface UserProfile {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  joinedAt?: string;
  location?: string;
  website?: string;
}

const UserProfileContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuthStore()

  // 쿼리 파라미터에서 accountName 추출
  const accountName = searchParams.get('accountName') || ''

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  // 프로필 데이터 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (!accountName) {
        setError('계정명이 없습니다.');
        setIsLoading(false);
        return;
      }

      // 🔥 본인 프로필인지 먼저 확인 - 무조건 /my로 리다이렉트
      if (user && user.accountName === accountName) {
        console.log('✅ 본인 프로필 감지, /my로 리다이렉트');
        setIsLoading(false);
        router.push('/my');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // accountName으로 사용자 프로필 조회
        const profileData = await profileAPI.getUserProfile(accountName);
        
        // 프론트엔드에서 isOwnProfile 계산
        const isOwnProfile = Boolean(user && user.accountName === accountName);
        
        const profileWithOwnership = {
          ...profileData,
          isOwnProfile
        };
        
        setProfile(profileWithOwnership);
        
      } catch (error: any) {
        console.error('프로필 로드 실패:', error);
        setError(error.message || '사용자를 찾을 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [accountName, user, router]);

  // 이벤트 핸들러들
  const handleFollowToggle = useCallback(async () => {
    if (!profile || !isAuthenticated || isFollowLoading) return;

    try {
      setIsFollowLoading(true);
      
      if (profile.isFollowing) {
        await profileAPI.unfollowUser(profile.accountName);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: false,
          followerCount: Math.max((prev.followerCount || 0) - 1, 0)
        } : null);
      } else {
        await profileAPI.followUser(profile.accountName);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: true,
          followerCount: (prev.followerCount || 0) + 1
        } : null);
      }
      
    } catch (error) {
      console.error('팔로우 토글 실패:', error);
    } finally {
      setIsFollowLoading(false);
    }
  }, [profile, isAuthenticated, isFollowLoading]);

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/explore');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/profile?accountName=${encodeURIComponent(accountName)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.userName} (@${profile?.accountName})`,
          text: `${profile?.userName}님의 프로필을 확인해보세요!`,
          url: url,
        });
      } catch (error) {
        console.log('공유 취소됨');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        console.log('링크가 클립보드에 복사되었습니다!');
      } catch (error) {
        console.error('클립보드 복사 실패:', error);
      }
    }
  };

  const handleEdit = () => {
    router.push('/profile');
  };

  // accountName이 없을 때
  if (!accountName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">계정명이 없습니다</h2>
          <p className="text-gray-500 mb-6">URL에 계정명을 포함해주세요.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/explore')}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              탐색으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 렌더링 조건부 처리
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FeedLoadingSpinner size="lg" text="프로필 로드 중..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">사용자를 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-6">{error || '존재하지 않는 사용자입니다.'}</p>
          <div className="space-y-3">
            <button
              onClick={goBack}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              돌아가기
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              탐색으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <ProfileHeader
        profile={profile}
        onGoBack={goBack}
        onShare={handleShare}
        onEdit={handleEdit}
      />

      {/* 프로필 정보 */}
      <ProfileInfo
        profile={profile}
        onFollowToggle={handleFollowToggle}
        onEdit={handleEdit}
        isFollowLoading={isFollowLoading}
      />

      {/* 사용자의 게시물 타임라인 */}
      <main className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">게시물</h2>
          </div>
          
          <UserFeedTimeline 
            accountName={profile.accountName}
            className="py-0"
          />
        </div>
      </main>

      {/* 모바일 하단 공간 */}
      <div className="h-20 md:hidden"></div>
    </div>
  );
};

const UserProfilePage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FeedLoadingSpinner size="lg" text="로딩 중..." />
      </div>
    }>
      <UserProfileContent />
    </Suspense>
  )
}

export default UserProfilePage;

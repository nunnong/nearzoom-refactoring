// src/app/follows/followers/[accountName]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeftIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';
import { useFollow } from '@/hooks/useFollow';

// MyRoomHeader 컴포넌트 추가
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader';

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// FollowButton 컴포넌트 (간단 버전)
const FollowButton = ({ accountName, isFollowing, onToggle, loading }: {
  accountName: string;
  isFollowing: boolean;
  onToggle: () => void;
  loading: boolean;
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading ? '처리 중...' : isFollowing ? '언팔로우' : '팔로우'}
    </button>
  );
};

export default function FollowersPage() {
  const router = useRouter();
  const params = useParams();
  
  // accountName이 배열일 수 있으므로 안전하게 처리
  const accountName = Array.isArray(params.accountName) 
    ? params.accountName[0] 
    : params.accountName;
  
  const { user, isAuthenticated } = useAuthStore();
  
  // useFollow 훅 사용
  const followHook = useFollow({
    enableOptimisticUpdates: true,
    autoRefreshStats: true,
    onError: (error) => {
      console.error('팔로우 에러:', error);
      setError(error);
    }
  });

  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // accountName이 없으면 에러 처리
  if (!accountName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">잘못된 접근입니다</h2>
          <p className="text-gray-500 mb-6">올바른 사용자 계정명이 필요합니다.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  // 팔로워 목록 로드
  const loadFollowers = async () => {
    if (!accountName) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 팔로워 목록 로드:', accountName);
      
      // useFollow 훅의 getFollowers 사용
      const followersList = await followHook.getFollowers(accountName);
      
      // 팔로우 통계도 가져오기
      const stats = followHook.getFollowStats(accountName);
      
      setFollowers(followersList);
      setTotalCount(stats?.followerCount || followersList.length);

      console.log('✅ 팔로워 목록 로드 완료:', followersList.length);

    } catch (error: any) {
      console.error('❌ 팔로워 목록 로드 실패:', error);
      
      let errorMessage = '팔로워 목록을 불러오는데 실패했습니다.';
      
      if (error?.message?.includes('401')) {
        errorMessage = '로그인이 필요합니다.';
        router.push('/login');
        return;
      } else if (error?.message?.includes('404')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (accountName && isAuthenticated) {
      loadFollowers();
    }
  }, [accountName, isAuthenticated]);

  // 팔로우 토글 처리
  const handleFollowToggle = async (followerAccountName: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      const isCurrentlyFollowing = followHook.isFollowing(followerAccountName);
      await followHook.toggleFollow(followerAccountName, isCurrentlyFollowing);
      
      // 팔로워 목록의 상태도 업데이트
      setFollowers(prev => 
        prev.map(follower => 
          follower.accountName === followerAccountName 
            ? { ...follower, isFollowing: !isCurrentlyFollowing }
            : follower
        )
      );
      
    } catch (error: any) {
      console.error('팔로우 토글 실패:', error);
      setError(error?.message || '팔로우 처리에 실패했습니다.');
    }
  };

  // 프로필로 이동
  const handleProfileClick = (accountName: string) => {
    router.push(`/${accountName}`);
  };

  // 렌더링
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">팔로워 목록을 보려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text="팔로워 목록을 불러오는 중..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadFollowers}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MyRoomHeader 추가 */}
      <MyRoomHeader
        user={{
          name: user?.name,
          email: user?.email,
          profileImage: user?.profileImage
        }}
        onUploadSelfie={() => router.push('/upload-selfie')}
        onAccount={() => router.push('/profile')}
        onLogout={() => router.push('/')}
      />

      {/* 팔로워 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-20 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">팔로워</h1>
                <p className="text-sm text-gray-500">@{accountName}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              총 {totalCount}명
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!followers || followers.length === 0 ? (
          <div className="text-center py-20">
            <UserIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              아직 팔로워가 없습니다
            </h3>
            <p className="text-gray-500">
              @{accountName}님을 팔로우하는 사용자가 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {followers.map((follower) => (
              <div
                key={follower.userId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleProfileClick(follower.accountName)}
                    className="flex items-center space-x-3 flex-1 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <img
                      src={follower.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(follower.userName)}&size=48&background=random`}
                      alt={follower.userName}
                      className="h-12 w-12 rounded-full ring-2 ring-gray-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(follower.userName)}&size=48&background=random`;
                      }}
                    />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{follower.userName}</p>
                      <p className="text-sm text-gray-500">@{follower.accountName}</p>
                    </div>
                  </button>

                  {/* 팔로우 버튼 (자신이 아닌 경우만) */}
                  {user && follower.accountName !== (user as any)?.accountName && (
                    <FollowButton
                      accountName={follower.accountName}
                      isFollowing={followHook.isFollowing(follower.accountName)}
                      onToggle={() => handleFollowToggle(follower.accountName)}
                      loading={followHook.loadingUsers.has(follower.accountName)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
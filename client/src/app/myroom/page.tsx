'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'
import ErrorBoundary from '@/components/common/ErrorBoundary'

interface ImageItem {
  photoId: string
  imgUrl: string
  isLiked?: boolean
  isEdited?: boolean
  editable?: number
  hashtags?: string[]
  createdAt?: string
  partnerEmails?: string
}

// 🚀 로딩 컴포넌트
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-gray-600">로딩 중...</p>
    </div>
  </div>
)

// 🚀 에러 발생 시 fallback UI
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 text-red-500">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Suspense Exception 발생
      </h2>
      <p className="text-gray-600 mb-4">
        {error.message || '예상치 못한 오류가 발생했습니다.'}
      </p>
      <div className="space-x-2">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  </div>
)

// 🚀 메인 마이룸 컴포넌트
function MyRoomContent() {
  const { user, isAuthenticated, isLoading: authLoading, initializeAuth } = useAuthStore()
  const [userImages, setUserImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfoLoading, setUserInfoLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [forceTimeout, setForceTimeout] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)  // 햄버거 메뉴 상태 추가
  const router = useRouter()

  // 🚀 성능 측정 시작
  const pageLoadStartTime = useMemo(() => performance.now(), [])

  // 🚀 강제 타임아웃 설정 (15초 후 자동 실패)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ 마이룸 페이지 강제 타임아웃 (15초) - 무한 로딩 방지')
      setForceTimeout(true)
      setLoading(false)
      setUserInfoLoading(false)
    }, 15000)

    return () => clearTimeout(timeoutId)
  }, [])

  // 🚀 보장: 페이지 진입 시 인증 상태 초기화 (Main과 동일하게 동작)
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // 디버깅을 위한 상태 로깅
  console.log('🔍 MyRoom 상태:', { 
    authLoading, 
    isAuthenticated, 
    user: !!user, 
    loading, 
    userInfoLoading,
    forceTimeout,
    userDetails: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    } : null
  })

  // 🚀 사용자 이미지 가져오기
  const fetchUserImages = async () => {
    if (loading) return; // 이미 로딩 중이면 중복 호출 방지

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 fetchUserImages 시작');
      console.log('📊 현재 상태:', { 
        loading, 
        userImagesLength: userImages.length, 
        isAuthenticated, 
        user: user ? '있음' : '없음' 
      });

      const condition: MyPhotoListCondition = {
        limit: 20
      };

      console.log('🔍 API 호출 조건:', condition);

      const response = await myroomService.getPhotos(condition);
      
      if (response && response.photos) {
        const convertedImages: ImageItem[] = response.photos.map(photo => ({
          photoId: String(photo.photoId),
          imgUrl: photo.imageUrl || '',
          isLiked: false, // 기본값으로 설정
          isEdited: false, // 기본값으로 설정
          editable: typeof photo.editable === 'number' ? photo.editable : 0,
          hashtags: [], // 기본값으로 설정
          createdAt: photo.createdAt || '',
          partnerEmails: photo.partnerEmails || ''
        }));

        setUserImages(convertedImages);
        setNextCursor(response.nextCursor || null);
        setHasMore(!!response.nextCursor);
        
        console.log('✅ 사용자 이미지 로딩 완료:', {
          count: convertedImages.length,
          hasMore: !!response.nextCursor,
          nextCursor: response.nextCursor
        });
      } else {
        console.warn('⚠️ 응답 데이터가 예상과 다릅니다:', response);
        setUserImages([]);
        setHasMore(false);
      }

    } catch (error: any) {
      console.error('사용자 이미지 가져오기 실패:', error);
      
      // 에러 상세 정보 로깅
      if (error.response) {
        console.error('📊 에러 응답:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('📊 에러 요청:', error.request);
      } else {
        console.error('📊 에러 메시지:', error.message);
      }
      
      setError('이미지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 추가 이미지 로딩
  const loadMoreImages = async () => {
    if (!hasMore || !nextCursor || loading) return;

    try {
      setLoading(true);
      
      const condition: MyPhotoListCondition = {
        limit: 20,
        cursor: nextCursor
      };

      const response = await myroomService.getPhotos(condition);
      
      if (response && response.photos) {
        const newImages: ImageItem[] = response.photos.map(photo => ({
          photoId: String(photo.photoId),
          imgUrl: photo.imageUrl || '',
          isLiked: false, // 기본값으로 설정
          isEdited: false, // 기본값으로 설정
          editable: typeof photo.editable === 'number' ? photo.editable : 0,
          hashtags: [], // 기본값으로 설정
          createdAt: photo.createdAt || '',
          partnerEmails: photo.partnerEmails || ''
        }));

        setUserImages(prev => [...prev, ...newImages]);
        setNextCursor(response.nextCursor || null);
        setHasMore(!!response.nextCursor);
      }
    } catch (error) {
      console.error('❌ 추가 이미지 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 좋아요 토글
  const handleLike = async (photoId: string) => {
    try {
      // API 호출 로직 추가 예정
      console.log('👍 좋아요 토글:', photoId);
      
      // 임시로 로컬 상태만 업데이트
      setUserImages(prev => prev.map(img => 
        img.photoId === photoId 
          ? { ...img, isLiked: !img.isLiked }
          : img
      ));
    } catch (error) {
      console.error('❌ 좋아요 토글 실패:', error);
    }
  };

  // 🚀 이미지 삭제
  const handleDelete = async (photoId: string) => {
    if (!confirm('정말로 이 이미지를 삭제하시겠습니까?')) return;

    try {
      // API 호출 로직 추가 예정
      console.log('🗑️ 이미지 삭제:', photoId);
      
      // 임시로 로컬 상태만 업데이트
      setUserImages(prev => prev.filter(img => img.photoId !== photoId));
    } catch (error) {
      console.error('❌ 이미지 삭제 실패:', error);
    }
  };

  // 🚀 이미지 편집
  const handleEdit = async (photoId: string, editedImageUrl?: string): Promise<void> => {
    console.log('✏️ 이미지 편집:', photoId, editedImageUrl);
    router.push(`/drawing?photoId=${photoId}`);
  };

  // 🚀 이미지 새로고침
  const handleImageRefresh = () => {
    console.log('🔄 이미지 새로고침');
    fetchUserImages();
  };

  // 🚀 페이지 새로고침
  const handlePageReload = () => {
    console.log('🔄 페이지 새로고침');
    window.location.reload();
  };

  // 🚀 MyRoom으로 이동 (셀피 업로드/AI 보정)
  const handleUploadSelfie = () => {
    // 이미 MyRoom에 있으므로 UploadSelfieModal을 열거나 해당 섹션으로 이동
    console.log('📸 UPLOAD SELFIE 클릭');
    // TODO: UploadSelfieModal 열기 로직 추가
    // 현재는 /upload-photo 페이지로 이동
    router.push('/upload-photo');
  };

  // 🚀 프로필 설정 페이지로 이동
  const handleAccount = () => {
    router.push('/profile');
  };

  // 🚀 로그아웃
  const handleLogout = () => {
    if (confirm('로그아웃하시겠습니까?')) {
      try {
        // useAuthStore의 logout 함수 사용
        const { logout } = useAuthStore.getState();
        logout();
        console.log('🚪 로그아웃');
        router.push('/');
      } catch (error) {
        console.error('❌ 로그아웃 실패:', error);
        alert('로그아웃에 실패했습니다.');
      }
    }
  };

  // 🚀 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 🚀 에러 재시도
  const handleRetry = () => {
    setError(null);
    fetchUserImages();
  };

  // 🚀 초기 데이터 로드
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserImages();
    }
  }, [isAuthenticated, user]);

  // 🚀 성능 측정 완료
  useEffect(() => {
    if (!loading && !authLoading) {
      const pageLoadEndTime = performance.now();
      const totalLoadTime = pageLoadEndTime - pageLoadStartTime;
      console.log(`🚀 MyRoom 페이지 로딩 완료: ${totalLoadTime.toFixed(2)}ms`);
    }
  }, [loading, authLoading, pageLoadStartTime]);

  // 🚀 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MyRoomHeader
          user={null}
          onUploadSelfie={() => {}}
          onAccount={() => {}}
          onLogout={() => {}}
        />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600">🔐 인증 상태 확인 중...</p>
            <p className="text-sm text-gray-400 mt-2">토큰 검증 중입니다</p>
            {forceTimeout && (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-yellow-800 text-sm">⚠️ 로딩이 지연되고 있습니다. 새로고침을 시도해보세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 🚀 인증 실패
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 새로운 헤더 스타일 적용 */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">My Room</h1>
              <p className="text-xs text-gray-500">로그인이 필요합니다</p>
            </div>
          </div>
        </div>
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-500 mb-6">My Room을 사용하려면 로그인해주세요.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 🚀 인증은 완료되었지만 사용자 정보가 아직 로딩 중인 경우 - 로딩 상태 표시
  if (isAuthenticated && !user) {
    console.log('⏳ 기본 로딩 상태 - 사용자 정보 확인 중')
    return (
      <div className="min-h-screen bg-gray-50">
        <MyRoomHeader
          user={null}
          onUploadSelfie={() => {}}
          onAccount={() => {}}
          onLogout={() => {}}
        />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600">👤 사용자 정보를 확인하는 중...</p>
            {forceTimeout && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-800 text-sm">🚨 사용자 정보 로딩이 지연되고 있습니다.</p>
                <p className="text-red-700 text-xs mt-1">네트워크 상태를 확인하고 다시 시도해주세요.</p>
              </div>
            )}
            {!userInfoLoading && (
              <button 
                onClick={handlePageReload}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MyRoomHeader
        user={user}
        onUploadSelfie={handleUploadSelfie}
        onAccount={handleAccount}
        onLogout={handleLogout}
      />

      {/* Dashboard - 전체 너비 사용 */}
      <Dashboard
        images={userImages}
        userProfile={user}
        onRefresh={fetchUserImages}
        onLoadMore={loadMoreImages}
        hasMore={hasMore}
        onLike={handleLike}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </div>
  )
}

// 🚀 메인 export (Error Boundary와 Suspense로 감쌈)
export default function MyRoom() {
  return (
    <ErrorBoundary fallback={<ErrorFallback error={new Error('Suspense Exception')} resetErrorBoundary={() => window.location.reload()} />}>
      <Suspense fallback={<LoadingFallback />}>
        <MyRoomContent />
      </Suspense>
    </ErrorBoundary>
  )
}

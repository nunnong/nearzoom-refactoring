'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'
import { API_ENDPOINTS } from '@/constants/api'
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
const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 text-red-500">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Suspense Exception 발생
      </h2>
      <p className="mb-4 text-gray-600">
        {error.message || '예상치 못한 오류가 발생했습니다.'}
      </p>
      <div className="space-x-2">
        <button
          onClick={resetErrorBoundary}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          다시 시도
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
        >
          새로고침
        </button>
      </div>
    </div>
  </div>
)

// 🚀 메인 마이룸 컴포넌트
function MyRoomContent() {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    initializeAuth,
    logout,
  } = useAuthStore()
  const [userImages, setUserImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(false) // 🚀 false로 변경
  const [userInfoLoading, setUserInfoLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [forceTimeout, setForceTimeout] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // 햄버거 메뉴 상태 추가
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
    userImagesLength: userImages.length, // 🚀 이미지 개수 추가
    userImages: userImages, // 🚀 전체 이미지 배열 추가
    userDetails: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
        }
      : null,
  })

  // 🚀 이미지 목록 업데이트 시 필터링된 이미지도 업데이트
  useEffect(() => {
    setUserImages(userImages)
  }, [userImages])

  // 🚀 필터 변경 핸들러 (클라이언트 사이드 필터링)
  const handleFiltersChange = useCallback(
    (filters: any[]) => {
      if (filters.length === 0) {
        // 필터가 없으면 모든 이미지 표시
        return
      }

      // 클라이언트 사이드에서 필터링 수행
      let filtered = [...userImages]

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

      setUserImages(filtered)
    },
    [userImages]
  )

  // 🚀 사용자 이미지 가져오기
  const fetchUserImages = useCallback(
    async (condition?: MyPhotoListCondition) => {
      if (!isAuthenticated || !user) return

      try {
        setLoading(true)

        const defaultCondition: MyPhotoListCondition = {
          limit: 20,
          ...condition,
        }

        const response = await myroomService.getPhotos(defaultCondition)

        if (response && response.photos) {
          const convertedImages: ImageItem[] = response.photos.map(photo => ({
            photoId: String(photo.photoId),
            imgUrl: photo.imageUrl,
            alt: '이미지',
            isLiked: photo.heart === 1,
            isEdited: !photo.editable,
            editable: photo.editable ? 1 : 0,
            hashtags: [],
            createdAt: photo.createdAt,
            partnerEmails: photo.partnerEmails,
          }))

          setUserImages(convertedImages)
          setHasMore(response.hasNext)
        }
      } catch (error) {
        console.error('사용자 이미지 로딩 실패:', error)
      } finally {
        setLoading(false)
      }
    },
    [isAuthenticated, user]
  )

  // 🚀 추가 이미지 로드
  const loadMoreImages = useCallback(async () => {
    if (!isAuthenticated || !user || !hasMore) return

    try {
      const condition: MyPhotoListCondition = {
        limit: 20,
        cursor: Number(userImages[userImages.length - 1]?.photoId),
      }

      const response = await myroomService.getPhotos(condition)

      if (response && response.photos) {
        const newImages: ImageItem[] = response.photos.map(photo => ({
          photoId: String(photo.photoId),
          imgUrl: photo.imageUrl,
          alt: '이미지',
          isLiked: photo.heart === 1,
          isEdited: !photo.editable,
          editable: photo.editable ? 1 : 0,
          hashtags: [],
          createdAt: photo.createdAt,
          partnerEmails: photo.partnerEmails,
        }))

        setUserImages(prev => [...prev, ...newImages])
        setHasMore(response.hasNext)
      }
    } catch (error) {
      console.error('추가 이미지 로딩 실패:', error)
    }
  }, [isAuthenticated, user, hasMore, userImages])

  // 🚀 좋아요 토글
  const handleLike = useCallback(
    async (photoId: string) => {
      try {
        await myroomService.updateHeart({
          photoId: Number(photoId),
          heart: !userImages.find(img => img.photoId === photoId)?.isLiked,
        })
        await fetchUserImages()
      } catch (error) {
        console.error('좋아요 토글 실패:', error)
      }
    },
    [fetchUserImages, userImages]
  )

  // 🚀 이미지 삭제
  const handleDelete = useCallback(
    async (photoId: string) => {
      try {
        await myroomService.deletePhoto({
          photoId: Number(photoId),
        })
        await fetchUserImages()
      } catch (error) {
        console.error('이미지 삭제 실패:', error)
      }
    },
    [fetchUserImages]
  )

  // 🚀 이미지 편집
  const handleEdit = useCallback(
    async (photoId: string, editedImageUrl: string) => {
      try {
        await myroomService.saveEditedPhoto({
          imageUrl: editedImageUrl,
          originalPhotoId: Number(photoId),
        })
        await fetchUserImages()
      } catch (error) {
        console.error('이미지 편집 저장 실패:', error)
      }
    },
    [fetchUserImages]
  )

  // 🚀 페이지 새로고침
  const handlePageReload = useCallback(() => {
    window.location.reload()
  }, [])

  // 🚀 셀피 업로드
  const handleUploadSelfie = useCallback(() => {
    router.push('/upload-selfie')
  }, [router])

  // 🚀 계정 설정
  const handleAccount = useCallback(() => {
    router.push('/profile')
  }, [router])

  // 🚀 로그아웃
  const handleLogout = useCallback(async () => {
    try {
      logout()
      router.push('/')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃에 실패했습니다.')
    }
  }, [logout, router])

  // 🚀 계정 삭제
  const handleDeleteAccount = useCallback(async () => {
    if (
      confirm(
        '정말로 계정을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.'
      )
    ) {
      try {
        // 프로필 페이지로 이동하여 계정 삭제 진행
        router.push('/profile')
      } catch (error) {
        console.error('계정 삭제 페이지 이동 실패:', error)
        alert('계정 삭제 페이지로 이동할 수 없습니다.')
      }
    }
  }, [router])

  // 🚀 에러 상태
  const [error, setError] = useState<string | null>(null)

  // 🚀 에러 재시도
  const handleRetry = () => {
    setError(null)
    fetchUserImages()
  }

  // 🚀 초기 데이터 로드
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserImages()
    }
  }, [isAuthenticated, user])

  // 🚀 성능 측정 완료
  useEffect(() => {
    if (!loading && !authLoading) {
      const pageLoadEndTime = performance.now()
      const totalLoadTime = pageLoadEndTime - pageLoadStartTime
      console.log(`🚀 MyRoom 페이지 로딩 완료: ${totalLoadTime.toFixed(2)}ms`)
    }
  }, [loading, authLoading, pageLoadStartTime])

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
            <p className="mt-2 text-sm text-gray-400">토큰 검증 중입니다</p>
            {forceTimeout && (
              <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-100 p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ 로딩이 지연되고 있습니다. 새로고침을 시도해보세요.
                </p>
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
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              로그인이 필요합니다
            </h2>
            <p className="mb-6 text-gray-500">
              My Room을 사용하려면 로그인해주세요.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
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
          onDeleteAccount={() => {}}
        />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600">👤 사용자 정보를 확인하는 중...</p>
            {forceTimeout && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-100 p-3">
                <p className="text-sm text-red-800">
                  🚨 사용자 정보 로딩이 지연되고 있습니다.
                </p>
                <p className="mt-1 text-xs text-red-700">
                  네트워크 상태를 확인하고 다시 시도해주세요.
                </p>
              </div>
            )}
            {!userInfoLoading && (
              <button
                onClick={handlePageReload}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
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
        onDeleteAccount={handleDeleteAccount}
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
    <ErrorBoundary
      fallback={
        <ErrorFallback
          error={new Error('Suspense Exception')}
          resetErrorBoundary={() => window.location.reload()}
        />
      }
    >
      <Suspense fallback={<LoadingFallback />}>
        <MyRoomContent />
      </Suspense>
    </ErrorBoundary>
  )
}

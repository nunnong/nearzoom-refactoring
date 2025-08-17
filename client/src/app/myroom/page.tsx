'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import { useAuth } from '@/hooks/auth'
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [userImages, setUserImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfoLoading, setUserInfoLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [forceTimeout, setForceTimeout] = useState(false)
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
      email: user.email,
      name: user.name
    } : '없음',
    timestamp: new Date().toISOString(),
    renderPhase: '상태 체크'
  })

  // 사용자 정보 로딩 상태 감지
  useEffect(() => {
    if (isAuthenticated && !user && !authLoading) {
      setUserInfoLoading(true)
      console.log('🔄 사용자 정보 로딩 시작')
    } else if (user) {
      setUserInfoLoading(false)
      const userInfoLoadTime = performance.now() - pageLoadStartTime
      console.log(`✅ 사용자 정보 로딩 완료! 총 소요시간: ${userInfoLoadTime.toFixed(2)}ms`)
    } else if (!isAuthenticated) {
      // 인증이 실패한 경우 로딩 상태 해제
      setUserInfoLoading(false)
    }
  }, [isAuthenticated, user, authLoading, pageLoadStartTime])

  const fetchUserImages = async () => {
    // 🚀 이미 로딩 중이면 중복 호출 방지
    if (loading) {
      console.log('⚠️ 이미 로딩 중입니다. 중복 호출 방지')
      return
    }

    try {
      console.log('🚀 fetchUserImages 시작')
      console.log('📊 현재 상태:', {
        loading,
        userImagesLength: userImages.length,
        isAuthenticated,
        user: user ? '있음' : '없음'
      })
      
      setLoading(true)
      const condition: MyPhotoListCondition = {
        limit: 20,
      }
      
      console.log('🔍 API 호출 조건:', condition)
      const response = await myroomService.getPhotos(condition)
      console.log('📡 API 응답:', response)
      
      if (response && response.photos) {
        console.log('✅ 이미지 데이터 수신:', response.photos.length)
        
        // API 응답을 ImageItem 형식으로 변환
        const images = response.photos.map(item => ({
          photoId: item.photoId.toString(),
          imgUrl: item.imageUrl,
          isLiked: Boolean(item.heart), // 0/1 → false/true 변환
          isEdited: (item.editable ?? true) === false,
          editable: item.editable ? 1 : 0, // true → 1, false → 0 변환
          hashtags: [],
        }))
        
        setUserImages(images)
        setHasMore(response.hasNext)
        console.log('🔄 userImages 상태 업데이트 완료:', images.length)
      } else {
        console.log('❌ 응답 데이터 없음:', response)
        setUserImages([])
        setHasMore(false)
      }
    } catch (error: any) {
      // 🚀 상세한 에러 정보 로깅
      console.error('❌ Failed to fetch images - 상세 에러 정보:', {
        error,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : 'undefined',
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.response?.status,
        errorResponse: error?.response?.data,
        errorConfig: error?.config,
        errorStack: error?.stack
      })
      
      setUserImages([])
      // 에러 발생 시 로딩 상태 해제
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreImages = useCallback(async () => {
    if (!hasMore || !nextCursor) return

    try {
      const response = await myroomService.getPhotos({
        cursor: nextCursor,
        limit: 20,
      })

      const newImages =
        response.photos?.map(item => ({
          photoId: item.photoId.toString(),
          imgUrl: item.imageUrl,
          isLiked: Boolean(item.heart), // 0/1 → false/true 변환
          isEdited: (item.editable ?? true) === false,
          editable: item.editable ? 1 : 0, // true → 1, false → 0 변환
          hashtags: [],
          createdAt: item.createdAt,
          partnerEmails: item.partnerEmails,
        })) || []

      setUserImages(prev => [...prev, ...newImages])
      setNextCursor(response.nextCursor || null)
      setHasMore(response.hasNext)
    } catch (error) {
      console.error('Failed to load more images:', error)
    }
  }, [hasMore, nextCursor])

  const handleLike = useCallback(async (photoId: string): Promise<void> => {
    try {
      const targetImage = userImages.find(img => img.photoId === photoId)
      if (!targetImage) {
        console.error('이미지를 찾을 수 없음:', photoId)
        return
      }

      const newIsLiked = !targetImage.isLiked
      console.log('하트 상태 변경 시도:', {
        photoId,
        currentLiked: targetImage.isLiked,
        newLiked: newIsLiked,
      })

      await myroomService.updateHeart({
        photoId: parseInt(photoId),
        heart: newIsLiked,
      })

      setUserImages(prevImages =>
        prevImages.map(img =>
          img.photoId === photoId ? { ...img, isLiked: newIsLiked } : img
        )
      )

      console.log('✅ Heart update success:', { photoId, newLiked: newIsLiked })
    } catch (error) {
      console.error('❌ 하트 상태 업데이트 실패:', error)
      alert('좋아요 상태 변경에 실패했습니다. 다시 시도해주세요.')
    }
  }, [userImages])

  const handleDelete = useCallback(async (photoId: string): Promise<void> => {
    if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) {
      return
    }

    try {
      await myroomService.deletePhoto({
        photoId: parseInt(photoId),
      })

      setUserImages(prevImages =>
        prevImages.filter(img => img.photoId !== photoId)
      )

      console.log('✅ Delete success')
      alert('사진이 삭제되었습니다.')
    } catch (error) {
      console.error('❌ 사진 삭제 실패:', error)
      alert('사진 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }, [])

  const handleEdit = useCallback(async (
    photoId: string,
    editedImageUrl: string
  ): Promise<void> => {
    const imageToEdit = userImages.find(img => img.photoId === photoId)

    if (imageToEdit && !imageToEdit.isEdited) {
      console.log(`Navigating to edit page for image ${photoId}`)

      const encodedSrc = encodeURIComponent(imageToEdit.imgUrl)
      const currentPath = window.location.pathname
      const encodedReturnUrl = encodeURIComponent(currentPath)
      router.push(
        `/drawing?id=${photoId}&src=${encodedSrc}&returnUrl=${encodedReturnUrl}&saveCallback=true`
      )
    } else if (imageToEdit?.isEdited) {
      alert('이미 편집된 사진은 다시 편집할 수 없습니다.')
    }
  }, [userImages, router])

  // 새로고침 핸들러 최적화
  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await fetchUserImages()
  }, [fetchUserImages])

  // 페이지 새로고침 핸들러
  const handlePageReload = useCallback(() => {
    window.location.reload()
  }, [])

  // 이미지 새로고침 핸들러
  const handleImageRefresh = useCallback(() => {
    fetchUserImages()
  }, [fetchUserImages])

  // 포커스 이벤트 핸들러 최적화
  const handleFocus = useCallback(() => {
    if (isAuthenticated && user && !loading) {
      console.log('🔄 포커스 이벤트로 fetchUserImages 호출')
      fetchUserImages()
    } else {
      console.log('⚠️ 포커스 이벤트에서 fetchUserImages 호출 건너뜀:', {
        isAuthenticated,
        user: !!user,
        loading
      })
    }
  }, [isAuthenticated, user, loading])

  useEffect(() => {
    // 인증 로딩이 완료되고 로그인된 상태일 때만 이미지 가져오기
    if (!authLoading && isAuthenticated && user) {
      console.log('🔄 useEffect에서 fetchUserImages 호출')
      fetchUserImages()
    }
  }, [authLoading, isAuthenticated, user]) // fetchUserImages 의존성 제거

  // 인증 상태가 변경될 때마다 로딩 상태 재설정
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLoading(false)
      setUserInfoLoading(false)
    }
    // 인증이 완료되면 로딩 상태 초기화
    if (!authLoading && isAuthenticated && user) {
      setLoading(false)
      setUserInfoLoading(false)
    }
    // 인증은 완료되었지만 사용자 정보가 아직 없는 경우
    if (!authLoading && isAuthenticated && !user) {
      setUserInfoLoading(true)
    }
  }, [authLoading, isAuthenticated, user])



  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [handleFocus])

  // 🚀 인증 로딩 중 (가장 빠른 단계)
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
    )
  }

  // 🚀 인증 실패 또는 사용자 정보 없음
  if (!isAuthenticated || !user) {
    console.log('🚨 인증 상태 문제:', { isAuthenticated, hasUser: !!user, authLoading, userInfoLoading })
    
    // 🚀 인증이 아직 로딩 중인 경우 - 아무것도 표시하지 않음
    if (authLoading) {
      return null
    }
    
    // 🚀 인증이 실패한 경우 - 즉시 아무것도 표시하지 않음
    if (!isAuthenticated) {
      console.log('❌ 인증 실패 - 아무것도 표시하지 않음')
      return null
    }

    // 🚀 인증은 완료되었지만 사용자 정보가 아직 로딩 중인 경우 - 로딩 상태 표시
    if (isAuthenticated && !user) {
      console.log('⏳ 사용자 정보 로딩 중 - 로딩 상태 표시')
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600">👤 사용자 정보를 불러오는 중...</p>
            <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요</p>
            {forceTimeout && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                <p className="text-orange-800 text-sm">⚠️ 사용자 정보 로딩이 지연되고 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // 🚀 그 외의 경우는 기본 로딩 상태
    console.log('⏳ 기본 로딩 상태 - 사용자 정보 확인 중')
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
    )
  }

  // 🚀 이미지 로딩 중
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">📸 사진을 불러오는 중...</p>
          {forceTimeout && (
            <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
              <p className="text-orange-800 text-sm">⚠️ 이미지 로딩이 지연되고 있습니다.</p>
              <p className="text-orange-700 text-xs mt-1">네트워크 상태를 확인해주세요.</p>
            </div>
          )}
          <button 
            onClick={handleImageRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  // 🚀 사용자 정보가 로드되지 않은 경우
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">👤 사용자 정보를 불러오는 중...</p>
          <button 
            onClick={handlePageReload}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <Dashboard
      images={userImages}
      userProfile={user}
      onRefresh={handleRefresh}
      onLoadMore={loadMoreImages}
      hasMore={hasMore}
      onLike={handleLike}
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
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

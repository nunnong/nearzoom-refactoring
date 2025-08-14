'use client'

import React, { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/auth/useAuth'

// ============================================================================
// 🔥 백엔드 API 연동 함수들
// ============================================================================
import api from '@/lib/axios'

// API 응답 타입 (백엔드 ApiResponse와 일치)
interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// 백엔드 Photo 엔티티 타입
interface Photo {
  photoId: number
  imgUrl: string
  createdAt: string
  user: {
    userId: number
    userName: string
    accountName: string
  }
}

// 백엔드 CreateFeedRequest 타입
interface CreateFeedRequest {
  photoId: number
  caption: string
}

// ============================================================================
// 🔥 백엔드 API 함수들 - 완벽한 아키텍처 적용
// ============================================================================

// 사진 상세 조회
const getPhotoById = async (photoId: number): Promise<Photo> => {
  try {
    const response = await api.get<ApiResponse<Photo>>(`/photos/${photoId}`)
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch photo:', error)
    throw error
  }
}

// 피드 생성
const createFeed = async (photoId: number, caption: string): Promise<number> => {
  try {
    const requestBody: CreateFeedRequest = {
      photoId,
      caption: caption.trim()
    }
    
    const response = await api.post<ApiResponse<number>>('/feeds', requestBody)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to create feed:', error)
    throw error
  }
}

// ============================================================================
// 🔥 SearchParams를 사용하는 컴포넌트 분리 (Suspense 경계 적용)
// ============================================================================

const PostCreateContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState<string>('')
  const [photo, setPhoto] = useState<Photo | null>(null)
  
  // URL 파라미터에서 사진 ID 가져오기 (새 게시물 생성 시 필수)
  const photoId = searchParams.get('photoId')

  // ============================================================================
  // 🔥 백엔드 API 호출 - 완벽한 아키텍처 적용
  // ============================================================================

  // ✅ 인증 확인 및 초기화
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login')
      return
    }

    const initializeEditor = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (!photoId || isNaN(Number(photoId))) {
          // 사진 ID가 없거나 올바르지 않으면 myroom으로 리다이렉트
          setError('사진을 먼저 선택해주세요.')
          setTimeout(() => {
            router.push('/myroom')
          }, 2000)
          return
        }

        // 🔥 백엔드에서 사진 정보 가져오기 (완전한 에러 처리)
        try {
          const photoData = await getPhotoById(Number(photoId))
          setPhoto(photoData)
          console.log('사진 로드 성공:', photoData)
        } catch (photoError: any) {
          console.error('Failed to load photo:', photoError)
          
          // 백엔드 에러 메시지 처리
          let errorMessage = '선택된 사진을 불러올 수 없습니다.'
          if (photoError?.response?.status === 404) {
            errorMessage = '존재하지 않는 사진입니다.'
          } else if (photoError?.response?.status === 403) {
            errorMessage = '해당 사진에 접근할 권한이 없습니다.'
          } else if (photoError?.response?.data?.message) {
            errorMessage = photoError.response.data.message
          }
          
          setError(errorMessage)
          setTimeout(() => {
            router.push('/myroom')
          }, 3000)
          return
        }

        // photoId가 있고 사진 로드 성공 시 게시물 생성 준비 완료
        setIsLoading(false)
        
      } catch (error) {
        console.error('Failed to initialize editor:', error)
        setError('편집기를 초기화하는데 실패했습니다.')
        setIsLoading(false)
      }
    }

    initializeEditor()
  }, [isAuthenticated, currentUser, photoId, router])

  // ✅ 백엔드 API 게시물 저장 - 완벽한 에러 처리
  const handleSave = async (inputCaption?: string) => {
    if (!currentUser || !photoId || !photo) return

    const finalCaption = inputCaption || caption || ''

    setIsSaving(true)
    setError(null)

    try {
      // 🔥 createFeed 함수 사용 (인터셉터를 통한 완전한 백엔드 연동)
      const newFeedId = await createFeed(Number(photoId), finalCaption)

      console.log('새 게시물 생성 완료:', newFeedId)

      // 성공 시 내 피드 페이지로 이동
      router.push('/my')
      
    } catch (error: any) {
      console.error('Failed to create feed:', error)
      
      // 백엔드 에러 메시지 상세 처리
      let errorMessage = '게시물 생성에 실패했습니다.'
      if (error?.response?.status === 400) {
        errorMessage = '잘못된 요청입니다. 사진 ID나 캡션을 확인해주세요.'
      } else if (error?.response?.status === 403) {
        errorMessage = '내 사진만 게시물로 만들 수 있습니다.'
      } else if (error?.response?.status === 404) {
        errorMessage = '존재하지 않는 사진입니다.'
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (caption.trim().length > 0) {
      if (confirm('작성 중인 게시물이 저장되지 않습니다. 정말 나가시겠습니까?')) {
        router.push('/myroom')
      }
    } else {
      router.push('/myroom')
    }
  }

  const handleCaptionChange = (value: string) => {
    setCaption(value)
    // 에러가 있으면 입력 시 클리어
    if (error) {
      setError(null)
    }
  }

  // 🔥 로그인하지 않은 경우
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">로그인 확인 중...</p>
        </div>
      </div>
    )
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">게시물 편집기를 준비하는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/myroom')}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              내 앨범으로 돌아가기
            </button>
            <button
              onClick={() => router.push('/my')}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              내 피드로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 상단 편집 헤더 */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="취소"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                새 게시물 만들기
              </h1>
              <p className="text-sm text-gray-500">
                {(currentUser as any)?.accountName || currentUser.name}의 피드에 추가
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 에러 메시지 표시 */}
            {error && (
              <p className="text-sm text-red-600 mr-4 max-w-xs truncate" title={error}>
                {error}
              </p>
            )}
            
            <button
              onClick={() => handleSave()}
              disabled={isSaving || !photoId || !photo}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  게시 중...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  게시하기
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 편집 영역 */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 🔥 사진 미리보기 섹션 - 백엔드 데이터로 표시 */}
          {photo && (
            <div className="border-b border-gray-200">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">선택된 사진</h3>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img 
                      src={photo.imgUrl} 
                      alt="Selected photo" 
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        console.error('Image failed to load:', photo.imgUrl)
                        setError('사진을 불러올 수 없습니다.')
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <PhotoIcon className="h-5 w-5" />
                      <span>Photo ID: {photo.photoId}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      업로드: {new Date(photo.createdAt).toLocaleString('ko-KR')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      업로더: {photo.user.userName} (@{photo.user.accountName})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 캡션 입력 섹션 */}
          <div className="p-4">
            <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
              캡션
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              placeholder="이 순간에 대해 이야기해보세요..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              rows={4}
              maxLength={200}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                {caption.length}/200자
              </p>
              <p className="text-xs text-gray-500">
                내 피드에 새 게시물로 추가됩니다
              </p>
            </div>
          </div>
        </div>

        {/* 게시물 미리보기 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">미리보기</h3>
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
              {(currentUser as any)?.profileImage ? (
                <img 
                  src={(currentUser as any).profileImage} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {currentUser.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <p className="font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-sm text-gray-500">
                  @{(currentUser as any)?.accountName || 'user'}
                </p>
              </div>
              
              {/* 🔥 실제 백엔드 사진이 있으면 표시 */}
              {photo && (
                <div className="mb-3">
                  <img 
                    src={photo.imgUrl} 
                    alt="Post preview" 
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              )}
              
              <p className="text-gray-800 whitespace-pre-wrap">
                {caption || '새로운 게시물입니다'}
              </p>
              <p className="text-xs text-gray-500 mt-2">방금 전</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// 🔥 메인 컴포넌트 - Suspense 경계 적용
// ============================================================================

const PostCreatePage: React.FC = () => {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">페이지를 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <PostCreateContent />
    </Suspense>
  )
}

export default PostCreatePage
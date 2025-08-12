'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import FeedEditor from '@/components/page/feed/FeedEditor'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/auth/useAuth'

// ============================================================================
// 🔥 백엔드 연동 타입 정의
// ============================================================================

interface CreateFeedRequest {
  photoId: number
  caption: string
}

const PostCreatePage: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState<string>('')
  
  // URL 파라미터에서 사진 ID 가져오기 (새 게시물 생성 시 필수)
  const photoId = searchParams.get('photoId')

  // ============================================================================
  // 🔥 백엔드 API 호출 함수
  // ============================================================================

  // 🔥 백엔드 API: POST /feeds - 새 게시물 생성 (피드에 추가)
  const createPost = async (request: CreateFeedRequest): Promise<number> => {
    const response = await fetch('/api/feeds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      throw new Error('게시물 생성에 실패했습니다.')
    }
    
    const data = await response.json()
    return data.data // ApiResponse<Long> - 생성된 feedId(게시물ID) 반환
  }

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
        if (!photoId) {
          // 사진 ID가 없으면 사진 업로드 페이지로 리다이렉트
          setError('사진을 먼저 선택해주세요.')
          setTimeout(() => {
            router.push('/upload-photo') // 또는 사진 업로드 페이지 경로
          }, 2000)
          return
        }

        // photoId가 있으면 게시물 생성 준비 완료
        setIsLoading(false)
        
      } catch (error) {
        console.error('Failed to initialize editor:', error)
        setError('편집기를 초기화하는데 실패했습니다.')
        setIsLoading(false)
      }
    }

    initializeEditor()
  }, [isAuthenticated, currentUser, photoId, router])

  // ✅ 백엔드 API 게시물 저장
  const handleSave = async (inputCaption?: string) => {
    if (!currentUser || !photoId) return

    const finalCaption = inputCaption || caption || '새로운 게시물입니다'

    setIsSaving(true)
    setError(null)

    try {
      // 새 게시물 생성 (내 피드에 추가)
      const newPostId = await createPost({
        photoId: Number(photoId),
        caption: finalCaption
      })

      console.log('새 게시물 생성 완료:', newPostId)

      // 성공 시 내 피드 페이지로 이동
      router.push('/my')
      
    } catch (error) {
      console.error('Failed to create post:', error)
      setError(error instanceof Error ? error.message : '게시물 생성에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (confirm('작성 중인 게시물이 저장되지 않습니다. 정말 나가시겠습니까?')) {
      router.push('/my')
    }
  }

  const handleCaptionChange = (value: string) => {
    setCaption(value)
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => router.push('/my')}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              내 피드로 돌아가기
            </button>
            <button
              onClick={() => router.push('/upload-photo')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              사진 선택하기
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
              <p className="text-sm text-red-600 mr-4">{error}</p>
            )}
            
            <button
              onClick={() => handleSave()}
              disabled={isSaving || !photoId}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
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
          {/* 사진 미리보기 섹션 */}
          {photoId && (
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">선택된 사진</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <PhotoIcon className="h-5 w-5" />
                <span>Photo ID: {photoId}</span>
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
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* FeedEditor 컴포넌트 (필요한 경우) */}
          <div className="border-t border-gray-200">
            <FeedEditor 
              userId={(currentUser as any)?.accountName || currentUser.id?.toString()} 
              feedId={null} // 새 게시물이므로 null
              photoId={photoId ? Number(photoId) : undefined}
              onSave={handleSave}
              mode="create"
            />
          </div>
        </div>

        {/* 게시물 미리보기 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">미리보기</h3>
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
              {(currentUser as any)?.profileImage ? (
                <img 
                  src={(currentUser as any).profileImage} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {currentUser.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <p className="font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-sm text-gray-500">
                  @{(currentUser as any)?.accountName || 'user'}
                </p>
              </div>
              <p className="text-gray-800">
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

export default PostCreatePage
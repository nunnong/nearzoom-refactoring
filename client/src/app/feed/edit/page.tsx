'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import FeedEditor from '@/components/page/feed/FeedEditor'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/auth/useAuth'

// ✅ 백엔드 연동 임포트
import { createFeed, getFeed, updateFeed } from '@/lib/api/feed'

const FeedEditPage: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedId, setFeedId] = useState<string | null>(null)
  
  // URL 파라미터에서 편집할 피드 ID와 사진 ID 가져오기
  const editFeedId = searchParams.get('feedId') // 기존 피드 편집 시
  const photoId = searchParams.get('photoId')   // 새 피드 생성 시 사진 ID

  // ✅ 인증 확인 및 초기 데이터 로드
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login')
      return
    }

    const initializeEditor = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (editFeedId) {
          // 기존 피드 편집 모드
          const result = await getFeed(editFeedId)
          if (result.success && result.data) {
            setFeedId(editFeedId)
          } else {
            setError('피드를 불러올 수 없습니다.')
          }
        } else if (photoId) {
          // 새 피드 생성 모드 - photoId가 있어야 함
          setFeedId(null) // 새 피드이므로 null
        } else {
          // photoId도 없고 feedId도 없으면 에러
          setError('사진을 먼저 선택해주세요.')
        }
      } catch (error) {
        console.error('Failed to initialize editor:', error)
        setError('편집기를 초기화하는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeEditor()
  }, [isAuthenticated, currentUser, editFeedId, photoId, router])

  // ✅ 백엔드 API 피드 저장
  const handleSave = async (caption: string = '') => {
    if (!currentUser) return

    setIsSaving(true)
    setError(null)

    try {
      let result

      if (feedId) {
        // 기존 피드 업데이트 (현재 백엔드에서 지원하지 않음)
        result = await updateFeed(feedId, { 
          // 캔버스 요소들은 현재 백엔드에서 지원하지 않으므로 기본값만 전달
        })
        
        if (!result.success) {
          throw new Error(result.error || '피드 업데이트에 실패했습니다.')
        }
      } else {
        // 새 피드 생성
        if (!photoId) {
          throw new Error('사진 ID가 필요합니다.')
        }

        result = await createFeed(Number(photoId), caption)
        
        if (!result.success) {
          throw new Error(result.error || '피드 생성에 실패했습니다.')
        }

        // 생성된 피드 ID 저장
        if (result.data) {
          setFeedId(result.data.id)
        }
      }

      // 성공 시 내 피드 페이지로 이동
      router.push('/my')
      
    } catch (error) {
      console.error('Failed to save feed:', error)
      setError(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (confirm('변경사항이 저장되지 않습니다. 정말 나가시겠습니까?')) {
      router.push('/my')
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
          <p className="mt-4 text-gray-600">편집기를 준비하는 중...</p>
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
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
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
                {feedId ? '피드 편집' : '새 피드 만들기'}
              </h1>
              <p className="text-sm text-gray-500">
                {currentUser.name}의 다이어리 꾸미기
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 에러 메시지 표시 */}
            {error && (
              <p className="text-sm text-red-600 mr-4">{error}</p>
            )}
            
            <button
              onClick={() => handleSave('새로운 피드입니다')} // ✅ 기본 캡션으로 저장
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  저장 중...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  저장하고 완료
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 편집 영역 */}
      <main className="h-[calc(100vh-73px)]">
        <FeedEditor 
          userId={currentUser.id.toString()} 
          feedId={feedId}
          photoId={photoId ? Number(photoId) : undefined}
          onSave={handleSave}
          mode={feedId ? 'edit' : 'create'}
        />
      </main>
    </div>
  )
}

export default FeedEditPage
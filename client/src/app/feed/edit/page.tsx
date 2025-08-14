// src/app/feed/edit/page.tsx - 백엔드 연동 완료

'use client'

import React, { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/auth/useAuth'
import axios from 'axios'

// ============================================================================
// 백엔드 연동 설정
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 인증 토큰 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// 백엔드 연동 타입 정의 (실제 백엔드 API 구조와 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 PhotoForFeedUploadResponse (MyRoom에서 가져온 사진 정보)
interface PhotoForFeedUploadResponse {
  photoId: number;
  imgUrl: string;
  takenAt: string;
  alreadyInFeed: boolean;
}

// 🔥 백엔드 CreatePostFromMyRoomRequest (Feed API)
interface CreatePostFromMyRoomRequest {
  photoId: number;
  caption: string;
}

// ============================================================================
// 백엔드 API 함수들 (실제 백엔드 API 엔드포인트 사용)
// ============================================================================

const postCreateAPI = {
  // 🔥 GET /myroom/photos/{photoId}/feed-upload-info - 마이룸 사진 정보 조회
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoForFeedUploadResponse> => {
    try {
      const response = await api.get<ApiResponse<PhotoForFeedUploadResponse>>(
        `/myroom/photos/${photoId}/feed-upload-info`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사진 정보를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('사진 데이터가 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to get photo for feed upload:', error);
      throw error;
    }
  },

  // 🔥 POST /feeds/posts/from-myroom - 마이룸 사진으로 피드 게시물 생성
  createPostFromMyRoom: async (photoId: number, caption: string): Promise<number> => {
    try {
      const requestBody: CreatePostFromMyRoomRequest = {
        photoId,
        caption: caption.trim()
      };
      
      const response = await api.post<ApiResponse<number>>(
        '/feeds/posts/from-myroom',
        requestBody
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 생성에 실패했습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('게시물 ID가 반환되지 않았습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to create post from myroom:', error);
      throw error;
    }
  }
};

// ============================================================================
// SearchParams를 사용하는 컴포넌트 분리 (Suspense 경계 적용)
// ============================================================================

const PostCreateContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState<string>('')
  const [photoInfo, setPhotoInfo] = useState<PhotoForFeedUploadResponse | null>(null)
  
  // URL 파라미터에서 사진 ID 가져오기
  const photoId = searchParams.get('photoId')

  // ============================================================================
  // 백엔드 API 호출 - 사진 정보 로드 및 초기화
  // ============================================================================

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login')
      return
    }

    const initializeEditor = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // photoId 유효성 검사
        if (!photoId || isNaN(Number(photoId))) {
          setError('사진을 먼저 선택해주세요.')
          setTimeout(() => {
            router.push('/myroom')
          }, 2000)
          return
        }

        console.log('=== 게시물 생성 페이지 초기화 시작 ===', { photoId });

        // 🔥 백엔드에서 마이룸 사진 정보 가져오기
        const photoData = await postCreateAPI.getPhotoForFeedUpload(Number(photoId));
        
        // 이미 피드에 올린 사진인지 확인
        if (photoData.alreadyInFeed) {
          setError('이미 피드에 올린 사진입니다.');
          setTimeout(() => {
            router.push('/myroom')
          }, 3000)
          return
        }

        setPhotoInfo(photoData);
        console.log('✅ 사진 정보 로드 완료:', photoData);

      } catch (error: any) {
        console.error('❌ 게시물 편집기 초기화 실패:', error);
        
        // 백엔드 에러 메시지 처리
        let errorMessage = '사진 정보를 불러올 수 없습니다.';
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            errorMessage = '존재하지 않는 사진입니다.';
          } else if (error.response?.status === 403) {
            errorMessage = '해당 사진에 접근할 권한이 없습니다.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        setTimeout(() => {
          router.push('/myroom')
        }, 3000)
      } finally {
        setIsLoading(false);
      }
    }

    initializeEditor()
  }, [isAuthenticated, currentUser, photoId, router])

  // ============================================================================
  // 백엔드 API - 게시물 생성
  // ============================================================================

  const handleSave = async () => {
    if (!currentUser || !photoId || !photoInfo) return

    setIsSaving(true)
    setError(null)

    try {
      console.log('=== 게시물 생성 시작 ===', {
        photoId: Number(photoId),
        caption: caption.trim()
      });

      // 🔥 백엔드 API 호출 - 마이룸 사진으로 피드 게시물 생성
      const newPostId = await postCreateAPI.createPostFromMyRoom(
        Number(photoId), 
        caption.trim()
      );

      console.log('✅ 게시물 생성 완료:', { newPostId });

      // 성공 시 내 피드 페이지로 이동
      router.push('/my');
      
    } catch (error: any) {
      console.error('❌ 게시물 생성 실패:', error);
      
      // 백엔드 에러 메시지 상세 처리
      let errorMessage = '게시물 생성에 실패했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = '잘못된 요청입니다. 사진 ID나 캡션을 확인해주세요.';
        } else if (error.response?.status === 403) {
          errorMessage = '내 사진만 게시물로 만들 수 있습니다.';
        } else if (error.response?.status === 404) {
          errorMessage = '존재하지 않는 사진입니다.';
        } else if (error.response?.status === 409) {
          errorMessage = '이미 피드에 올린 사진입니다.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

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

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  // 로그인하지 않은 경우
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

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

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
              onClick={handleSave}
              disabled={isSaving || !photoId || !photoInfo}
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
          {photoInfo && (
            <div className="border-b border-gray-200">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">선택된 사진</h3>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img 
                      src={photoInfo.imgUrl} 
                      alt="Selected photo" 
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        console.error('Image failed to load:', photoInfo.imgUrl)
                        setError('사진을 불러올 수 없습니다.')
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <PhotoIcon className="h-5 w-5" />
                      <span>Photo ID: {photoInfo.photoId}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      촬영일: {new Date(photoInfo.takenAt).toLocaleString('ko-KR')}
                    </p>
                    <div className="mt-2">
                      {photoInfo.alreadyInFeed ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          이미 피드에 게시됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          게시 가능
                        </span>
                      )}
                    </div>
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
              {photoInfo && (
                <div className="mb-3">
                  <img 
                    src={photoInfo.imgUrl} 
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

      {/* 개발 모드에서 디버깅 정보 표시 */}
      {process.env.NODE_ENV === 'development' && photoInfo && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔧 게시물 생성 디버깅</div>
          <div>Photo ID: {photoInfo.photoId}</div>
          <div>이미지 URL: {photoInfo.imgUrl.substring(0, 30)}...</div>
          <div>피드 게시 여부: {photoInfo.alreadyInFeed ? 'Yes' : 'No'}</div>
          <div>캡션 길이: {caption.length}/200</div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 메인 컴포넌트 - Suspense 경계 적용
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
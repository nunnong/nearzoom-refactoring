// src/app/feed/edit/page.tsx - 올바른 아키텍처 적용

'use client'

import React, { Suspense } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, CheckIcon, PhotoIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'
import { FeedLoadingSpinner, ApiLoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'

// 🏗️ 올바른 아키텍처: 통합된 api 인스턴스 사용
import api from '@/lib/axios'

// 🏗️ 올바른 아키텍처: Zustand 스토어 사용
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 🔥 백엔드 연동 타입 정의 (Feed API 기반)
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
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

// 🔥 백엔드 CreatePostFromMyRoomRequest (Feed API)
interface CreatePostFromMyRoomRequest {
  photoId: number;
  caption: string;
}

// 🔥 백엔드 사용자 정보
interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

// ============================================================================
// 🔥 백엔드 API 함수들 (올바른 아키텍처 적용)
// ============================================================================

const feedEditAPI = {
  // 🔥 GET /photos/{photoId} - 마이룸 사진 정보 조회 (상세)
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoForFeedUploadResponse> => {
    try {
      console.log(`🔍 사진 정보 조회: photoId=${photoId}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.get<ApiResponse<PhotoForFeedUploadResponse>>(
        `/photos/${photoId}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사진 정보를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('사진 데이터가 없습니다.');
      }
      
      console.log(`✅ 사진 정보 조회 성공:`, response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 사진 정보 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 POST /feeds/posts/from-myroom - 마이룸 사진으로 피드 게시물 생성
  createPostFromMyRoom: async (photoId: number, caption: string): Promise<number> => {
    try {
      console.log('🔍 게시물 생성 요청:', { photoId, caption: caption.substring(0, 50) + '...' });
      
      const requestBody: CreatePostFromMyRoomRequest = {
        photoId,
        caption: caption.trim()
      };
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
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
      
      console.log(`✅ 게시물 생성 성공: postId=${response.data.data}`);
      return response.data.data;
    } catch (error) {
      console.error('❌ 게시물 생성 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /users/me - 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<BackendUserInfo> => {
    const endpoints = ['/users/me', '/users/profile', '/auth/me'];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 사용자 정보 조회: ${endpoint}`);
        
        // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
        const response = await api.get<ApiResponse<BackendUserInfo>>(endpoint);
        
        if (response.data.error) {
          continue;
        }
        
        if (!response.data.data) {
          continue;
        }
        
        console.log(`✅ 사용자 정보 조회 성공: ${endpoint}`, response.data.data);
        return response.data.data;
        
      } catch (error) {
        console.warn(`❌ ${endpoint} 실패:`, error);
        continue;
      }
    }

    throw new Error('사용자 정보를 가져올 수 없습니다.');
  },

  // 🔥 사진이 이미 피드에 올라갔는지 확인 (추가 검증)
  checkPhotoInFeed: async (photoId: number): Promise<boolean> => {
    try {
      // 사용자의 피드에서 해당 photoId를 가진 게시물이 있는지 확인
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.get<ApiResponse<any>>(
        `/feeds/posts?photoId=${photoId}&limit=1`
      );
      
      if (response.data.error) {
        return false;
      }
      
      const posts = response.data.data || [];
      return posts.length > 0;
    } catch (error) {
      console.warn('사진 피드 중복 확인 실패:', error);
      return false;
    }
  },
};

// ============================================================================
// SearchParams를 사용하는 컴포넌트 분리 (Suspense 경계 적용)
// ============================================================================

const FeedEditContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  
  // 🏗️ 올바른 아키텍처: Zustand 스토어에서 인증 상태 관리
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState<string>('')
  const [photoInfo, setPhotoInfo] = useState<PhotoForFeedUploadResponse | null>(null)
  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  
  // URL 파라미터에서 사진 ID 가져오기
  const photoId = searchParams.get('photoId')

  // ============================================================================
  // 🔥 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null);
      return;
    }

    setIsLoadingUser(true);

    try {
      const userInfo = await feedEditAPI.getCurrentUser();
      setCurrentUser(userInfo);
    } catch (error) {
      console.warn('사용자 정보 로드 실패, Zustand user 사용:', error);
      
      // Fallback: Zustand user 정보 사용
      if (user) {
        setCurrentUser({
          userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
          accountName: (user as any)?.accountName || user.email.split('@')[0],
          userName: user.name || user.email,
          userEmail: user.email,
          profileImage: (user as any)?.profileImage,
        });
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, user]);

  // ============================================================================
  // 🔥 백엔드 API 호출 - 사진 정보 로드 및 초기화
  // ============================================================================

  const initializeEditor = useCallback(async () => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // photoId 유효성 검사
      if (!photoId || isNaN(Number(photoId))) {
        setError('사진을 먼저 선택해주세요.');
        setTimeout(() => {
          router.push('/myroom');
        }, 2000);
        return;
      }

      console.log('=== 피드 게시물 편집기 초기화 시작 ===', { photoId });

      // 🔥 병렬로 사용자 정보와 사진 정보 로드
      const [userInfo, photoData] = await Promise.allSettled([
        feedEditAPI.getCurrentUser(),
        feedEditAPI.getPhotoForFeedUpload(Number(photoId))
      ]);

      // 사용자 정보 처리
      if (userInfo.status === 'fulfilled') {
        setCurrentUser(userInfo.value);
      } else {
        console.warn('사용자 정보 로드 실패, Zustand user 사용');
        if (user) {
          setCurrentUser({
            userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
            accountName: (user as any)?.accountName || user.email.split('@')[0],
            userName: user.name || user.email,
            userEmail: user.email,
            profileImage: (user as any)?.profileImage,
          });
        }
      }

      // 사진 정보 처리
      if (photoData.status === 'fulfilled') {
        const photo = photoData.value;
        
        // 🔥 추가 검증: 이미 피드에 올린 사진인지 확인
        if (photo.alreadyInFeed) {
          setError('이미 피드에 올린 사진입니다.');
          toast.warning('중복 게시물', '이미 피드에 올린 사진입니다.');
          setTimeout(() => {
            router.push('/myroom');
          }, 3000);
          return;
        }

        // 🔥 이중 검증: 백엔드에서 한 번 더 확인
        const isAlreadyInFeed = await feedEditAPI.checkPhotoInFeed(Number(photoId));
        if (isAlreadyInFeed) {
          setError('이미 피드에 올린 사진입니다.');
          toast.warning('중복 게시물', '이미 피드에 올린 사진입니다.');
          setTimeout(() => {
            router.push('/myroom');
          }, 3000);
          return;
        }

        setPhotoInfo(photo);
        console.log('✅ 편집기 초기화 완료:', photo);
        toast.success('편집기 준비 완료', '게시물을 작성해주세요.');
      } else {
        throw photoData.reason;
      }

    } catch (error: any) {
      console.error('❌ 편집기 초기화 실패:', error);
      
      // 백엔드 에러 메시지 상세 처리
      let errorMessage = '사진 정보를 불러올 수 없습니다.';
      
      if (error.response?.status === 404) {
        errorMessage = '존재하지 않는 사진입니다.';
      } else if (error.response?.status === 403) {
        errorMessage = '해당 사진에 접근할 권한이 없습니다.';
      } else if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error('초기화 실패', errorMessage);
      
      setTimeout(() => {
        router.push('/myroom');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, photoId, router, toast]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    initializeEditor();
  }, [initializeEditor]);

  // ============================================================================
  // 🔥 백엔드 API - 게시물 생성
  // ============================================================================

  const handleSave = useCallback(async () => {
    if (!currentUser || !photoId || !photoInfo) {
      toast.error('저장 불가', '필요한 정보가 없습니다.');
      return;
    }

    if (caption.trim().length === 0) {
      toast.warning('캡션 필요', '캡션을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('=== 게시물 생성 시작 ===', {
        photoId: Number(photoId),
        caption: caption.trim().substring(0, 50) + '...'
      });

      // 🔥 백엔드 API 호출 - Toast와 함께
      const loadingToastId = toast.loading('게시물 생성 중...', '피드에 업로드하고 있습니다.');

      const newPostId = await feedEditAPI.createPostFromMyRoom(
        Number(photoId), 
        caption.trim()
      );

      // 로딩 토스트 제거 후 성공 토스트 표시
      toast.removeToast(loadingToastId);
      toast.success('게시물 생성 완료!', '피드에 성공적으로 업로드되었습니다.');

      console.log('✅ 게시물 생성 완료:', { newPostId });

      // 성공 시 사용자 피드 페이지로 이동 (백엔드 URL 기반)
      if (currentUser.accountName) {
        router.push(`/feeds/users/account/${currentUser.accountName}`);
      } else {
        router.push('/my');
      }
      
    } catch (error: any) {
      console.error('❌ 게시물 생성 실패:', error);
      
      // 백엔드 에러 메시지 상세 처리
      let errorMessage = '게시물 생성에 실패했습니다.';
      let errorTitle = '생성 실패';
      
      if (error.response?.status === 400) {
        errorMessage = '잘못된 요청입니다. 사진 ID나 캡션을 확인해주세요.';
        errorTitle = '잘못된 요청';
      } else if (error.response?.status === 403) {
        errorMessage = '내 사진만 게시물로 만들 수 있습니다.';
        errorTitle = '권한 없음';
      } else if (error.response?.status === 404) {
        errorMessage = '존재하지 않는 사진입니다.';
        errorTitle = '사진 없음';
      } else if (error.response?.status === 409) {
        errorMessage = '이미 피드에 올린 사진입니다.';
        errorTitle = '중복 게시물';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, photoId, photoInfo, caption, router, toast]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleCancel = useCallback(() => {
    if (caption.trim().length > 0) {
      if (confirm('작성 중인 게시물이 저장되지 않습니다. 정말 나가시겠습니까?')) {
        router.push('/myroom');
      }
    } else {
      router.push('/myroom');
    }
  }, [caption, router]);

  const handleCaptionChange = useCallback((value: string) => {
    setCaption(value);
    // 에러가 있으면 입력 시 클리어
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleRetry = useCallback(() => {
    setError(null);
    initializeEditor();
  }, [initializeEditor]);

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  const displayUser = currentUser || (user ? {
    userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    accountName: (user as any)?.accountName || user.email.split('@')[0],
    userName: user.name || user.email,
    userEmail: user.email,
    profileImage: (user as any)?.profileImage,
  } : null);

  // 🏗️ 아키텍처 원칙: 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ApiLoadingSpinner text="로그인 상태 확인 중..." apiEndpoint="/auth/verify" />
        </div>
      </div>
    );
  }

  // 🏗️ 아키텍처 원칙: 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-600 mb-6">게시물을 작성하려면 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FeedLoadingSpinner
            text="게시물 편집기 준비 중..."
            size="lg"
            apiEndpoint={`/photos/${photoId}`}
          />
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error && !photoInfo) {
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
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.push('/myroom')}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              내 앨범으로 돌아가기
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="w-full px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              탐색 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔥 메인 렌더링 (백엔드 연동 최적화)
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 🔥 상단 편집 헤더 (백엔드 연동) */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="취소"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                새 게시물 만들기
              </h1>
              <p className="text-sm text-gray-500">
                {displayUser?.userName || '사용자'}의 피드에 추가
                {displayUser?.accountName && (
                  <span className="ml-1">(@{displayUser.accountName})</span>
                )}
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
              disabled={isSaving || !photoId || !photoInfo || caption.trim().length === 0}
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
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  선택된 사진
                </h3>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img 
                      src={photoInfo.imgUrl} 
                      alt="Selected photo" 
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                      onError={(e) => {
                        console.error('Image failed to load:', photoInfo.imgUrl);
                        setError('사진을 불러올 수 없습니다.');
                        toast.error('이미지 로드 실패', '사진을 불러올 수 없습니다.');
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="font-medium">Photo ID:</span>
                        <span className="font-mono">{photoInfo.photoId}</span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">촬영일:</span> {new Date(photoInfo.takenAt).toLocaleString('ko-KR')}
                      </div>
                      
                      {photoInfo.fileName && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">파일명:</span> {photoInfo.fileName}
                        </div>
                      )}
                      
                      {photoInfo.width && photoInfo.height && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">크기:</span> {photoInfo.width} × {photoInfo.height}
                        </div>
                      )}
                      
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
            </div>
          )}

          {/* 캡션 입력 섹션 */}
          <div className="p-4">
            <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
              캡션 *
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              placeholder="이 순간에 대해 이야기해보세요..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              rows={4}
              maxLength={200}
              required
            />
            <div className="flex justify-between items-center mt-2">
              <p className={`text-xs ${caption.length > 180 ? 'text-red-500' : 'text-gray-500'}`}>
                {caption.length}/200자
                {caption.length === 0 && (
                  <span className="text-red-500 ml-2">* 필수 입력</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {displayUser?.accountName ? `@${displayUser.accountName}` : '내'} 피드에 새 게시물로 추가됩니다
              </p>
            </div>
          </div>

          {/* 🔥 게시물 미리보기 섹션 (백엔드 사용자 정보 반영) */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              게시물 미리보기
            </h3>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start space-x-3">
                {/* 프로필 이미지 */}
                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                  {displayUser?.profileImage ? (
                    <img 
                      src={displayUser.profileImage} 
                      alt={displayUser.userName} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `
                          <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            ${displayUser.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {displayUser?.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="font-semibold text-gray-900">
                      {displayUser?.userName || '사용자'}
                    </p>
                    <p className="text-sm text-gray-500">
                      @{displayUser?.accountName || 'user'}
                    </p>
                    {isLoadingUser && (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  
                  {/* 🔥 실제 백엔드 사진이 있으면 표시 */}
                  {photoInfo && (
                    <div className="mb-3">
                      <img 
                        src={photoInfo.imgUrl} 
                        alt="Post preview" 
                        className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {caption || '새로운 게시물입니다...'}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>방금 전</span>
                      <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>좋아요</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>댓글</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 게시물 정보 카드 */}
          {photoInfo && (
            <div className="border-t border-gray-200 bg-blue-50 p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                게시물 정보
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">사진 ID:</span>
                    <span className="text-blue-600 font-mono">{photoInfo.photoId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">촬영일:</span>
                    <span className="text-blue-600">{new Date(photoInfo.takenAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {photoInfo.width && photoInfo.height && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">해상도:</span>
                      <span className="text-blue-600">{photoInfo.width} × {photoInfo.height}</span>
                    </div>
                  )}
                  {photoInfo.fileSize && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">파일 크기:</span>
                      <span className="text-blue-600">{(photoInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">캡션 길이:</span>
                    <span className="text-blue-600">{caption.length}/200자</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">게시 대상:</span>
                    <span className="text-blue-600">공개 피드</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">상태:</span>
                    <span className={`font-medium ${
                      caption.trim().length > 0 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {caption.trim().length > 0 ? '게시 준비 완료' : '캡션 입력 필요'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">작성자:</span>
                    <span className="text-blue-600">@{displayUser?.accountName || 'user'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🔥 추가 도움말 및 팁 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            피드 게시 팁
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>감정이나 순간을 담은 캡션이 더 많은 공감을 받아요</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>해시태그나 멘션을 사용해 더 많은 사람들과 소통하세요</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">💡</span>
                <span>게시 후에도 캡션을 수정할 수 있어요</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">💡</span>
                <span>피드에 게시하면 팔로워들이 바로 볼 수 있어요</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 🔥 개발 모드에서 백엔드 연동 상태 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white text-xs rounded-lg p-3 z-30 max-w-xs">
          <details>
            <summary className="cursor-pointer font-semibold mb-2 text-yellow-300">
              🔧 Feed Edit 올바른 아키텍처 상태
            </summary>
            <div className="space-y-1">
              <div><strong>🏗️ API:</strong> @/lib/axios</div>
              <div><strong>🏗️ Auth Store:</strong> {isAuthenticated ? '✅ OK' : '❌ No'}</div>
              <div><strong>🏗️ 토큰 관리:</strong> Zustand + 인터셉터</div>
              <div><strong>Photo ID:</strong> {photoId}</div>
              <div><strong>로딩:</strong> {isLoading ? '⏳ Loading' : '✅ Done'}</div>
              <div><strong>저장 중:</strong> {isSaving ? '⏳ Saving' : '✅ Ready'}</div>
              
              {photoInfo && (
                <>
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div><strong>사진 정보:</strong></div>
                    <div className="ml-2 text-xs">
                      <div>ID: {photoInfo.photoId}</div>
                      <div>URL: {photoInfo.imgUrl.substring(0, 30)}...</div>
                      <div>피드 게시: {photoInfo.alreadyInFeed ? '❌ Yes' : '✅ No'}</div>
                      {photoInfo.width && <div>크기: {photoInfo.width}×{photoInfo.height}</div>}
                      {photoInfo.fileSize && <div>용량: {(photoInfo.fileSize / 1024 / 1024).toFixed(1)}MB</div>}
                    </div>
                  </div>
                </>
              )}
              
              {displayUser && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div><strong>사용자:</strong></div>
                  <div className="ml-2 text-xs">
                    <div>ID: {displayUser.userId}</div>
                    <div>계정: {displayUser.accountName}</div>
                    <div>이름: {displayUser.userName}</div>
                    <div>소스: {currentUser ? 'Backend' : 'Zustand'}</div>
                  </div>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div><strong>캡션:</strong> {caption.length}/200자</div>
                <div><strong>에러:</strong> {error ? `❌ ${error.substring(0, 20)}...` : '✅ None'}</div>
                <div><strong>저장 가능:</strong> {
                  (!isSaving && photoId && photoInfo && caption.trim().length > 0) ? '✅ Yes' : '❌ No'
                }</div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                <div><strong>🔗 API 엔드포인트 (@/lib/axios):</strong></div>
                <div className="ml-2 space-y-1">
                  <div>• GET /photos/{photoId}</div>
                  <div>• POST /feeds/posts/from-myroom</div>
                  <div>• GET /users/me</div>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                <div><strong>🏗️ 아키텍처 준수:</strong></div>
                <div className="ml-2 space-y-1">
                  <div>✅ 통합 axios 인스턴스</div>
                  <div>✅ Zustand 상태 관리</div>
                  <div>✅ 자동 토큰 처리</div>
                  <div>✅ 커서 기반 무한스크롤 준비</div>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 🔥 메인 컴포넌트 - Suspense 경계 적용
// ============================================================================

const FeedEditPage: React.FC = () => {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FeedLoadingSpinner
              text="페이지를 불러오는 중..."
              size="lg"
            />
            <p className="mt-4 text-sm text-gray-500">
              올바른 아키텍처 적용: 사용자 정보와 사진 데이터를 확인하고 있습니다...
            </p>
          </div>
        </div>
      }
    >
      <FeedEditContent />
    </Suspense>
  );
};

export default FeedEditPage;
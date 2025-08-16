// src/app/feed/edit/page.tsx - 백엔드 DTO와 정확히 일치하도록 수정

'use client'

import React, { Suspense, useMemo } from 'react'
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
// 🔥 백엔드 연동 타입 정의 (백엔드 Java DTO와 정확히 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 PhotoForFeedUploadResponse - Java record와 정확히 일치
interface PhotoForFeedUploadResponse {
  photoId: number;       // Long -> number
  imgUrl: string;        // String
  takenAt: string;       // LocalDateTime -> ISO string
  alreadyInFeed: boolean; // boolean
}

// 🔥 백엔드 CreatePostFromMyRoomRequest (Feed API)
interface CreatePostFromMyRoomRequest {
  photoId: number;
  caption: string;
}

// 🔥 백엔드 사용자 정보 (추정)
interface BackendUserInfo {
  userId: number;
  accountName?: string;
  userName?: string;
  userEmail: string;
  profileImage?: string;
}

// ============================================================================
// 🔥 백엔드 API 함수들 (디버깅 강화)
// ============================================================================

const feedEditAPI = {
  // 🔥 GET /myroom/photos/{photoId}/feed-upload-info - 백엔드와 정확히 일치
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoForFeedUploadResponse> => {
    try {
      console.log(`🔍 [API] 사진 정보 조회 시작: photoId=${photoId}`);
      
      // 인증 상태 확인
      const authState = useAuthStore.getState();
      console.log('🔍 [AUTH] 현재 상태:', {
        isAuthenticated: authState.isAuthenticated,
        hasUser: !!authState.user,
        userEmail: authState.user?.email
      });

      const response = await api.get<ApiResponse<PhotoForFeedUploadResponse>>(
        `/myroom/photos/${photoId}/feed-upload-info`
      );
      
      console.log(`🔍 [API] 응답 상태:`, response.status);
      console.log(`🔍 [API] 응답 헤더:`, response.headers);
      console.log(`🔍 [API] 응답 데이터:`, response.data);
      
      if (response.data.error) {
        console.error(`❌ [API] 백엔드 에러:`, response.data.message);
        throw new Error(response.data.message || '사진 정보를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        console.error(`❌ [API] 데이터 없음`);
        throw new Error('사진 데이터가 없습니다.');
      }
      
      console.log(`✅ [API] 사진 정보 조회 성공:`, response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('❌ [API] 사진 정보 조회 실패:', error);
      
      // 상세 에러 로깅
      if (error.response) {
        console.error('❌ [API] HTTP 에러:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      } else if (error.request) {
        console.error('❌ [API] 네트워크 에러:', error.request);
      } else {
        console.error('❌ [API] 설정 에러:', error.message);
      }
      
      throw error;
    }
  },

  // 🔥 POST /feeds/posts/from-myroom - 백엔드에 구현된 올바른 엔드포인트
  createPostFromMyRoom: async (photoId: number, caption: string): Promise<number> => {
    try {
      console.log('🔍 [API] 게시물 생성 요청:', { 
        photoId, 
        captionLength: caption.length,
        captionPreview: caption.substring(0, 50) + '...' 
      });
      
      const requestBody: CreatePostFromMyRoomRequest = {
        photoId,
        caption: caption.trim()
      };
      
      console.log('🔍 [API] 요청 바디:', requestBody);

      // ✅ 백엔드에 구현된 올바른 엔드포인트 사용
      const response = await api.post<ApiResponse<number>>(
        '/feeds/posts/from-myroom',
        requestBody
      );
      
      console.log(`🔍 [API] 게시물 생성 응답:`, response.data);
      
      if (response.data.error) {
        console.error(`❌ [API] 게시물 생성 에러:`, response.data.message);
        throw new Error(response.data.message || '게시물 생성에 실패했습니다.');
      }
      
      if (!response.data.data) {
        console.error(`❌ [API] 게시물 ID 없음`);
        throw new Error('게시물 ID가 반환되지 않았습니다.');
      }
      
      console.log(`✅ [API] 게시물 생성 성공: postId=${response.data.data}`);
      return response.data.data;
      
    } catch (error: any) {
      console.error('❌ [API] 게시물 생성 실패:', error);
      
      if (error.response) {
        console.error('❌ [API] 게시물 생성 HTTP 에러:', {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url
        });
      }
      
      throw error;
    }
  },

  // 🔥 사용자 정보 조회 - my/page.tsx와 동일한 패턴
  getCurrentUser: async (): Promise<BackendUserInfo> => {
    const endpoints = ['/users/me', '/auth/me', '/users/profile', '/user/info'];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 [API] 사용자 정보 조회 시도: ${endpoint}`);
        
        const response = await api.get<ApiResponse<BackendUserInfo>>(endpoint);
        
        console.log(`🔍 [API] ${endpoint} 응답:`, response.data);
        
        if (response.data.error) {
          console.warn(`⚠️ [API] ${endpoint} 백엔드 에러: ${response.data.message}`);
          continue;
        }
        
        if (!response.data.data) {
          console.warn(`⚠️ [API] ${endpoint} 데이터 없음`);
          continue;
        }
        
        console.log(`✅ [API] 사용자 정보 조회 성공: ${endpoint}`, response.data.data);
        return response.data.data;
        
      } catch (error: any) {
        console.warn(`❌ [API] ${endpoint} 실패:`, {
          status: error.response?.status,
          message: error.message
        });
        continue;
      }
    }

    throw new Error('모든 사용자 정보 API 엔드포인트 실패');
  },

  // 🔥 백엔드 헬스체크
  healthCheck: async (): Promise<{ healthy: boolean; message: string }> => {
    try {
      console.log('🔍 [HEALTH] 백엔드 헬스체크 시작');
      
      // 간단한 GET 요청으로 백엔드 상태 확인
      const response = await api.get('/health', { timeout: 5000 });
      console.log('✅ [HEALTH] 백엔드 정상:', response.data);
      return { healthy: true, message: '백엔드 서버 정상' };
      
    } catch (error: any) {
      console.warn('⚠️ [HEALTH] 헬스체크 실패:', error.response?.status || error.message);
      
      // 헬스체크 실패해도 일단 시도해볼 수 있도록
      return { 
        healthy: false, 
        message: `백엔드 연결 불안정 (${error.response?.status || 'timeout'})` 
      };
    }
  }
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
  const [healthStatus, setHealthStatus] = useState<{ healthy: boolean; message: string } | null>(null)
  
  // URL 파라미터에서 사진 ID 가져오기 (메모이제이션으로 무한 루프 방지)
  const photoId = useMemo(() => searchParams.get('photoId'), [searchParams])

  // ============================================================================
  // 🔥 백엔드 API 호출 - 사진 정보 로드 및 초기화 (강화된 에러 처리)
  // ============================================================================

  const initializeEditor = useCallback(async () => {
    console.log('🔍 [INIT] 편집기 초기화 시작');
    
    if (!isAuthenticated || !user) {
      console.log('🔍 [INIT] 인증되지 않은 사용자, 로그인 페이지로 이동');
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // photoId 유효성 검사
      if (!photoId || isNaN(Number(photoId))) {
        console.error('❌ [INIT] 잘못된 photoId:', photoId);
        setError('잘못된 사진 ID입니다.');
        setTimeout(() => router.push('/myroom'), 2000);
        return;
      }

      console.log('🔍 [INIT] 유효한 photoId:', photoId);

      // 1단계: 사용자 정보 설정 (Zustand에서 바로 사용)
      const userInfo: BackendUserInfo = {
        userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
        accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
        userName: user.name || user.email || 'User',
        userEmail: user.email || 'user@example.com',
        profileImage: (user as any)?.profileImage,
      };
      
      setCurrentUser(userInfo);
      console.log('✅ [INIT] 사용자 정보 설정:', userInfo);

      // 2단계: 사진 정보 로드 (가장 중요한 부분)
      console.log('🔍 [INIT] 사진 정보 로드 시작');
      const photo = await feedEditAPI.getPhotoForFeedUpload(Number(photoId));
      
      console.log('✅ [INIT] 사진 정보 로드 성공:', photo);
      
      // 이미 피드에 올린 사진인지 확인
      if (photo.alreadyInFeed) {
        console.warn('⚠️ [INIT] 이미 피드에 올린 사진');
        setError('이미 피드에 올린 사진입니다.');
        // toast 대신 alert 사용 (의존성 제거)
        alert('이미 피드에 올린 사진입니다.');
        setTimeout(() => router.push('/myroom'), 3000);
        return;
      }

      setPhotoInfo(photo);
      // toast 대신 로그만 사용
      console.log('✅ [INIT] 편집기 초기화 완료');

    } catch (error: any) {
      console.error('❌ [INIT] 편집기 초기화 실패:', error);
      
      let errorMessage = '사진 정보를 불러올 수 없습니다.';
      
      if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        try {
          await useAuthStore.getState().logout();
        } catch (logoutError) {
          useAuthStore.getState().clearTokens();
        }
        router.push('/login');
        return;
      } else if (error.response?.status === 404) {
        errorMessage = '존재하지 않는 사진입니다.';
      } else if (error.response?.status === 403) {
        errorMessage = '해당 사진에 접근할 권한이 없습니다.';
      } else if (error.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 백엔드 서버를 확인해주세요.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = '네트워크 연결을 확인해주세요. 백엔드 서버가 실행 중인지 확인하세요.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // 500 에러나 네트워크 에러인 경우 더 오래 기다린 후 리다이렉트
      const redirectDelay = (error.response?.status >= 500 || error.code === 'NETWORK_ERROR') ? 8000 : 3000;
      setTimeout(() => router.push('/myroom'), redirectDelay);
      
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, photoId, router]);

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
      alert('필요한 정보가 없습니다.');
      return;
    }

    if (caption.trim().length === 0) {
      alert('캡션을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('🔍 [SAVE] 게시물 생성 시작', {
        photoId: Number(photoId),
        captionLength: caption.trim().length
      });

      const newPostId = await feedEditAPI.createPostFromMyRoom(
        Number(photoId), 
        caption.trim()
      );

      alert('게시물이 성공적으로 생성되었습니다!');

      console.log('✅ [SAVE] 게시물 생성 완료:', { newPostId });

      // 성공 시 마이페이지로 이동
      router.push('/my');
      
    } catch (error: any) {
      console.error('❌ [SAVE] 게시물 생성 실패:', error);
      
      let errorMessage = '게시물 생성에 실패했습니다.';
      
      if (error.response?.status === 400) {
        errorMessage = '잘못된 요청입니다. 사진 ID나 캡션을 확인해주세요.';
      } else if (error.response?.status === 403) {
        errorMessage = '내 사진만 게시물로 만들 수 있습니다.';
      } else if (error.response?.status === 404) {
        errorMessage = '존재하지 않는 사진입니다.';
      } else if (error.response?.status === 409) {
        errorMessage = '이미 피드에 올린 사진입니다.';
      } else if (error.response?.status >= 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, photoId, photoInfo, caption, router]);

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
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleRetry = useCallback(() => {
    setError(null);
    if (photoId) {
      initializeEditor();
    }
  }, [photoId, initializeEditor]);

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

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ApiLoadingSpinner text="로그인 상태 확인 중..." apiEndpoint="/auth/verify" />
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
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
            apiEndpoint={`/myroom/photos/${photoId}/feed-upload-info`}
          />
          {healthStatus && (
            <p className={`mt-4 text-sm ${healthStatus.healthy ? 'text-green-600' : 'text-yellow-600'}`}>
              {healthStatus.message}
            </p>
          )}
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
          
          {/* 백엔드 상태 표시 */}
          {healthStatus && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              healthStatus.healthy ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              백엔드 상태: {healthStatus.message}
            </div>
          )}
          
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
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🔥 메인 렌더링
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 상단 헤더 */}
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
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
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
      <main className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 사진 미리보기 섹션 */}
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
                      onError={() => {
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
                내 피드에 새 게시물로 추가됩니다
              </p>
            </div>
          </div>

          {/* 게시물 미리보기 섹션 */}
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
                  </div>
                  
                  {/* 실제 백엔드 사진이 있으면 표시 */}
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
        </div>
      </main>

      {/* 개발 모드에서 상세한 디버깅 정보 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white text-xs rounded-lg p-4 z-50 max-w-sm max-h-96 overflow-y-auto">
          <details open>
            <summary className="cursor-pointer font-semibold mb-3 text-yellow-300">
              🔧 DEBUG: 백엔드 연동 상태
            </summary>
            <div className="space-y-2">
              <div className="border-b border-gray-600 pb-2">
                <div><strong>🔗 API 정보:</strong></div>
                <div className="ml-2 text-xs space-y-1">
                  <div>Photo ID: {photoId}</div>
                  <div>Base URL: {process.env.NEXT_PUBLIC_API_BASE_URL || 'localhost:8080'}</div>
                  <div>Auth: {isAuthenticated ? '✅' : '❌'}</div>
                  <div>User: {useAuthStore.getState().user?.email || 'No user'}</div>
                </div>
              </div>
              
              {healthStatus && (
                <div className="border-b border-gray-600 pb-2">
                  <div><strong>🏥 백엔드 상태:</strong></div>
                  <div className={`ml-2 text-xs ${healthStatus.healthy ? 'text-green-400' : 'text-yellow-400'}`}>
                    {healthStatus.message}
                  </div>
                </div>
              )}
              
              <div className="border-b border-gray-600 pb-2">
                <div><strong>📡 API 엔드포인트:</strong></div>
                <div className="ml-2 text-xs space-y-1">
                  <div>GET /myroom/photos/{photoId}/feed-upload-info</div>
                  <div>POST /feeds/posts/from-myroom</div>
                  <div>GET /users/me (fallbacks 포함)</div>
                </div>
              </div>
              
              <div className="border-b border-gray-600 pb-2">
                <div><strong>📊 현재 상태:</strong></div>
                <div className="ml-2 text-xs space-y-1">
                  <div>Loading: {isLoading ? '⏳' : '✅'}</div>
                  <div>Saving: {isSaving ? '⏳' : '✅'}</div>
                  <div>Error: {error ? `❌ ${error.substring(0, 30)}...` : '✅'}</div>
                  <div>Photo Info: {photoInfo ? '✅' : '❌'}</div>
                  <div>User Info: {currentUser ? '✅' : '❌'}</div>
                </div>
              </div>

              {photoInfo && (
                <div className="border-b border-gray-600 pb-2">
                  <div><strong>📷 Photo Data:</strong></div>
                  <div className="ml-2 text-xs space-y-1">
                    <div>ID: {photoInfo.photoId}</div>
                    <div>Already in Feed: {photoInfo.alreadyInFeed ? '❌ Yes' : '✅ No'}</div>
                    <div>URL: {photoInfo.imgUrl.substring(0, 40)}...</div>
                    <div>Taken: {new Date(photoInfo.takenAt).toLocaleDateString()}</div>
                  </div>
                </div>
              )}

              {currentUser && (
                <div className="border-b border-gray-600 pb-2">
                  <div><strong>👤 User Data:</strong></div>
                  <div className="ml-2 text-xs space-y-1">
                    <div>ID: {currentUser.userId}</div>
                    <div>Account: {currentUser.accountName || 'N/A'}</div>
                    <div>Email: {currentUser.userEmail}</div>
                    <div>Source: {currentUser.accountName ? 'Backend' : 'Zustand'}</div>
                  </div>
                </div>
              )}

              <div>
                <div><strong>🛠️ Actions:</strong></div>
                <div className="ml-2 mt-2 space-y-1">
                  <button 
                    onClick={handleRetry}
                    className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                  >
                    재시도
                  </button>
                  <button 
                    onClick={() => {
                      console.log('🔍 [DEBUG] Auth Store State:', useAuthStore.getState());
                      console.log('🔍 [DEBUG] Photo Info:', photoInfo);
                      console.log('🔍 [DEBUG] Current User:', currentUser);
                      console.log('🔍 [DEBUG] Health Status:', healthStatus);
                    }}
                    className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs ml-2"
                  >
                    콘솔 로그
                  </button>
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
              백엔드 API와 연동하여 사진 정보를 확인하고 있습니다...
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
// 📁 ExitConfirmModal.tsx - 로그인 필수 + 백엔드 완전 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ExclamationTriangleIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// 🔥 백엔드 연동 - api from '@/lib/api' 사용 (인터셉터 + Zustand 토큰 + 자동 갱신)
import { api } from '@/lib/api'

// 🔥 Zustand 토큰 스토어 (로그인 상태 관리)
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 CreatePostFromMyRoomRequest.java 기반 (백엔드와 100% 일치)
interface CreatePostFromMyRoomRequest {
  photoId: number;
  caption: string;
}

// 🔥 UpdatePostRequest.java 기반 (백엔드와 100% 일치)
interface UpdatePostRequest {
  caption: string;
}

// 임시 저장용 Draft 타입 (메모리 기반)
interface DraftData {
  photoId: number;
  caption: string;
  lastModified: string;
  userId: string;
  postId?: number; // 편집 모드일 때 사용
}

interface ExitConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  
  // 🔥 백엔드 연동을 위한 추가 props
  photoId?: number;
  postId?: number;          // 🔥 편집 모드용 postId
  currentCaption?: string;
  hasUnsavedChanges?: boolean;
  
  // 커스터마이징 옵션
  title?: string;
  message?: string;
  showAdvancedOptions?: boolean;
  
  // 콜백들
  onSaveAndExit?: () => Promise<void>;
  onDraftSave?: () => Promise<void>;
}

// ============================================================================
// 백엔드 API 함수들 (로그인 필수 + 실제 Java Controller 엔드포인트)
// ============================================================================

const exitConfirmAPI = {
  // 🔥 POST /feeds/posts/from-myroom - 마이룸 사진으로 피드에 게시물 추가 (로그인 필수)
  createPostFromMyRoom: async (request: CreatePostFromMyRoomRequest): Promise<number> => {
    console.log('🔥 API 요청 - POST /feeds/posts/from-myroom (로그인 필수):', request);
    
    try {
      // 🔥 api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
      const response = await api.post<ApiResponse<number>>(
        '/feeds/posts/from-myroom',
        request
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 저장에 실패했습니다.');
      }
      
      console.log('🔥 API 응답 - 새 게시물 생성 완료:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 게시물 생성 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '게시물 저장에 실패했습니다.');
    }
  },

  // 🔥 PUT /feeds/posts/{postId} - 게시물 수정 (캡션) (로그인 필수)
  updatePost: async (postId: number, request: UpdatePostRequest): Promise<void> => {
    console.log('🔥 API 요청 - PUT /feeds/posts/' + postId + ' (로그인 필수):', request);
    
    try {
      // 🔥 api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
      const response = await api.put<ApiResponse<void>>(
        `/feeds/posts/${postId}`,
        request
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 수정에 실패했습니다.');
      }
      
      console.log('🔥 API 응답 - 게시물 수정 완료');
      
    } catch (error: any) {
      console.error('🚨 게시물 수정 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '게시물 수정에 실패했습니다.');
    }
  },

  // 🔥 임시 저장 관리 (메모리 기반 - Claude.ai 브라우저 스토리지 제한)
  saveDraftToMemory: (draftData: DraftData): void => {
    try {
      const drafts = (window as any).__FEED_DRAFTS__ || {};
      const key = draftData.postId 
        ? `edit_${draftData.userId}_${draftData.postId}`
        : `create_${draftData.userId}_${draftData.photoId}`;
      
      drafts[key] = draftData;
      (window as any).__FEED_DRAFTS__ = drafts;
      
      console.log('🔥 Draft saved to memory:', { key, draftData });
    } catch (error) {
      console.error('Draft 저장 실패:', error);
      throw new Error('임시 저장에 실패했습니다.');
    }
  },

  loadDraftFromMemory: (userId: string, photoId?: number, postId?: number): DraftData | null => {
    try {
      const drafts = (window as any).__FEED_DRAFTS__ || {};
      const key = postId 
        ? `edit_${userId}_${postId}`
        : `create_${userId}_${photoId}`;
      
      const draft = drafts[key] || null;
      console.log('🔥 Draft loaded from memory:', { key, draft });
      return draft;
    } catch (error) {
      console.error('Draft 로드 실패:', error);
      return null;
    }
  },

  deleteDraftFromMemory: (userId: string, photoId?: number, postId?: number): void => {
    try {
      const drafts = (window as any).__FEED_DRAFTS__ || {};
      const key = postId 
        ? `edit_${userId}_${postId}`
        : `create_${userId}_${photoId}`;
      
      delete drafts[key];
      (window as any).__FEED_DRAFTS__ = drafts;
      
      console.log('🔥 Draft deleted from memory:', key);
    } catch (error) {
      console.error('Draft 삭제 실패:', error);
    }
  }
};

// ============================================================================
// ExitConfirmModal 컴포넌트 (로그인 필수 + 백엔드 완전 연동)
// ============================================================================

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  photoId,
  postId,
  currentCaption = '',
  hasUnsavedChanges = false,
  title = '편집 중인 내용이 있습니다',
  message = '저장하지 않은 변경사항이 있습니다. 어떻게 하시겠습니까?',
  showAdvancedOptions = false,
  onSaveAndExit,
  onDraftSave
}) => {
  const router = useRouter();

  // 🔥 Zustand 토큰 스토어에서 로그인 상태 확인
  const { 
    accessToken, 
    user,
    isAuthenticated,
    logout 
  } = useAuthStore();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'draft' | 'discard' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ============================================================================
  // 에러 처리 헬퍼
  // ============================================================================
  
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('로그인이 필요')) {
        errorMessage = '로그인이 필요합니다.';
        // 로그인 에러 시 자동 로그아웃 및 리다이렉트
        logout();
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`/login?redirect=${currentPath}`);
        return;
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('network') || err.message.includes('Network Error')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
  }, [logout, router]);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 메시지 표시
  const showMessage = useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setError(null);
    } else {
      setError(message);
      setSuccessMessage(null);
    }
    
    setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 3000);
  }, []);

  // 사용자 ID 추출
  const getUserId = useCallback((): string => {
    if (!user) return 'unknown';
    
    // user.accountName 또는 다른 고유 식별자 사용
    return user.accountName || 'unknown';
  }, [user]);

  // 현재 모드 판단
  const isEditMode = !!postId;
  const isCreateMode = !!photoId && !postId;

  // ============================================================================
  // 로그인 상태 확인
  // ============================================================================
  
  useEffect(() => {
    if (isOpen && (!isAuthenticated || !accessToken)) {
      console.log('🚨 ExitConfirmModal: 로그인이 필요합니다.');
      showMessage('로그인이 필요합니다.', 'error');
    }
  }, [isOpen, isAuthenticated, accessToken]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 저장 후 나가기 (생성/편집 모드 모두 지원) (로그인 필수)
  const handleSaveAndExit = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      showMessage('로그인이 필요합니다.', 'error');
      return;
    }

    if (!currentCaption.trim()) {
      showMessage('캡션을 입력해주세요.', 'error');
      return;
    }

    if (!user) {
      showMessage('사용자 정보를 확인할 수 없습니다.', 'error');
      return;
    }

    setIsLoading(true);
    setActionType('save');
    setError(null);

    try {
      console.log('🔥 저장 시작:', {
        mode: isEditMode ? '편집' : '생성',
        user: user.accountName,
        photoId,
        postId,
        captionLength: currentCaption.length
      });

      if (onSaveAndExit) {
        // 부모 컴포넌트에서 저장 처리
        await onSaveAndExit();
      } else {
        if (isCreateMode && photoId) {
          // 🔥 생성 모드: POST /feeds/posts/from-myroom (로그인 필수)
          const request: CreatePostFromMyRoomRequest = {
            photoId,
            caption: currentCaption.trim()
          };

          const newPostId = await exitConfirmAPI.createPostFromMyRoom(request);
          console.log('🔥 새 게시물 생성 완료 - PostID:', newPostId);

          // 임시 저장 데이터 삭제
          exitConfirmAPI.deleteDraftFromMemory(getUserId(), photoId);

        } else if (isEditMode && postId) {
          // 🔥 편집 모드: PUT /feeds/posts/{postId} (로그인 필수)
          const request: UpdatePostRequest = {
            caption: currentCaption.trim()
          };

          await exitConfirmAPI.updatePost(postId, request);
          console.log('🔥 게시물 수정 완료 - PostID:', postId);

          // 임시 저장 데이터 삭제
          exitConfirmAPI.deleteDraftFromMemory(getUserId(), undefined, postId);
        }
      }

      showMessage(
        isEditMode ? '게시물이 성공적으로 수정되었습니다!' : '게시물이 성공적으로 저장되었습니다!', 
        'success'
      );
      
      setTimeout(() => {
        onConfirm();
      }, 1500);

    } catch (err) {
      console.error('🔥 저장 실패:', err);
      handleError(err, '게시물 저장');
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, [
    isAuthenticated, accessToken, currentCaption, user, onSaveAndExit, 
    isCreateMode, isEditMode, photoId, postId, 
    onConfirm, getUserId, handleError
  ]);

  // 🔥 임시 저장 (로그인 필수)
  const handleDraftSave = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      showMessage('로그인이 필요합니다.', 'error');
      return;
    }

    if (!currentCaption.trim()) {
      showMessage('저장할 내용이 없습니다.', 'error');
      return;
    }

    if (!user) {
      showMessage('사용자 정보를 확인할 수 없습니다.', 'error');
      return;
    }

    setIsLoading(true);
    setActionType('draft');
    setError(null);

    try {
      console.log('🔥 임시 저장 시작:', {
        user: user.accountName,
        photoId,
        postId,
        captionLength: currentCaption.length
      });

      if (onDraftSave) {
        // 부모 컴포넌트에서 임시 저장 처리
        await onDraftSave();
      } else {
        const draftData: DraftData = {
          photoId: photoId || 0,
          caption: currentCaption.trim(),
          lastModified: new Date().toISOString(),
          userId: getUserId(),
          postId: isEditMode ? postId : undefined
        };

        exitConfirmAPI.saveDraftToMemory(draftData);
      }

      showMessage('임시 저장되었습니다!', 'success');
      
      setTimeout(() => {
        onConfirm();
      }, 1500);

    } catch (err) {
      console.error('🔥 임시 저장 실패:', err);
      handleError(err, '임시 저장');
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, [isAuthenticated, accessToken, currentCaption, user, onDraftSave, isEditMode, photoId, postId, onConfirm, getUserId, handleError]);

  // 🔥 저장하지 않고 나가기
  const handleDiscardAndExit = useCallback(() => {
    setIsLoading(true);
    setActionType('discard');

    // 임시 저장 데이터 삭제
    if ((photoId || postId) && user) {
      exitConfirmAPI.deleteDraftFromMemory(getUserId(), photoId, postId);
    }

    showMessage('변경사항을 저장하지 않고 나갑니다.', 'success');
    
    setTimeout(() => {
      setIsLoading(false);
      setActionType(null);
      onConfirm();
    }, 1000);
  }, [photoId, postId, user, getUserId, onConfirm]);

  // 로그인 페이지로 이동
  const handleLoginRedirect = () => {
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    router.push(`/login?redirect=${currentPath}`);
  };

  // ============================================================================
  // 키보드 이벤트 처리
  // ============================================================================

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return; // 로딩 중엔 키보드 이벤트 무시

      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !showAdvancedOptions) {
        onConfirm();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's' && isAuthenticated) {
        e.preventDefault();
        handleSaveAndExit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onCancel, onConfirm, showAdvancedOptions, isAuthenticated, handleSaveAndExit]);

  // ============================================================================
  // 렌더링
  // ============================================================================

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* 헤더 */}
        <div className="p-6 pb-4">
          <div className="flex items-start space-x-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h3>
              <p 
                id="modal-description"
                className="text-sm text-gray-600 mt-1"
              >
                {message}
              </p>
              {/* 🔥 로그인 상태 표시 */}
              {user && (
                <p className="text-xs text-blue-600 mt-1">
                  {user.accountName}님으로 로그인됨
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* 🔥 로그인 필요 경고 */}
        {!isAuthenticated && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-400 mr-2">🔒</div>
                <div>
                  <h4 className="text-sm font-medium text-red-800">로그인이 필요합니다</h4>
                  <p className="text-sm text-red-700 mt-1">
                    게시물 저장을 위해서는 로그인해주세요.
                  </p>
                </div>
              </div>
              <button
                onClick={handleLoginRedirect}
                className="mt-3 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                로그인하기
              </button>
            </div>
          </div>
        )}

        {/* 변경사항 요약 */}
        {hasUnsavedChanges && showAdvancedOptions && isAuthenticated && (
          <div className="px-6 pb-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">변경된 내용:</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <div className="flex justify-between">
                  <span>모드:</span>
                  <span>{isEditMode ? '편집' : '생성'}</span>
                </div>
                <div className="flex justify-between">
                  <span>사용자:</span>
                  <span>{user?.accountName || '알 수 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span>캡션:</span>
                  <span>{currentCaption.length}자</span>
                </div>
                {photoId && (
                  <div className="flex justify-between">
                    <span>사진 ID:</span>
                    <span>{photoId}</span>
                  </div>
                )}
                {postId && (
                  <div className="flex justify-between">
                    <span>게시물 ID:</span>
                    <span>{postId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 에러/성공 메시지 */}
        {(error || successMessage) && (
          <div className="px-6 pb-4">
            <div className={`p-3 rounded-lg text-sm ${
              error ? 'bg-red-50 text-red-800 border border-red-200' : 
              'bg-green-50 text-green-800 border border-green-200'
            }`}>
              {error || successMessage}
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="px-6 pb-6">
          {showAdvancedOptions && hasUnsavedChanges && (photoId || postId) && currentCaption.trim() && isAuthenticated ? (
            // 🔥 고급 옵션들 (저장 관련) - 로그인된 사용자만
            <div className="space-y-3">
              {/* 저장 후 나가기 */}
              <button
                onClick={handleSaveAndExit}
                disabled={isLoading}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                  actionType === 'save' 
                    ? 'bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
                }`}
              >
                {actionType === 'save' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? '수정 중...' : '저장 중...'}
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {isEditMode ? '수정 후 나가기' : '저장 후 나가기'}
                  </>
                )}
              </button>

              {/* 임시 저장 */}
              <button
                onClick={handleDraftSave}
                disabled={isLoading}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors border ${
                  actionType === 'draft' 
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800' 
                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-800 disabled:bg-gray-100'
                }`}
              >
                {actionType === 'draft' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    임시 저장 중...
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-4 w-4 mr-2" />
                    임시 저장
                  </>
                )}
              </button>

              {/* 저장하지 않고 나가기 */}
              <button
                onClick={handleDiscardAndExit}
                disabled={isLoading}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors border ${
                  actionType === 'discard' 
                    ? 'bg-red-100 border-red-300 text-red-800' 
                    : 'bg-red-50 border-red-200 hover:bg-red-100 text-red-800 disabled:bg-gray-100'
                }`}
              >
                {actionType === 'discard' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    나가는 중...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-2" />
                    저장하지 않고 나가기
                  </>
                )}
              </button>

              {/* 계속 편집하기 */}
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:bg-gray-100"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                계속 편집하기
              </button>
            </div>
          ) : (
            // 🔥 기본 확인/취소 버튼
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100"
                autoFocus
              >
                계속 편집하기
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
              >
                나가기
              </button>
            </div>
          )}
        </div>
        
        {/* 키보드 힌트 */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-gray-400">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">ESC</kbd> 취소
            {showAdvancedOptions && isAuthenticated && (
              <>
                {' · '}
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+S</kbd> 저장
              </>
            )}
            {!showAdvancedOptions && (
              <>
                {' · '}
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> 확인
              </>
            )}
            {!isAuthenticated && (
              <span className="block text-red-500 mt-1">• 로그인 필요</span>
            )}
          </p>
        </div>

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-6 pb-4">
            <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-semibold mb-1">🔥 ExitConfirmModal 개발 정보 (로그인 필수)</div>
              <div className="space-y-1">
                <div>🔐 로그인 상태: {isAuthenticated ? '✅ 로그인됨' : '❌ 로그인 안됨'}</div>
                <div>🎫 액세스 토큰: {accessToken ? '✅ 있음' : '❌ 없음'}</div>
                <div>👤 사용자: {user?.accountName || '없음'}</div>
                <div>📷 Photo ID: {photoId || 'None'}</div>
                <div>📝 Post ID: {postId || 'None'}</div>
                <div>⚙️ 모드: {isEditMode ? '편집' : isCreateMode ? '생성' : '알 수 없음'}</div>
                <div>📝 Caption Length: {currentCaption.length}</div>
                <div>🔄 Has Changes: {hasUnsavedChanges ? 'Yes' : 'No'}</div>
                <div>⚡ Advanced Options: {showAdvancedOptions ? 'Yes' : 'No'}</div>
                <div>🎬 Action: {actionType || 'None'}</div>
                <div>🌐 API 사용: {isCreateMode ? 'POST /feeds/posts/from-myroom' : isEditMode ? 'PUT /feeds/posts/{id}' : 'None'}</div>
                <div>🔧 인터셉터: ✅ 토큰 자동 처리 + 갱신</div>
                <div>🏪 Zustand Store: ✅ 토큰 관리 + 자동 로그아웃</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
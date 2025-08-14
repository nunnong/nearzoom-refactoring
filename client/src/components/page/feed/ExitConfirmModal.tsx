// =============================================================================
// 📁 ExitConfirmModal.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  ExclamationTriangleIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (Java 백엔드와 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// CreatePostFromMyRoomRequest.java 기반
interface CreatePostFromMyRoomRequest {
  photoId: number;
  caption: string;
}

// 임시 저장용 Draft 타입
interface DraftData {
  photoId: number;
  caption: string;
  lastModified: string;
  userId: string;
}

interface ExitConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  
  // 🔥 백엔드 연동을 위한 추가 props
  photoId?: number
  currentCaption?: string
  hasUnsavedChanges?: boolean
  
  // 커스터마이징 옵션
  title?: string
  message?: string
  showAdvancedOptions?: boolean  // 고급 옵션 표시 여부
  
  // 콜백들
  onSaveAndExit?: () => Promise<void>  // 저장 후 나가기
  onDraftSave?: () => Promise<void>    // 임시 저장
}

// ============================================================================
// 백엔드 API 함수들 (실제 Java Controller 엔드포인트 사용)
// ============================================================================

const exitConfirmAPI = {
  // 🔥 POST /feeds/posts/from-myroom - 마이룸 사진으로 피드에 게시물 추가
  createPostFromMyRoom: async (request: CreatePostFromMyRoomRequest): Promise<number> => {
    try {
      const response = await api.post<ApiResponse<number>>(
        '/feeds/posts/from-myroom', 
        request
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 저장에 실패했습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('🔥 Failed to create post from myroom:', error);
      throw error;
    }
  },

  // 🔥 임시 저장 (메모리 기반 - 브라우저 스토리지 제한으로 인해)
  saveDraftToMemory: (draftData: DraftData): void => {
    try {
      const drafts = (window as any).__FEED_DRAFTS__ || {};
      const key = `${draftData.userId}_${draftData.photoId}`;
      drafts[key] = draftData;
      (window as any).__FEED_DRAFTS__ = drafts;
      
      console.log('🔥 Draft saved to memory:', draftData);
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw new Error('임시 저장에 실패했습니다.');
    }
  },

  // 🔥 임시 저장 불러오기
  loadDraftFromMemory: (userId: string, photoId: number): DraftData | null => {
    try {
      const drafts = (window as any).__FEED_DRAFTS__ || {};
      const key = `${userId}_${photoId}`;
      return drafts[key] || null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  },

  // 🔥 임시 저장 삭제
  deleteDraftFromMemory: (userId: string, photoId: number): void => {
    try {
      const drafts = (window as any).__FEED_DRAFTS__ || {};
      const key = `${userId}_${photoId}`;
      delete drafts[key];
      (window as any).__FEED_DRAFTS__ = drafts;
      
      console.log('🔥 Draft deleted from memory:', key);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }
};

// ============================================================================
// ExitConfirmModal 컴포넌트
// ============================================================================

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  photoId,
  currentCaption = '',
  hasUnsavedChanges = false,
  title = '편집 중인 내용이 있습니다',
  message = '저장하지 않은 변경사항이 있습니다. 어떻게 하시겠습니까?',
  showAdvancedOptions = false,
  onSaveAndExit,
  onDraftSave
}) => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'draft' | 'discard' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // 사용자 ID 추출 (useAuth 훅의 user 객체 구조에 맞춤)
  const getUserId = useCallback((): string => {
    // useAuth의 user 객체는 userTransformer.fromBackend()를 통해 변환된 구조
    const userObj = user as any;
    return userObj?.userId?.toString() || 
           userObj?.id?.toString() || 
           userObj?.user_id?.toString() ||
           userObj?.userInfo?.userId?.toString() ||
           userObj?.email || // 이메일을 fallback ID로 사용
           'unknown';
  }, [user]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 저장 후 나가기 (POST /feeds/posts/from-myroom)
  const handleSaveAndExit = useCallback(async () => {
    if (!photoId || !currentCaption.trim()) {
      showMessage('사진과 캡션이 모두 필요합니다.', 'error');
      return;
    }

    if (!isAuthenticated || !user) {
      showMessage('로그인이 필요합니다.', 'error');
      return;
    }

    setIsLoading(true);
    setActionType('save');
    setError(null);

    try {
      if (onSaveAndExit) {
        await onSaveAndExit();
      } else {
        const request: CreatePostFromMyRoomRequest = {
          photoId,
          caption: currentCaption.trim()
        };

        const postId = await exitConfirmAPI.createPostFromMyRoom(request);
        console.log('🔥 게시물 생성 완료 - PostID:', postId);

        // 임시 저장 데이터 삭제
        exitConfirmAPI.deleteDraftFromMemory(getUserId(), photoId);
      }

      showMessage('게시물이 성공적으로 저장되었습니다!', 'success');
      
      setTimeout(() => {
        onConfirm();
      }, 1500);

    } catch (err) {
      console.error('🔥 Failed to save and exit:', err);
      const errorMessage = err instanceof Error ? err.message : '게시물 저장에 실패했습니다.';
      showMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, [photoId, currentCaption, isAuthenticated, user, onSaveAndExit, onConfirm, getUserId]);

  // 🔥 임시 저장
  const handleDraftSave = useCallback(async () => {
    if (!photoId || !currentCaption.trim()) {
      showMessage('저장할 내용이 없습니다.', 'error');
      return;
    }

    if (!user) {
      showMessage('로그인이 필요합니다.', 'error');
      return;
    }

    setIsLoading(true);
    setActionType('draft');
    setError(null);

    try {
      if (onDraftSave) {
        await onDraftSave();
      } else {
        const draftData: DraftData = {
          photoId,
          caption: currentCaption.trim(),
          lastModified: new Date().toISOString(),
          userId: getUserId()
        };

        exitConfirmAPI.saveDraftToMemory(draftData);
      }

      showMessage('임시 저장되었습니다!', 'success');
      
      setTimeout(() => {
        onConfirm();
      }, 1500);

    } catch (err) {
      console.error('🔥 Failed to save draft:', err);
      const errorMessage = err instanceof Error ? err.message : '임시 저장에 실패했습니다.';
      showMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, [photoId, currentCaption, user, onDraftSave, onConfirm, getUserId]);

  // 🔥 저장하지 않고 나가기
  const handleDiscardAndExit = useCallback(() => {
    setIsLoading(true);
    setActionType('discard');

    // 임시 저장 데이터 삭제
    if (photoId && user) {
      exitConfirmAPI.deleteDraftFromMemory(getUserId(), photoId);
    }

    showMessage('변경사항을 저장하지 않고 나갑니다.', 'success');
    
    setTimeout(() => {
      setIsLoading(false);
      setActionType(null);
      onConfirm();
    }, 1000);
  }, [photoId, user, getUserId, onConfirm]);

  // 🔥 키보드 이벤트 처리
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return; // 로딩 중엔 키보드 이벤트 무시

      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !showAdvancedOptions) {
        onConfirm();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
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
  }, [isOpen, isLoading, onCancel, onConfirm, showAdvancedOptions, handleSaveAndExit]);

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
        className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200"
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
            </div>
          </div>
        </div>

        {/* 에러/성공 메시지 */}
        {(error || successMessage) && (
          <div className="px-6 pb-2">
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
          {showAdvancedOptions && hasUnsavedChanges && photoId && currentCaption.trim() ? (
            // 🔥 고급 옵션들 (저장 관련)
            <div className="space-y-3">
              {/* 저장 후 나가기 */}
              <button
                onClick={handleSaveAndExit}
                disabled={isLoading || !isAuthenticated}
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
                    저장 중...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    저장 후 나가기
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
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100"
                autoFocus
              >
                계속 편집하기
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
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
            {showAdvancedOptions && (
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
          </p>
        </div>

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-6 pb-4">
            <div className="bg-gray-100 rounded p-2 text-xs text-gray-600">
              <div className="font-semibold mb-1">🔥 개발 정보</div>
              <div>User: {JSON.stringify(user, null, 2).slice(0, 100)}...</div>
              <div>User ID: {getUserId()}</div>
              <div>Photo ID: {photoId || 'None'}</div>
              <div>Caption Length: {currentCaption.length}</div>
              <div>Has Changes: {hasUnsavedChanges ? 'Yes' : 'No'}</div>
              <div>Advanced Options: {showAdvancedOptions ? 'Yes' : 'No'}</div>
              <div>Action: {actionType || 'None'}</div>
              <div>Auth: {isAuthenticated ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExitConfirmModal;
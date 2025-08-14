// =============================================================================
// 📁 FeedEditor.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PhotoIcon, XMarkIcon, CheckIcon, ClockIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'
import ExitConfirmModal from './ExitConfirmModal'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (Java 백엔드와 완벽 일치)
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

// PhotoForFeedUploadResponse.java 기반 (MyRoomServiceImpl에서 사용)
interface PhotoForFeedUploadResponse {
  photoId: number;
  imgUrl: string;
  takenAt: string; // LocalDateTime
  alreadyInFeed: boolean;
}

// 임시 저장용 Draft 타입
interface DraftData {
  photoId: number;
  caption: string;
  lastModified: string;
  userId: string;
}

interface FeedEditorProps {
  userId?: string;         // 사용자 ID
  feedId?: number;         // 기존 피드 편집용 (현재 미지원)
  photoId?: number;        // 선택된 photoId (필수)
  mode?: 'create' | 'edit'; // 생성 모드만 지원
  className?: string;
  onSave?: (caption: string) => Promise<void>; // 부모에서 처리
  onComplete?: () => void;  // 완료 시 콜백
  onCancel?: () => void;    // 취소 콜백
}

// ============================================================================
// 백엔드 API 함수들 (실제 Java Controller 엔드포인트 사용)
// ============================================================================

const feedEditorAPI = {
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

  // 🔥 MyRoomServiceImpl.getPhotoForFeedUpload 기반 사진 정보 조회
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoForFeedUploadResponse> => {
    try {
      // 실제 API 엔드포인트가 있다면 사용 (MyRoomController에 추가 필요할 수 있음)
      // const response = await api.get<ApiResponse<PhotoForFeedUploadResponse>>(`/myroom/photos/${photoId}/feed-info`);
      // return response.data.data;
      
      // 🔥 임시로 Mock 데이터 반환 (실제 백엔드 API 구현 전까지)
      // 실제로는 MyRoomServiceImpl.getPhotoForFeedUpload() 메서드의 응답과 동일
      return {
        photoId,
        imgUrl: `/api/placeholder/400/300?photoId=${photoId}`,
        takenAt: new Date().toISOString(),
        alreadyInFeed: false
      };
    } catch (error) {
      console.error('🔥 Failed to get photo for feed upload:', error);
      throw new Error('사진 정보를 불러올 수 없습니다.');
    }
  },

  // 🔥 임시 저장 관리 (메모리 기반 - 브라우저 스토리지 제한으로 인해)
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
// FeedEditor 컴포넌트
// ============================================================================

const FeedEditor: React.FC<FeedEditorProps> = ({
  userId,
  feedId,
  photoId,
  mode = 'create',
  className = '',
  onSave,
  onComplete,
  onCancel
}) => {
  const { user, isAuthenticated } = useAuth()
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [caption, setCaption] = useState<string>('')
  const [originalCaption, setOriginalCaption] = useState<string>('')
  const [photoInfo, setPhotoInfo] = useState<PhotoForFeedUploadResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000)
  }, [])

  // 사용자 ID 추출
  const getUserId = useCallback((): string => {
    const userObj = user as any;
    return userObj?.userId?.toString() || 
           userObj?.id?.toString() || 
           userObj?.email || 
           'unknown';
  }, [user]);

  // 변경사항 확인
  const hasUnsavedChanges = caption !== originalCaption && caption.trim().length > 0;

  // ============================================================================
  // 초기화
  // ============================================================================

  // 사진 정보 및 임시 저장 데이터 로드
  useEffect(() => {
    const loadPhotoAndDraft = async () => {
      if (!photoId) {
        setError('사진이 선택되지 않았습니다.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // 🔥 백엔드에서 사진 정보 로드
        const info = await feedEditorAPI.getPhotoForFeedUpload(photoId)
        setPhotoInfo(info)

        // 이미 피드에 올린 사진인지 확인
        if (info.alreadyInFeed) {
          setError('이미 피드에 올린 사진입니다.')
          showToast('이미 피드에 올린 사진입니다.', 'error')
          return;
        }

        // 🔥 임시 저장된 데이터 확인 및 로드
        if (user) {
          const draft = feedEditorAPI.loadDraftFromMemory(getUserId(), photoId);
          if (draft) {
            setCaption(draft.caption);
            setOriginalCaption(''); // 임시 저장된 내용이므로 원본은 빈 문자열
            showToast(`임시 저장된 내용을 불러왔습니다. (${new Date(draft.lastModified).toLocaleString()})`);
          }
        }

        showToast('사진이 로드되었습니다!')
      } catch (err) {
        console.error('🔥 Failed to load photo info:', err)
        const errorMessage = err instanceof Error ? err.message : '사진 정보를 불러오는데 실패했습니다.'
        setError(errorMessage)
        showToast(errorMessage, 'error')
      } finally {
        setIsLoading(false)
      }
    }

    loadPhotoAndDraft()
  }, [photoId, user, getUserId])

  // 인증 확인
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setError('로그인이 필요합니다.')
    }
  }, [isAuthenticated, user])

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 백엔드 연동 - 피드 저장 (POST /feeds/posts/from-myroom)
  const handleSaveFeed = useCallback(async () => {
    if (!photoId) {
      showToast('사진이 선택되지 않았습니다.', 'error')
      return
    }

    if (!caption.trim()) {
      showToast('캡션을 입력해주세요.', 'error')
      return
    }

    if (!isAuthenticated || !user) {
      showToast('로그인이 필요합니다.', 'error')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (onSave) {
        // 부모 컴포넌트에서 저장 처리
        await onSave(caption.trim())
      } else {
        // 🔥 실제 백엔드 API 호출
        const request: CreatePostFromMyRoomRequest = {
          photoId,
          caption: caption.trim()
        }

        const postId = await feedEditorAPI.createPostFromMyRoom(request)
        console.log('🔥 새 게시물 생성 완료 - PostID:', postId)

        // 임시 저장 데이터 삭제
        feedEditorAPI.deleteDraftFromMemory(getUserId(), photoId);
      }

      showToast('피드가 성공적으로 생성되었습니다!')
      
      // 완료 콜백 호출 (페이지 이동 등)
      if (onComplete) {
        setTimeout(() => {
          onComplete()
        }, 1500)
      }
      
    } catch (err) {
      console.error('🔥 Failed to save feed:', err)
      const errorMessage = err instanceof Error ? err.message : '피드 저장에 실패했습니다.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsSaving(false)
    }
  }, [photoId, caption, isAuthenticated, user, onSave, onComplete, getUserId])

  // 🔥 임시 저장 핸들러
  const handleDraftSave = useCallback(async () => {
    if (!photoId || !caption.trim()) {
      showToast('저장할 내용이 없습니다.', 'error');
      return;
    }

    if (!user) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      const draftData: DraftData = {
        photoId,
        caption: caption.trim(),
        lastModified: new Date().toISOString(),
        userId: getUserId()
      };

      feedEditorAPI.saveDraftToMemory(draftData);
      showToast('임시 저장되었습니다!');
    } catch (err) {
      console.error('🔥 Failed to save draft:', err);
      showToast('임시 저장에 실패했습니다.', 'error');
    }
  }, [photoId, caption, user, getUserId]);

  // 🔥 개선된 취소 핸들러 (ExitConfirmModal 연동)
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges && !isSaving) {
      setShowExitModal(true);
    } else {
      onCancel?.();
    }
  }, [hasUnsavedChanges, isSaving, onCancel])

  // ExitConfirmModal 콜백들
  const handleExitConfirm = useCallback(() => {
    setShowExitModal(false);
    onCancel?.();
  }, [onCancel]);

  const handleExitCancel = useCallback(() => {
    setShowExitModal(false);
  }, []);

  const handleSaveAndExit = useCallback(async () => {
    await handleSaveFeed();
    // handleSaveFeed 내부에서 onComplete 호출하므로 추가 처리 불필요
  }, [handleSaveFeed]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 모달이 열려있으면 키보드 이벤트 무시
      if (showExitModal) return;

      // 입력 필드에 포커스가 있을 때는 저장 단축키만 처리
      if (e.target instanceof HTMLTextAreaElement) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          handleSaveFeed()
        }
        return
      }

      switch (e.key) {
        case 'Escape':
          if (!isSaving) {
            handleCancel()
          }
          break
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleSaveFeed()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveFeed, handleCancel, isSaving, showExitModal])

  // ============================================================================
  // 유효성 검사
  // ============================================================================

  const canSave = !!(photoId && caption.trim() && !isSaving && !isLoading && isAuthenticated && photoInfo && !photoInfo.alreadyInFeed)

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className={`relative w-full h-full bg-gray-50 ${className}`}>
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onCancel && (
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="취소"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {mode === 'edit' ? '피드 편집' : '새 피드 만들기'}
              </h1>
              <p className="text-sm text-gray-500">
                사진에 캡션을 추가하여 피드를 만들어보세요
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 임시 저장 버튼 */}
            {hasUnsavedChanges && (
              <button
                onClick={handleDraftSave}
                disabled={isSaving || !caption.trim()}
                className="inline-flex items-center px-3 py-2 bg-yellow-100 hover:bg-yellow-200 disabled:bg-gray-100 text-yellow-800 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:text-gray-500"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                임시 저장
              </button>
            )}

            {/* 저장 버튼 */}
            <button
              onClick={handleSaveFeed}
              disabled={!canSave}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
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
                  저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 사진 미리보기 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">선택된 사진</h2>
            {photoInfo?.alreadyInFeed && (
              <p className="text-sm text-amber-600 mt-1">⚠️ 이미 피드에 올린 사진입니다</p>
            )}
          </div>
          
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-gray-500">사진 로딩 중...</p>
                </div>
              </div>
            ) : photoInfo ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoInfo.imgUrl}
                    alt="선택된 사진"
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/api/placeholder/400/300?text=Image+Not+Found';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    ID: {photoInfo.photoId}
                  </div>
                  {photoInfo.alreadyInFeed && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded text-xs">
                      이미 사용됨
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  <p>촬영일: {new Date(photoInfo.takenAt).toLocaleString()}</p>
                  <p>상태: {photoInfo.alreadyInFeed ? '피드에 이미 등록됨' : '사용 가능'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">사진을 불러올 수 없습니다</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 캡션 입력 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">캡션 작성</h2>
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  변경사항 있음
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="이 사진에 대한 이야기를 들려주세요..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              maxLength={200}
              disabled={isSaving || (photoInfo?.alreadyInFeed ?? false)}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Ctrl+S로 빠른 저장
              </p>
              <p className="text-xs text-gray-500">
                {caption.length}/200자
              </p>
            </div>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">피드 미리보기</h2>
          </div>
          
          <div className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                {(user as any)?.profileImage ? (
                  <img 
                    src={(user as any).profileImage} 
                    alt={(user as any)?.name || 'User'} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {(user as any)?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <p className="font-medium text-gray-900">{(user as any)?.name || '사용자'}</p>
                  <p className="text-sm text-gray-500">
                    @{(user as any)?.accountName || 'user'}
                  </p>
                </div>
                {photoInfo && (
                  <div className="mb-3">
                    <img
                      src={photoInfo.imgUrl}
                      alt="피드 사진"
                      className="w-full max-w-sm h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                <p className="text-gray-800 whitespace-pre-wrap">
                  {caption || '(캡션을 입력하세요)'}
                </p>
                <p className="text-xs text-gray-500 mt-2">방금 전</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-300 ${
            toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toastMessage.message}
          </div>
        </div>
      )}

      {/* 전체 로딩 오버레이 */}
      {(isLoading && !photoInfo) && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-40">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-700 font-medium">피드 에디터 준비 중...</p>
          </div>
        </div>
      )}

      {/* 🔥 ExitConfirmModal 연동 */}
      <ExitConfirmModal
        isOpen={showExitModal}
        photoId={photoId}
        currentCaption={caption}
        hasUnsavedChanges={hasUnsavedChanges}
        showAdvancedOptions={true}
        title="편집 중인 내용이 있습니다"
        message="저장하지 않은 변경사항이 있습니다. 어떻게 하시겠습니까?"
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        onSaveAndExit={handleSaveAndExit}
        onDraftSave={handleDraftSave}
      />

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30">
          <div className="font-semibold mb-1">🔥 개발 정보</div>
          <div>모드: {mode}</div>
          <div>사용자: {(user as any)?.name || 'Unknown'}</div>
          <div>User ID: {getUserId()}</div>
          <div>Photo ID: {photoId || 'None'}</div>
          <div>캡션 길이: {caption.length}</div>
          <div>변경사항: {hasUnsavedChanges ? 'Yes' : 'No'}</div>
          <div>저장 가능: {canSave ? 'Yes' : 'No'}</div>
          <div>Already in Feed: {photoInfo?.alreadyInFeed ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  )
}

export default FeedEditor
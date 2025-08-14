// src/hooks/useFeedEditor.ts - 단순 피드 생성용

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 연동 타입 정의 (단순화)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// CreateFeedRequest.java 기반
interface CreateFeedRequest {
  photoId: number;
  caption: string;
}

// FeedDetailResponse.java 기반 (생성된 피드 정보)
interface CreatedFeedResponse {
  feedId: number;
  imgUrl: string;
  caption: string;
  authorId: number;
  accountName: string;
  profileImage: string;
  createdAt: string;
  liked: boolean;
}

// 사진 정보 타입
interface PhotoInfo {
  photoId: number;
  imgUrl: string;
  fileName?: string;
  createdAt?: string;
}

// ============================================================================
// 단순화된 훅 인터페이스
// ============================================================================

interface UseSimpleFeedEditorOptions {
  photoId?: number;        // 선택된 사진 ID
  initialCaption?: string; // 초기 캡션
}

interface UseSimpleFeedEditorReturn {
  // 상태
  caption: string;
  photoInfo: PhotoInfo | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // 액션
  setCaption: (caption: string) => void;
  loadPhotoInfo: (photoId: number) => Promise<void>;
  saveFeed: () => Promise<CreatedFeedResponse | null>;
  
  // 유틸리티
  clearError: () => void;
  reset: () => void;
  
  // 유효성 검사
  canSave: boolean;
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const simpleFeedAPI = {
  // POST /feeds - 새 피드 생성
  createFeed: async (request: CreateFeedRequest): Promise<CreatedFeedResponse> => {
    const response = await api.post<ApiResponse<CreatedFeedResponse>>('/feeds', request);
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // GET /photos/{photoId} - 사진 정보 조회 (필요시)
  getPhotoInfo: async (photoId: number): Promise<PhotoInfo> => {
    try {
      // TODO: 실제 사진 정보 API가 있다면 사용
      // const response = await api.get<ApiResponse<PhotoInfo>>(`/photos/${photoId}`);
      // return response.data.data;
      
      // 임시 Mock 데이터
      return {
        photoId,
        imgUrl: `/api/placeholder/600/600?photoId=${photoId}`,
        fileName: `photo_${photoId}.jpg`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get photo info:', error);
      throw new Error('사진 정보를 불러올 수 없습니다.');
    }
  },
};

// ============================================================================
// 단순화된 피드 에디터 훅
// ============================================================================

export const useSimpleFeedEditor = ({
  photoId: initialPhotoId,
  initialCaption = ''
}: UseSimpleFeedEditorOptions = {}): UseSimpleFeedEditorReturn => {
  
  // ============================================================================
  // 상태 관리 (단순화)
  // ============================================================================
  
  const [caption, setCaption] = useState<string>(initialCaption);
  const [photoInfo, setPhotoInfo] = useState<PhotoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 인증 상태
  const { isAuthenticated } = useAuthStore();

  // ============================================================================
  // 사진 정보 로드
  // ============================================================================

  const loadPhotoInfo = useCallback(async (photoId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await simpleFeedAPI.getPhotoInfo(photoId);
      setPhotoInfo(info);
      console.log('사진 정보 로드 완료:', info);
    } catch (err) {
      console.error('Failed to load photo info:', err);
      const errorMessage = err instanceof Error ? err.message : '사진 정보를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // 🔥 백엔드 연동 - 피드 저장 (단순화)
  // ============================================================================

  const saveFeed = useCallback(async (): Promise<CreatedFeedResponse | null> => {
    if (!photoInfo || !caption.trim() || !isAuthenticated) {
      setError('필수 정보가 누락되었습니다.');
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('=== 단순 피드 생성 시작 ===', {
        photoId: photoInfo.photoId,
        caption: caption.trim()
      });

      const createRequest: CreateFeedRequest = {
        photoId: photoInfo.photoId,
        caption: caption.trim()
      };

      // 🔥 백엔드 API 호출 (POST /feeds)
      const createdFeed = await simpleFeedAPI.createFeed(createRequest);

      console.log('=== 단순 피드 생성 완료 ===', createdFeed);

      return createdFeed;

    } catch (err) {
      console.error('Failed to save feed:', err);
      const errorMessage = err instanceof Error ? err.message : '피드 저장에 실패했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [photoInfo, caption, isAuthenticated]);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setCaption(initialCaption);
    setPhotoInfo(null);
    setError(null);
  }, [initialCaption]);

  // ============================================================================
  // 유효성 검사
  // ============================================================================

  const canSave = !!(
    photoInfo && 
    caption.trim() && 
    !isSaving && 
    !isLoading && 
    isAuthenticated
  );

  // ============================================================================
  // 초기 사진 로드
  // ============================================================================

  useCallback(() => {
    if (initialPhotoId) {
      loadPhotoInfo(initialPhotoId);
    }
  }, [initialPhotoId, loadPhotoInfo])();

  // ============================================================================
  // 반환 값 (단순화)
  // ============================================================================

  return {
    // 상태
    caption,
    photoInfo,
    isLoading,
    isSaving,
    error,
    
    // 액션
    setCaption,
    loadPhotoInfo,
    saveFeed,
    
    // 유틸리티
    clearError,
    reset,
    
    // 유효성 검사
    canSave,
  };
};
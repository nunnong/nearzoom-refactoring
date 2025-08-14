// src/hooks/useFeedEditor.ts - 백엔드 연동 완료 버전

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 연동 타입 정의 (실제 백엔드 구조와 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// CreatePostFromMyRoomRequest.java 기반
interface CreatePostFromMyRoomRequest {
  photoId: number;
  caption: string;
}

// PostDetailResponse.java 기반 (생성된 게시물 정보)
interface CreatedPostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
  authorFeedId: number;
  isMyPost: boolean;
  isFollowingAuthor: boolean;
}

// 사진 정보 타입 (MyRoom에서 가져온 사진)
interface PhotoInfo {
  photoId: number;
  imgUrl: string;
  fileName?: string;
  createdAt?: string;
}

// ============================================================================
// 훅 인터페이스
// ============================================================================

interface UseFeedEditorOptions {
  photoId?: number;        // 선택된 사진 ID
  initialCaption?: string; // 초기 캡션
}

interface UseFeedEditorReturn {
  // 상태
  caption: string;
  photoInfo: PhotoInfo | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // 액션
  setCaption: (caption: string) => void;
  loadPhotoInfo: (photoId: number) => Promise<void>;
  saveFeed: () => Promise<CreatedPostResponse | null>;
  
  // 유틸리티
  clearError: () => void;
  reset: () => void;
  
  // 유효성 검사
  canSave: boolean;
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const feedEditorAPI = {
  // 🔥 실제 백엔드 엔드포인트: POST /feeds/posts/from-myroom
  createPostFromMyRoom: async (request: CreatePostFromMyRoomRequest): Promise<number> => {
    const response = await api.post<ApiResponse<number>>('/feeds/posts/from-myroom', request);
    
    if (response.data.error) {
      throw new Error(response.data.message || '게시물 생성에 실패했습니다.');
    }
    
    // 백엔드는 생성된 postId를 반환
    return response.data.data;
  },

  // 🔥 생성된 게시물 상세 정보 조회: GET /feeds/posts/{postId}
  getPostDetail: async (postId: number): Promise<CreatedPostResponse> => {
    const response = await api.get<ApiResponse<CreatedPostResponse>>(`/feeds/posts/${postId}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '게시물 정보를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 사진 정보 조회 (MyRoom API 사용 - 실제 구현은 MyRoom 도메인에 있을 것)
  getPhotoInfo: async (photoId: number): Promise<PhotoInfo> => {
    try {
      // TODO: 실제 MyRoom 사진 정보 API 호출
      // const response = await api.get<ApiResponse<PhotoInfo>>(`/myroom/photos/${photoId}`);
      // return response.data.data;
      
      // 임시 Mock 데이터 (실제로는 MyRoom API에서 가져와야 함)
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
// 백엔드 연동된 피드 에디터 훅
// ============================================================================

export const useFeedEditor = ({
  photoId: initialPhotoId,
  initialCaption = ''
}: UseFeedEditorOptions = {}): UseFeedEditorReturn => {
  
  // ============================================================================
  // 상태 관리
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
      const info = await feedEditorAPI.getPhotoInfo(photoId);
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
  // 🔥 백엔드 연동 - 게시물 생성 (실제 API 사용)
  // ============================================================================

  const saveFeed = useCallback(async (): Promise<CreatedPostResponse | null> => {
    if (!photoInfo || !caption.trim() || !isAuthenticated) {
      setError('필수 정보가 누락되었습니다.');
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('=== 게시물 생성 시작 ===', {
        photoId: photoInfo.photoId,
        caption: caption.trim()
      });

      const createRequest: CreatePostFromMyRoomRequest = {
        photoId: photoInfo.photoId,
        caption: caption.trim()
      };

      // 🔥 Step 1: 백엔드 API 호출 (POST /feeds/posts/from-myroom)
      const createdPostId = await feedEditorAPI.createPostFromMyRoom(createRequest);

      console.log('게시물 생성 완료, postId:', createdPostId);

      // 🔥 Step 2: 생성된 게시물 상세 정보 조회 (GET /feeds/posts/{postId})
      const postDetail = await feedEditorAPI.getPostDetail(createdPostId);

      console.log('=== 게시물 생성 및 조회 완료 ===', postDetail);

      return postDetail;

    } catch (err) {
      console.error('Failed to save feed:', err);
      
      // 백엔드 에러 메시지 처리
      let errorMessage = '게시물 저장에 실패했습니다.';
      
      if (err instanceof Error) {
        if (err.message.includes('이미 피드에 올린 사진')) {
          errorMessage = '이미 피드에 올린 사진입니다.';
        } else if (err.message.includes('사진이 존재하지 않습니다')) {
          errorMessage = '선택한 사진을 찾을 수 없습니다.';
        } else if (err.message.includes('로그인이 필요')) {
          errorMessage = '로그인이 필요합니다.';
        } else {
          errorMessage = err.message;
        }
      }
      
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
    caption.trim().length <= 200 &&  // 백엔드 제한사항: 캡션 최대 200자
    !isSaving && 
    !isLoading && 
    isAuthenticated
  );

  // ============================================================================
  // 초기 사진 로드
  // ============================================================================

  useEffect(() => {
    if (initialPhotoId) {
      loadPhotoInfo(initialPhotoId);
    }
  }, [initialPhotoId, loadPhotoInfo]);

  // ============================================================================
  // 반환 값
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

// ============================================================================
// 🔥 추가: 백엔드 에러 처리를 위한 유틸리티 타입
// ============================================================================

export type FeedEditorError = 
  | 'PHOTO_NOT_FOUND'           // 사진이 존재하지 않습니다
  | 'PHOTO_ALREADY_POSTED'      // 이미 피드에 올린 사진입니다
  | 'UNAUTHORIZED'              // 로그인이 필요합니다
  | 'CAPTION_TOO_LONG'          // 캡션이 너무 깁니다 (200자 초과)
  | 'NETWORK_ERROR'             // 네트워크 오류
  | 'UNKNOWN_ERROR';            // 알 수 없는 오류

// 백엔드 에러를 타입별로 분류하는 유틸리티
export const classifyFeedEditorError = (error: Error): FeedEditorError => {
  const message = error.message.toLowerCase();
  
  if (message.includes('사진이 존재하지 않습니다')) return 'PHOTO_NOT_FOUND';
  if (message.includes('이미 피드에 올린 사진')) return 'PHOTO_ALREADY_POSTED';
  if (message.includes('로그인이 필요') || message.includes('unauthorized')) return 'UNAUTHORIZED';
  if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR';
  
  return 'UNKNOWN_ERROR';
};
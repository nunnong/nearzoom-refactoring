// =============================================================================
// 📁 FeedEditor.tsx - 🔥 무조건 로그인한 사람만 접근 가능 + 백엔드 완전 연동
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PhotoIcon, XMarkIcon, CheckIcon, ClockIcon, ArrowLeftIcon, TrashIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

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
  photoId: number;  // Long photoId in Java
  caption: string;
}

// 🔥 UpdatePostRequest.java 기반 (백엔드와 100% 일치)
interface UpdatePostRequest {
  caption: string;
}

// 🔥 PostDetailResponse.java 기반 (백엔드와 100% 일치)
interface PostDetailResponse {
  // 게시물 정보
  postId: number;           // Long postId
  photoId: number;          // Long photoId  
  imgUrl: string;           // String imgUrl
  caption: string | null;   // String caption (nullable)
  createdAt: string;        // LocalDateTime createdAt
  // 좋아요 정보
  likeCount: number;        // long likeCount
  isLikedByMe: boolean;     // boolean isLikedByMe
  // 작성자 정보
  authorId: number;         // Long authorId
  authorAccountName: string; // String authorAccountName
  authorProfileImage: string | null; // String authorProfileImage (nullable)
  authorFeedId: number;     // Long authorFeedId
  // 현재 사용자와의 관계
  isMyPost: boolean;        // boolean isMyPost
  isFollowingAuthor: boolean; // boolean isFollowingAuthor
}

// 🔥 MyRoom에서 사용하는 Photo 타입 (백엔드 기반)
interface PhotoForFeedUploadResponse {
  photoId: number;
  imgUrl: string;
  takenAt: string;
  alreadyInFeed: boolean; // 이미 피드에 사용된 사진인지
}

// 🔥 커서 기반 무한스크롤을 위한 타입
interface CursorPageResponse<T> {
  content: T[];
  hasNext: boolean;
  nextCursor: string | null;
  totalElements: number;
}

// 🔥 피드 목록 조회 응답 타입
interface FeedListResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string | null;
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

// 임시 저장용 Draft 타입 (메모리 기반)
interface DraftData {
  photoId: number;
  caption: string;
  lastModified: string;
  userId: string;
  postId?: number; // 편집 모드일 때 사용
}

interface FeedEditorProps {
  userId?: string;
  postId?: number;          // 🔥 편집 모드용 postId
  photoId?: number;         // 🔥 생성 모드용 photoId
  mode?: 'create' | 'edit'; // 생성/편집 모드
  className?: string;
  onSave?: (caption: string, postId?: number) => Promise<void>;
  onComplete?: (postId?: number) => void;
  onCancel?: () => void;
}

// ============================================================================
// 🔥 ExitConfirmModal 컴포넌트 (내장)
// ============================================================================

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmButtonClass?: string;
}

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmButtonClass = "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${confirmButtonClass}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 백엔드 API 함수들 (로그인 필수 + 실제 Java Controller 엔드포인트)
// ============================================================================

const feedEditorAPI = {
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

  // 🔥 GET /feeds/posts/{postId} - 게시물 상세 조회 (로그인 필수)
  getPostDetail: async (postId: number): Promise<PostDetailResponse> => {
    console.log('🔥 API 요청 - GET /feeds/posts/' + postId + ' (로그인 필수)');
    
    try {
      // 🔥 api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
      const response = await api.get<ApiResponse<PostDetailResponse>>(
        `/feeds/posts/${postId}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 정보를 불러올 수 없습니다.');
      }
      
      console.log('🔥 API 응답 - 게시물 상세 조회 완료:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 게시물 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '게시물 정보를 불러올 수 없습니다.');
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

  // 🔥 DELETE /feeds/posts/{postId} - 게시물 삭제 (로그인 필수)
  deletePost: async (postId: number): Promise<void> => {
    console.log('🔥 API 요청 - DELETE /feeds/posts/' + postId + ' (로그인 필수)');
    
    try {
      // 🔥 api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
      const response = await api.delete<ApiResponse<void>>(
        `/feeds/posts/${postId}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 삭제에 실패했습니다.');
      }
      
      console.log('🔥 API 응답 - 게시물 삭제 완료');
      
    } catch (error: any) {
      console.error('🚨 게시물 삭제 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '게시물 삭제에 실패했습니다.');
    }
  },

  // 🔥 POST/DELETE /feeds/posts/{postId}/like - 좋아요 토글 (로그인 필수)
  toggleLike: async (postId: number, isLike: boolean): Promise<{ likeCount: number; isLiked: boolean }> => {
    console.log(`🔥 API 요청 - ${isLike ? 'POST' : 'DELETE'} /feeds/posts/${postId}/like (로그인 필수)`);
    
    try {
      const response = await api({
        method: isLike ? 'POST' : 'DELETE',
        url: `/feeds/posts/${postId}/like`
      });
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 처리에 실패했습니다.');
      }
      
      console.log('🔥 API 응답 - 좋아요 토글 완료:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 좋아요 처리 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '좋아요 처리에 실패했습니다.');
    }
  },

  // 🔥 GET /feeds/posts - 피드 목록 조회 (커서 기반 무한스크롤) (로그인 필수)
  getFeedPosts: async (cursor?: string, size: number = 20): Promise<CursorPageResponse<FeedListResponse>> => {
    console.log('🔥 API 요청 - GET /feeds/posts (커서 기반 무한스크롤, 로그인 필수):', { cursor, size });
    
    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('size', size.toString());
      
      const response = await api.get<ApiResponse<CursorPageResponse<FeedListResponse>>>(
        `/feeds/posts?${params.toString()}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '피드를 불러올 수 없습니다.');
      }
      
      console.log('🔥 API 응답 - 피드 목록 조회 완료:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 피드 목록 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '피드를 불러올 수 없습니다.');
    }
  },

  // 🔥 MyRoom에서 Photo 정보 조회 (실제 백엔드 API 연동) (로그인 필수)
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoForFeedUploadResponse> => {
    console.log('🔥 MyRoom Photo 조회 (로그인 필수):', photoId);
    
    try {
      // 🔥 실제 MyRoom API 엔드포인트 사용 - 백엔드에 맞는 정확한 엔드포인트
      // 백엔드에서 MyRoom 사진 정보 + 피드 사용 여부를 확인하는 API
      const response = await api.get<ApiResponse<PhotoForFeedUploadResponse>>(
        `/myroom/photos/${photoId}/feed-upload-check`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사진 정보를 불러올 수 없습니다.');
      }
      
      console.log('🔥 MyRoom Photo 조회 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🔥 MyRoom Photo 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      if (error.response?.status === 404) {
        throw new Error('사진을 찾을 수 없습니다.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('본인의 사진만 피드에 올릴 수 있습니다.');
      }
      
      throw new Error(error.response?.data?.message || '사진 정보를 불러올 수 없습니다.');
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
// FeedEditor 컴포넌트 (🔥 무조건 로그인한 사람만 접근 가능)
// ============================================================================

const FeedEditor: React.FC<FeedEditorProps> = ({
  userId,
  postId,
  photoId,
  mode = 'create',
  className = '',
  onSave,
  onComplete,
  onCancel
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
  // 🔥 로그인 확인 - 로그인하지 않으면 아무것도 렌더링하지 않음
  // ============================================================================
  
  // 로그인되지 않은 경우 즉시 리다이렉션하고 아무것도 렌더링하지 않음
  useEffect(() => {
    console.log('🔥 FeedEditor 접근 시도 - 로그인 상태 확인:', { 
      isAuthenticated, 
      accessToken: !!accessToken, 
      user: user?.accountName 
    });

    if (!isAuthenticated || !accessToken || !user) {
      console.log('🚨 로그인되지 않음 - 즉시 로그인 페이지로 리다이렉션');
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, accessToken, user, router]);

  // 🔥 로그인되지 않은 경우 아무것도 렌더링하지 않음 (보안 강화)
  if (!isAuthenticated || !accessToken || !user) {
    return null; // 아무것도 렌더링하지 않음
  }
  
  // ============================================================================
  // 상태 관리 (로그인된 사용자만 도달)
  // ============================================================================
  
  const [caption, setCaption] = useState<string>('')
  const [originalCaption, setOriginalCaption] = useState<string>('')
  const [photoInfo, setPhotoInfo] = useState<PhotoForFeedUploadResponse | null>(null)
  const [postInfo, setPostInfo] = useState<PostDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // 🔥 무한스크롤을 위한 상태
  const [feedPosts, setFeedPosts] = useState<FeedListResponse[]>([])
  const [hasNextPage, setHasNextPage] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // ============================================================================
  // 에러 처리 헬퍼
  // ============================================================================
  
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    if (err instanceof Error) {
      setError(err.message);
      showToast(err.message, 'error');
    } else {
      const message = '알 수 없는 오류가 발생했습니다.';
      setError(message);
      showToast(message, 'error');
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ============================================================================
  // 초기 데이터 로드
  // ============================================================================
  
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 🔥 편집 모드: 기존 게시물 정보 로드
        if (mode === 'edit' && postId) {
          const postDetail = await feedEditorAPI.getPostDetail(postId);
          setPostInfo(postDetail);
          setCaption(postDetail.caption || '');
          setOriginalCaption(postDetail.caption || '');

          // Draft 로드 시도
          if (user?.id) {
            const draft = feedEditorAPI.loadDraftFromMemory(user.id.toString(), undefined, postId);
            if (draft && draft.caption !== postDetail.caption) {
              setCaption(draft.caption);
              showToast('임시 저장된 내용을 불러왔습니다.', 'info');
            }
          }
        }

        // 🔥 생성 모드: MyRoom 사진 정보 로드
        if (mode === 'create' && photoId) {
          const photo = await feedEditorAPI.getPhotoForFeedUpload(photoId);
          
          if (photo.alreadyInFeed) {
            throw new Error('이미 피드에 사용된 사진입니다.');
          }
          
          setPhotoInfo(photo);

          // Draft 로드 시도
          if (user?.id) {
            const draft = feedEditorAPI.loadDraftFromMemory(user.id.toString(), photoId);
            if (draft) {
              setCaption(draft.caption);
              showToast('임시 저장된 내용을 불러왔습니다.', 'info');
            }
          }
        }

        // 🔥 피드 목록 로드 (무한스크롤)
        await loadInitialFeedPosts();

      } catch (err) {
        handleError(err, 'loadInitialData');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [mode, postId, photoId, user?.id, handleError]);

  // ============================================================================
  // 🔥 무한스크롤 관련 함수들
  // ============================================================================
  
  const loadInitialFeedPosts = async () => {
    try {
      const response = await feedEditorAPI.getFeedPosts();
      setFeedPosts(response.content);
      setHasNextPage(response.hasNext);
      setNextCursor(response.nextCursor);
    } catch (err) {
      handleError(err, 'loadInitialFeedPosts');
    }
  };

  const loadMoreFeedPosts = async () => {
    if (!hasNextPage || isLoadingMore || !nextCursor) return;

    try {
      setIsLoadingMore(true);
      const response = await feedEditorAPI.getFeedPosts(nextCursor);
      
      setFeedPosts(prev => [...prev, ...response.content]);
      setHasNextPage(response.hasNext);
      setNextCursor(response.nextCursor);
    } catch (err) {
      handleError(err, 'loadMoreFeedPosts');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 🔥 Intersection Observer 설정
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          loadMoreFeedPosts();
        }
      },
      {
        rootMargin: '100px'
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isLoadingMore]);

  // ============================================================================
  // 임시 저장 (Draft)
  // ============================================================================
  
  const saveDraft = useCallback(() => {
    if (!user?.id || (!photoId && !postId)) return;

    try {
      const draftData: DraftData = {
        photoId: photoId || postInfo?.photoId || 0,
        caption,
        lastModified: new Date().toISOString(),
        userId: user.id.toString(),
        postId: mode === 'edit' ? postId : undefined
      };

      feedEditorAPI.saveDraftToMemory(draftData);
    } catch (err) {
      console.error('Draft 저장 실패:', err);
    }
  }, [caption, user?.id, photoId, postId, postInfo?.photoId, mode]);

  // 캡션 변경 시 자동 임시 저장
  useEffect(() => {
    const timer = setTimeout(() => {
      if (caption !== originalCaption) {
        saveDraft();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [caption, originalCaption, saveDraft]);

  // ============================================================================
  // 좋아요 토글
  // ============================================================================
  
  const handleLikeToggle = async (postId: number, currentIsLiked: boolean) => {
    try {
      const result = await feedEditorAPI.toggleLike(postId, !currentIsLiked);
      
      // 피드 목록에서 해당 포스트 업데이트
      setFeedPosts(prev => prev.map(post => 
        post.postId === postId 
          ? { ...post, likeCount: result.likeCount, isLikedByMe: result.isLiked }
          : post
      ));

      // 현재 편집 중인 포스트라면 postInfo도 업데이트
      if (postInfo && postInfo.postId === postId) {
        setPostInfo(prev => prev ? {
          ...prev,
          likeCount: result.likeCount,
          isLikedByMe: result.isLiked
        } : null);
      }
      
    } catch (err) {
      handleError(err, 'handleLikeToggle');
    }
  };

  // ============================================================================
  // 저장/수정/삭제 처리
  // ============================================================================
  
  const handleSave = async () => {
    if (!user?.id) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let resultPostId: number | undefined;

      if (mode === 'create' && photoId) {
        // 🔥 새 게시물 생성
        const request: CreatePostFromMyRoomRequest = {
          photoId,
          caption: caption.trim()
        };

        resultPostId = await feedEditorAPI.createPostFromMyRoom(request);
        showToast('게시물이 성공적으로 저장되었습니다!', 'success');

        // Draft 삭제
        feedEditorAPI.deleteDraftFromMemory(user.id.toString(), photoId);

      } else if (mode === 'edit' && postId) {
        // 🔥 기존 게시물 수정
        const request: UpdatePostRequest = {
          caption: caption.trim()
        };

        await feedEditorAPI.updatePost(postId, request);
        showToast('게시물이 성공적으로 수정되었습니다!', 'success');

        // Draft 삭제
        feedEditorAPI.deleteDraftFromMemory(user.id.toString(), undefined, postId);
        resultPostId = postId;
      }

      // 외부 콜백 실행
      if (onSave) {
        await onSave(caption.trim(), resultPostId);
      }

      // 완료 콜백 실행
      if (onComplete) {
        onComplete(resultPostId);
      }

      // 피드 목록 새로고침
      await loadInitialFeedPosts();

    } catch (err) {
      handleError(err, 'handleSave');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId || mode !== 'edit') {
      showToast('삭제할 수 없는 게시물입니다.', 'error');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      await feedEditorAPI.deletePost(postId);
      showToast('게시물이 삭제되었습니다.', 'success');

      // Draft 삭제
      if (user?.id) {
        feedEditorAPI.deleteDraftFromMemory(user.id.toString(), undefined, postId);
      }

      // 피드 목록에서 삭제된 포스트 제거
      setFeedPosts(prev => prev.filter(post => post.postId !== postId));

      // 완료 콜백 실행
      if (onComplete) {
        onComplete();
      }

      // 이전 페이지로 이동
      router.back();

    } catch (err) {
      handleError(err, 'handleDelete');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ============================================================================
  // 종료 확인 모달
  // ============================================================================
  
  const hasUnsavedChanges = () => {
    return caption.trim() !== originalCaption.trim();
  };

  const handleExit = () => {
    if (hasUnsavedChanges()) {
      setShowExitModal(true);
    } else {
      // Draft 삭제
      if (user?.id) {
        if (mode === 'create' && photoId) {
          feedEditorAPI.deleteDraftFromMemory(user.id.toString(), photoId);
        } else if (mode === 'edit' && postId) {
          feedEditorAPI.deleteDraftFromMemory(user.id.toString(), undefined, postId);
        }
      }

      if (onCancel) {
        onCancel();
      } else {
        router.back();
      }
    }
  };

  const handleExitConfirm = () => {
    // Draft 삭제
    if (user?.id) {
      if (mode === 'create' && photoId) {
        feedEditorAPI.deleteDraftFromMemory(user.id.toString(), photoId);
      } else if (mode === 'edit' && postId) {
        feedEditorAPI.deleteDraftFromMemory(user.id.toString(), undefined, postId);
      }
    }

    setShowExitModal(false);

    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // ============================================================================
  // 메인 렌더링 (로그인된 사용자만 도달)
  // ============================================================================
  
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* 🔥 Toast 메시지 */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          toastMessage.type === 'success' ? 'bg-green-500 text-white' :
          toastMessage.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span>{toastMessage.message}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-3 text-white hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* 🔥 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExit}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isSaving || isDeleting}
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {mode === 'edit' ? '게시물 편집' : '새 게시물'}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              {/* 삭제 버튼 (편집 모드에서만) */}
              {mode === 'edit' && postInfo?.isMyPost && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving || isDeleting}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}

              {/* 저장 버튼 */}
              <button
                onClick={handleSave}
                disabled={isSaving || isDeleting || !hasUnsavedChanges()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span>{mode === 'edit' ? '수정' : '게시'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 🔥 메인 콘텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">데이터를 불러오고 있습니다...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              새로고침
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 🔥 게시물 편집 영역 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* 이미지 표시 */}
              <div className="aspect-square relative bg-gray-100">
                {(photoInfo?.imgUrl || postInfo?.imgUrl) ? (
                  <img
                    src={photoInfo?.imgUrl || postInfo?.imgUrl}
                    alt="게시물 이미지"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}

                {/* 이미지 오버레이 정보 */}
                {photoInfo?.takenAt && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {new Date(photoInfo.takenAt).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>

              {/* 캡션 입력 */}
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.accountName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {user?.accountName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-sm">{user?.accountName}</span>
                      {hasUnsavedChanges() && (
                        <div className="flex items-center text-xs text-orange-600">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          <span>임시 저장됨</span>
                        </div>
                      )}
                    </div>

                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="사진에 대한 설명을 작성해보세요..."
                      className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      maxLength={500}
                    />

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {caption.length}/500
                      </span>
                      {mode === 'edit' && postInfo && (
                        <div className="text-xs text-gray-500">
                          {new Date(postInfo.createdAt).toLocaleDateString('ko-KR')} 작성
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 🔥 피드 미리보기 (무한스크롤) */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">최근 피드</h2>
              
              {feedPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PhotoIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>아직 게시된 피드가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedPosts.map((post) => (
                    <div key={post.postId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* 작성자 정보 */}
                      <div className="p-4 pb-2">
                        <div className="flex items-center space-x-3">
                          {post.authorProfileImage ? (
                            <img
                              src={post.authorProfileImage}
                              alt={post.authorAccountName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {post.authorAccountName[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm">{post.authorAccountName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 이미지 */}
                      <div className="aspect-square relative">
                        <img
                          src={post.imgUrl}
                          alt="피드 이미지"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 좋아요 및 캡션 */}
                      <div className="p-4">
                        <div className="flex items-center space-x-4 mb-2">
                          <button
                            onClick={() => handleLikeToggle(post.postId, post.isLikedByMe)}
                            className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                          >
                            {post.isLikedByMe ? (
                              <HeartIconSolid className="h-6 w-6 text-red-500" />
                            ) : (
                              <HeartIcon className="h-6 w-6" />
                            )}
                          </button>
                        </div>

                        {post.likeCount > 0 && (
                          <p className="text-sm font-semibold mb-2">
                            좋아요 {post.likeCount.toLocaleString()}개
                          </p>
                        )}

                        {post.caption && (
                          <p className="text-sm">
                            <span className="font-semibold">{post.authorAccountName}</span>{' '}
                            {post.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 🔥 무한스크롤 로딩 트리거 */}
                  {hasNextPage && (
                    <div ref={loadMoreRef} className="py-4">
                      {isLoadingMore ? (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">더 많은 피드를 불러오는 중...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">스크롤하여 더 보기</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasNextPage && feedPosts.length > 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">모든 피드를 확인했습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 🔥 종료 확인 모달 */}
      {showExitModal && (
        <ExitConfirmModal
          isOpen={showExitModal}
          onClose={() => setShowExitModal(false)}
          onConfirm={handleExitConfirm}
          title="편집을 종료하시겠습니까?"
          message="저장하지 않은 변경사항이 있습니다. 정말 종료하시겠습니까?"
          confirmText="종료"
          cancelText="계속 편집"
        />
      )}

      {/* 🔥 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <ExitConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="게시물을 삭제하시겠습니까?"
          message="삭제된 게시물은 복구할 수 없습니다."
          confirmText={isDeleting ? '삭제 중...' : '삭제'}
          cancelText="취소"
          confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
        />
      )}
    </div>
  );
};

export default FeedEditor;
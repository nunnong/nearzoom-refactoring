// ============================================================================
// useFeedEditor.ts - 아키텍처 원칙 100% 준수 완전 수정 버전
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/axios' // 🔧 올바른 API 사용 - default export

// 타입 정의들
interface ApiResponse<T> {
  error: boolean
  message: string | null
  data: T | null
}

interface PhotoInfo {
  photoId: number
  imgUrl: string
  fileName?: string
  takenAt?: string
  alreadyInFeed?: boolean
}

interface BackendPhotoForFeedResponse {
  photoId: number
  imgUrl: string
  takenAt: string
  alreadyInFeed: boolean
}

type FeedEditorMode = 'create' | 'edit'

interface PostDetailResponse {
  postId: number
  caption: string
  imgUrl: string
  isMyPost: boolean
  createdAt: string
}

interface CreatePostFromMyRoomRequest {
  photoId: number
  caption: string
}

interface UseFeedEditorOptions {
  mode?: FeedEditorMode
  photoId?: number
  postId?: number
  initialCaption?: string
  onSuccess?: (result: PostDetailResponse) => void
  onError?: (error: string) => void
}

interface UseFeedEditorReturn {
  mode: FeedEditorMode
  caption: string
  photoInfo: PhotoInfo | null
  postDetail: PostDetailResponse | null
  isLoading: boolean
  isSaving: boolean
  isDeleting: boolean
  error: string | null
  setCaption: (caption: string) => void
  loadPhotoInfo: (photoId: number) => Promise<void>
  loadPostDetail: (postId: number) => Promise<void>
  saveFeed: () => Promise<PostDetailResponse | null>
  deleteFeed: () => Promise<boolean>
  clearError: () => void
  reset: () => void
  canSave: boolean
  canDelete: boolean
  validationErrors: string[]
}

// 🚀 백엔드 API 함수들 - 자동 토큰 갱신 지원
const feedEditorAPI = {
  getPhotoForFeedUpload: async (photoId: number): Promise<PhotoInfo> => {
    const response = await api.get<ApiResponse<BackendPhotoForFeedResponse>>(
      `/myroom/photos/${photoId}/feed-upload-info`
    )
    if (response.data.error || !response.data.data) {
      throw new Error(response.data.message || '사진 정보를 불러올 수 없습니다.')
    }
    const photoData = response.data.data
    return {
      photoId: photoData.photoId,
      imgUrl: photoData.imgUrl,
      takenAt: photoData.takenAt,
      alreadyInFeed: photoData.alreadyInFeed,
    }
  },

  createPost: async (request: CreatePostFromMyRoomRequest): Promise<number> => {
    const response = await api.post<ApiResponse<number>>('/feeds/posts/from-myroom', request)
    if (response.data.error || !response.data.data) {
      throw new Error(response.data.message || '게시물 생성에 실패했습니다.')
    }
    return response.data.data
  },

  getPost: async (postId: number): Promise<PostDetailResponse> => {
    const response = await api.get<ApiResponse<PostDetailResponse>>(`/feeds/posts/${postId}`)
    if (response.data.error || !response.data.data) {
      throw new Error(response.data.message || '게시물을 불러올 수 없습니다.')
    }
    return response.data.data
  },

  updatePost: async (postId: number, caption: string): Promise<void> => {
    const response = await api.put<ApiResponse<void>>(`/feeds/posts/${postId}`, { caption })
    if (response.data.error) {
      throw new Error(response.data.message || '게시물 수정에 실패했습니다.')
    }
  },

  deletePost: async (postId: number): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/feeds/posts/${postId}`)
    if (response.data.error) {
      throw new Error(response.data.message || '게시물 삭제에 실패했습니다.')
    }
  },
}

export const useFeedEditor = ({
  mode = 'create',
  photoId: initialPhotoId,
  postId: initialPostId,
  initialCaption = '',
  onSuccess,
  onError,
}: UseFeedEditorOptions = {}): UseFeedEditorReturn => {
  
  const router = useRouter()
  
  // 🔐 무조건 로그인 필수: Zustand 상태 관리
  const { isAuthenticated, user } = useAuthStore()
  
  // 🔄 컴포넌트 언마운트 체크용
  const isMountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 상태 관리
  const [caption, setCaption] = useState<string>(initialCaption)
  const [photoInfo, setPhotoInfo] = useState<PhotoInfo | null>(null)
  const [postDetail, setPostDetail] = useState<PostDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔐 무조건 로그인 필수 - 미인증시 즉시 리다이렉트
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.warn('🔐 인증되지 않은 사용자 - 로그인 페이지로 리다이렉트')
      router.replace('/auth/login')
      return
    }
  }, [isAuthenticated, user, router])

  // 🔐 인증 체크 헬퍼 - 모든 API 호출 전 필수
  const checkAuth = useCallback((): boolean => {
    if (!isAuthenticated || !user) {
      const errorMessage = '로그인이 필요합니다.'
      setError(errorMessage)
      onError?.(errorMessage)
      router.replace('/auth/login')
      return false
    }
    return true
  }, [isAuthenticated, user, onError, router])

  // 🔄 안전한 상태 업데이트 헬퍼
  const safeSetState = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) {
      updateFn()
    }
  }, [])

  const loadPhotoInfo = useCallback(async (photoId: number) => {
    // 🔐 인증 체크 (모든 API 호출 전 필수)
    if (!checkAuth()) return

    safeSetState(() => {
      setIsLoading(true)
      setError(null)
    })

    try {
      const info = await feedEditorAPI.getPhotoForFeedUpload(photoId)
      
      safeSetState(() => {
        setPhotoInfo(info)
        
        if (info.alreadyInFeed) {
          setError('이미 피드에 올린 사진입니다.')
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '사진 정보 로드 실패'
      safeSetState(() => {
        setError(errorMessage)
      })
      onError?.(errorMessage)
    } finally {
      safeSetState(() => {
        setIsLoading(false)
      })
    }
  }, [checkAuth, onError, safeSetState])

  const loadPostDetail = useCallback(async (postId: number) => {
    // 🔐 인증 체크
    if (!checkAuth()) return

    safeSetState(() => {
      setIsLoading(true)
      setError(null)
    })

    try {
      const detail = await feedEditorAPI.getPost(postId)
      
      safeSetState(() => {
        setPostDetail(detail)
        setCaption(detail.caption || '')
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '게시물 로드 실패'
      safeSetState(() => {
        setError(errorMessage)
      })
      onError?.(errorMessage)
    } finally {
      safeSetState(() => {
        setIsLoading(false)
      })
    }
  }, [checkAuth, onError, safeSetState])

  const saveFeed = useCallback(async (): Promise<PostDetailResponse | null> => {
    // 🔐 인증 체크
    if (!checkAuth()) return null

    safeSetState(() => {
      setIsSaving(true)
      setError(null)
    })

    try {
      let result: PostDetailResponse

      if (mode === 'create') {
        if (!photoInfo || !caption.trim()) {
          throw new Error('필수 정보가 누락되었습니다.')
        }

        if (photoInfo.alreadyInFeed) {
          throw new Error('이미 피드에 올린 사진입니다.')
        }

        const createRequest: CreatePostFromMyRoomRequest = {
          photoId: photoInfo.photoId,
          caption: caption.trim()
        }

        const createdPostId = await feedEditorAPI.createPost(createRequest)
        result = await feedEditorAPI.getPost(createdPostId)
        
        safeSetState(() => {
          setPostDetail(result)
        })
      } else {
        if (!postDetail || !caption.trim()) {
          throw new Error('필수 정보가 누락되었습니다.')
        }

        await feedEditorAPI.updatePost(postDetail.postId, caption.trim())
        result = await feedEditorAPI.getPost(postDetail.postId)
        
        safeSetState(() => {
          setPostDetail(result)
          setCaption(result.caption || '')
        })
      }

      onSuccess?.(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '저장 실패'
      safeSetState(() => {
        setError(errorMessage)
      })
      onError?.(errorMessage)
      return null
    } finally {
      safeSetState(() => {
        setIsSaving(false)
      })
    }
  }, [mode, photoInfo, postDetail, caption, checkAuth, onSuccess, onError, safeSetState])

  const deleteFeed = useCallback(async (): Promise<boolean> => {
    // 🔐 인증 체크
    if (!checkAuth()) return false

    if (!postDetail) {
      const errorMessage = '삭제할 게시물이 없습니다.'
      setError(errorMessage)
      return false
    }

    safeSetState(() => {
      setIsDeleting(true)
      setError(null)
    })

    try {
      await feedEditorAPI.deletePost(postDetail.postId)
      
      safeSetState(() => {
        setPostDetail(null)
        setCaption('')
      })
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '삭제 실패'
      safeSetState(() => {
        setError(errorMessage)
      })
      onError?.(errorMessage)
      return false
    } finally {
      safeSetState(() => {
        setIsDeleting(false)
      })
    }
  }, [postDetail, checkAuth, onError, safeSetState])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setCaption(initialCaption)
    setPhotoInfo(null)
    setPostDetail(null)
    setError(null)
  }, [initialCaption])

  // 🔍 유효성 검사 - 실시간 검증
  const validationErrors: string[] = []

  if (!caption.trim()) {
    validationErrors.push('캡션을 입력해주세요.')
  } else if (caption.trim().length > 200) {
    validationErrors.push('캡션은 200자 이하로 입력해주세요.')
  }

  if (mode === 'create') {
    if (!photoInfo) {
      validationErrors.push('사진을 선택해주세요.')
    } else if (photoInfo.alreadyInFeed) {
      validationErrors.push('이미 피드에 올린 사진입니다.')
    }
  } else {
    if (!postDetail) {
      validationErrors.push('편집할 게시물을 찾을 수 없습니다.')
    }
  }

  if (!isAuthenticated || !user) {
    validationErrors.push('로그인이 필요합니다.')
  }

  // 🚀 액션 가능 상태 계산
  const canSave = !!(
    validationErrors.length === 0 &&
    !isSaving && 
    !isLoading && 
    !isDeleting &&
    isAuthenticated &&
    user
  )

  const canDelete = !!(
    mode === 'edit' &&
    postDetail &&
    postDetail.isMyPost &&
    !isSaving &&
    !isLoading &&
    !isDeleting &&
    isAuthenticated &&
    user
  )

  // 🔄 초기 데이터 로딩 - 인증 상태 확인 후
  useEffect(() => {
    if (!isAuthenticated || !user) return

    if (mode === 'create' && initialPhotoId) {
      loadPhotoInfo(initialPhotoId)
    } else if (mode === 'edit' && initialPostId) {
      loadPostDetail(initialPostId)
    }
  }, [
    mode, 
    initialPhotoId, 
    initialPostId, 
    isAuthenticated, 
    user,
    loadPhotoInfo, 
    loadPostDetail
  ])

  // 🔐 미인증시 안전한 기본값 반환
  if (!isAuthenticated || !user) {
    return {
      mode,
      caption: '',
      photoInfo: null,
      postDetail: null,
      isLoading: false,
      isSaving: false,
      isDeleting: false,
      error: '로그인이 필요합니다.',
      setCaption: () => {},
      loadPhotoInfo: () => Promise.resolve(),
      loadPostDetail: () => Promise.resolve(),
      saveFeed: () => Promise.resolve(null),
      deleteFeed: () => Promise.resolve(false),
      clearError: () => {},
      reset: () => {},
      canSave: false,
      canDelete: false,
      validationErrors: ['로그인이 필요합니다.'],
    }
  }

  return {
    mode,
    caption,
    photoInfo,
    postDetail,
    isLoading,
    isSaving,
    isDeleting,
    error,
    setCaption,
    loadPhotoInfo,
    loadPostDetail,
    saveFeed,
    deleteFeed,
    clearError,
    reset,
    canSave,
    canDelete,
    validationErrors,
  }
}
'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { UserPlusIcon, UserMinusIcon, CheckIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// ✅ 인터셉터가 붙은 axios 인스턴스만 사용
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

// 백엔드 ApiResponse 표준 타입
interface ApiResponse<T> {
  error: boolean
  message: string | null
  data: T
}

// 엔드포인트 베이스 (환경변수는 axios 인스턴스에서 처리하므로 여기선 상대경로 사용 권장)
const ENDPOINTS = {
  follow: (followeeId: number) => `/follows/${followeeId}`,
  unfollow: (followeeId: number) => `/follows/${followeeId}`,
  check: (followeeId: number) => `/follows/check/${followeeId}`,
}

// 🔥 팔로우 API 서비스 (axios 인스턴스 사용)
const followApi = {
  follow: async (followeeId: number): Promise<void> => {
    await api.post<ApiResponse<boolean>>(ENDPOINTS.follow(followeeId))
  },
  unfollow: async (followeeId: number): Promise<void> => {
    await api.delete<ApiResponse<boolean>>(ENDPOINTS.unfollow(followeeId))
  },
  isFollowing: async (followeeId: number): Promise<boolean> => {
    const res = await api.get<ApiResponse<boolean>>(ENDPOINTS.check(followeeId))
    return !!res.data.data
  },
}

interface FollowButtonProps {
  userId: number // 🔥 백엔드 Long 타입과 매칭
  initialIsFollowing?: boolean // 🔥 초기 상태 (선택적)
  isFollowedBy?: boolean
  isPending?: boolean
  onFollowChange?: (isFollowing: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'minimal'
  showMutualIndicator?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  initialIsFollowing = false,
  isFollowedBy = false,
  isPending = false,
  onFollowChange,
  size = 'md',
  variant = 'primary',
  showMutualIndicator = true,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const { isAuthenticated } = useAuthStore()
  const [isHovered, setIsHovered] = useState(false)
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 마운트/변경 시 실제 팔로우 상태 확인 (로그인 시에만)
  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!isAuthenticated || disabled || !userId) return
      try {
        const followStatus = await followApi.isFollowing(userId)
        if (mounted) setIsFollowing(followStatus)
      } catch (e: any) {
        // 인터셉터가 401/토큰 갱신 등을 처리하므로 여기선 로깅 정도만
        console.error('팔로우 상태 확인 실패:', e)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [userId, disabled, isAuthenticated])

  // 클릭 핸들러 (axios + 인터셉터 경유)
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled || isLoading) return
      if (!isAuthenticated) {
        setError('로그인이 필요합니다.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        if (isFollowing) {
          await followApi.unfollow(userId)
          setIsFollowing(false)
          onFollowChange?.(false)
        } else {
          await followApi.follow(userId)
          setIsFollowing(true)
          onFollowChange?.(true)
        }
      } catch (err: any) {
        console.error('팔로우/언팔로우 실패:', err)
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          (isFollowing ? '언팔로우에 실패했습니다.' : '팔로우에 실패했습니다.')
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [userId, isFollowing, disabled, isLoading, isAuthenticated, onFollowChange],
  )

  // 크기 클래스
  const sizeClasses = useMemo(
    () => ({
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }),
    [],
  )

  // 버튼 상태
  const buttonState = useMemo(() => {
    if (isLoading) return 'loading'
    if (isPending) return 'pending'
    if (isFollowing) return isHovered ? 'unfollow' : 'following'
    return 'follow'
  }, [isLoading, isPending, isFollowing, isHovered])

  // 버튼 콘텐츠
  const getButtonContent = useCallback(() => {
    const iconClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

    switch (buttonState) {
      case 'loading':
        return (
          <>
            <svg className={`animate-spin ${iconClass} mr-2`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{isFollowing ? '언팔로우 중...' : '팔로우 중...'}</span>
          </>
        )

      case 'pending':
        return (
          <>
            <svg className={`${iconClass} mr-2 text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>요청됨</span>
          </>
        )

      case 'unfollow':
        return (
          <>
            <UserMinusIcon className={`${iconClass} mr-2`} />
            <span>언팔로우</span>
          </>
        )

      case 'following':
        return (
          <>
            <CheckIcon className={`${iconClass} mr-2`} />
            <span>팔로잉</span>
          </>
        )

      case 'follow':
      default:
        return (
          <>
            <UserPlusIcon className={`${iconClass} mr-2`} />
            <span>팔로우</span>
          </>
        )
    }
  }, [buttonState, isFollowing, size])

  // 버튼 스타일
  const getButtonClasses = useCallback(() => {
    const baseClasses = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 ${sizeClasses[size]}`
    if (variant === 'minimal') {
      return `${baseClasses} bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 border-transparent`
    }
    switch (buttonState) {
      case 'loading':
        return `${baseClasses} bg-gray-400 text-white border-gray-400 cursor-not-allowed`
      case 'pending':
        return `${baseClasses} bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300`
      case 'unfollow':
        return `${baseClasses} bg-red-600 hover:bg-red-700 text-white border-red-600`
      case 'following':
        if (variant === 'primary') {
          return `${baseClasses} bg-gray-200 hover:bg-red-50 text-gray-800 hover:text-red-600 border-gray-200 hover:border-red-200`
        }
        return `${baseClasses} bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 border-gray-300 hover:border-red-300`
      case 'follow':
      default:
        if (variant === 'primary') {
          return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white border-blue-600`
        }
        return `${baseClasses} bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border-blue-600`
    }
  }, [buttonState, variant, sizeClasses, size])

  // 툴팁 텍스트
  const tooltipText = useMemo(() => {
    if (ariaLabel) return ariaLabel
    if (error) return `에러: ${error}`
    switch (buttonState) {
      case 'loading':
        return '처리 중...'
      case 'pending':
        return '팔로우 요청이 대기 중입니다'
      case 'unfollow':
        return '클릭해서 언팔로우'
      case 'following':
        return '팔로잉 중 (클릭해서 언팔로우)'
      case 'follow':
        return '클릭해서 팔로우'
      default:
        return ''
    }
  }, [buttonState, ariaLabel, error])

  // 비로그인 UI
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <button
          disabled
          className={`${sizeClasses[size]} inline-flex items-center justify-center font-medium rounded-lg bg-gray-200 text-gray-500 border-2 border-gray-200 cursor-not-allowed`}
          title="로그인이 필요합니다"
          type="button"
        >
          <UserPlusIcon className={size === 'lg' ? 'h-5 w-5 mr-2' : 'h-4 w-4 mr-2'} />
          <span>로그인 필요</span>
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        className={getButtonClasses()}
        title={tooltipText}
        aria-label={tooltipText}
        type="button"
      >
        {getButtonContent()}
      </button>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-1 text-center">
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}

      {/* 관계 상태 표시 */}
      {showMutualIndicator && !error && (
        <>
          {isFollowing && isFollowedBy && (
            <div className="mt-1 text-center">
              <span className="inline-flex items-center px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">
                <HeartSolidIcon className="w-3 h-3 mr-1" />
                서로 팔로우
              </span>
            </div>
          )}

          {!isFollowing && isFollowedBy && !isPending && (
            <div className="mt-1 text-center">
              <span className="inline-flex items-center text-xs text-gray-500">
                <HeartIcon className="w-3 h-3 mr-1" />
                나를 팔로우함
              </span>
            </div>
          )}

          {isPending && (
            <div className="mt-1 text-center">
              <span className="text-xs text-yellow-600">팔로우 요청 대기 중</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FollowButton

// 🔥 사용 예시
/*
// 기본 사용법
<FollowButton 
  userId={123}
  onFollowChange={(isFollowing) => console.log('Follow changed:', isFollowing)}
/>

// 초기 상태와 함께 사용
<FollowButton 
  userId={123}
  initialIsFollowing={true}
  isFollowedBy={true}
  onFollowChange={(isFollowing) => {
    // 팔로우 상태 변경 시 상위 컴포넌트 상태 업데이트
    setUserFollowStatus(isFollowing)
  }}
/>

// 작은 사이즈 + 미니멀 스타일
<FollowButton 
  userId={123}
  size="sm"
  variant="minimal"
  showMutualIndicator={false}
/>
*/
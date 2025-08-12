'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { UserPlusIcon, UserMinusIcon, CheckIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 🔥 백엔드 API 직접 연동
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

const getAuthToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

const createAuthHeaders = () => {
  const token = getAuthToken()
  if (!token) {
    throw new Error('로그인이 필요합니다.')
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

// 🔥 백엔드 팔로우 API 서비스
const followApiService = {
  // 팔로우
  follow: async (followeeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/follows/${followeeId}`, {
      method: 'POST',
      headers: createAuthHeaders()
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      throw new Error('팔로우에 실패했습니다.')
    }
  },

  // 언팔로우
  unfollow: async (followeeId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/follows/${followeeId}`, {
      method: 'DELETE',
      headers: createAuthHeaders()
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      throw new Error('언팔로우에 실패했습니다.')
    }
  },

  // 팔로우 여부 확인
  isFollowing: async (followeeId: number): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/follows/check/${followeeId}`, {
      headers: createAuthHeaders()
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다.')
      }
      throw new Error('팔로우 상태 확인에 실패했습니다.')
    }
    
    const data = await response.json()
    return data.data
  }
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
  const [isHovered, setIsHovered] = useState(false)
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔥 컴포넌트 마운트시 실제 팔로우 상태 확인
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const followStatus = await followApiService.isFollowing(userId)
        setIsFollowing(followStatus)
      } catch (error) {
        console.error('팔로우 상태 확인 실패:', error)
        // 에러가 발생해도 초기값 유지
      }
    }

    if (userId && !disabled) {
      checkFollowStatus()
    }
  }, [userId, disabled])

  // 🔥 클릭 핸들러 (백엔드 API 직접 호출)
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      if (isFollowing) {
        await followApiService.unfollow(userId)
        setIsFollowing(false)
        onFollowChange?.(false)
      } else {
        await followApiService.follow(userId)
        setIsFollowing(true)
        onFollowChange?.(true)
      }
    } catch (error) {
      console.error('팔로우/언팔로우 실패:', error)
      setError(error instanceof Error ? error.message : '요청에 실패했습니다.')
      
      // 에러 발생시 토스트 알림 (선택적)
      if (typeof window !== 'undefined') {
        // TODO: 토스트 라이브러리 사용
        console.warn('Follow error:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, isFollowing, disabled, isLoading, onFollowChange])

  // 🔥 크기 클래스를 useMemo로 최적화
  const sizeClasses = useMemo(() => ({
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }), [])

  // 🔥 버튼 상태 결정
  const buttonState = useMemo(() => {
    if (isLoading) return 'loading'
    if (isPending) return 'pending'
    if (isFollowing) return isHovered ? 'unfollow' : 'following'
    return 'follow'
  }, [isLoading, isPending, isFollowing, isHovered])

  // 🔥 버튼 콘텐츠 최적화
  const getButtonContent = useCallback(() => {
    const iconClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
    
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <svg className={`animate-spin ${iconClass} mr-2`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

  // 🔥 버튼 스타일 최적화
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

  // 🔥 툴팁 텍스트
  const tooltipText = useMemo(() => {
    if (ariaLabel) return ariaLabel
    
    if (error) return `에러: ${error}`
    
    switch (buttonState) {
      case 'loading': return '처리 중...'
      case 'pending': return '팔로우 요청이 대기 중입니다'
      case 'unfollow': return '클릭해서 언팔로우'
      case 'following': return '팔로잉 중 (클릭해서 언팔로우)'
      case 'follow': return '클릭해서 팔로우'
      default: return ''
    }
  }, [buttonState, ariaLabel, error])

  // 🔥 로그인이 필요한 경우 처리
  if (!getAuthToken()) {
    return (
      <div className={className}>
        <button
          disabled
          className={`${sizeClasses[size]} inline-flex items-center justify-center font-medium rounded-lg bg-gray-200 text-gray-500 border-2 border-gray-200 cursor-not-allowed`}
          title="로그인이 필요합니다"
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

      {/* 🔥 에러 메시지 표시 */}
      {error && (
        <div className="mt-1 text-center">
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}

      {/* 🔥 관계 상태 표시 (showMutualIndicator가 true일 때만) */}
      {showMutualIndicator && !error && (
        <>
          {/* 상호 팔로우 표시 */}
          {isFollowing && isFollowedBy && (
            <div className="mt-1 text-center">
              <span className="inline-flex items-center px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">
                <HeartSolidIcon className="w-3 h-3 mr-1" />
                서로 팔로우
              </span>
            </div>
          )}

          {/* 나를 팔로우하는 사람 표시 */}
          {!isFollowing && isFollowedBy && !isPending && (
            <div className="mt-1 text-center">
              <span className="inline-flex items-center text-xs text-gray-500">
                <HeartIcon className="w-3 h-3 mr-1" />
                나를 팔로우함
              </span>
            </div>
          )}

          {/* 팔로우 요청 대기 표시 */}
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
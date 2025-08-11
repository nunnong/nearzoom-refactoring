'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { UserPlusIcon, UserMinusIcon, CheckIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useFollow } from '@/hooks/useFollow'

interface FollowButtonProps {
  userId: string
  isFollowing: boolean
  isFollowedBy?: boolean
  isPending?: boolean // ✅ 팔로우 요청 대기 상태
  onFollowChange?: (isFollowing: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'minimal'
  showMutualIndicator?: boolean // ✅ 상호 팔로우 표시 여부
  disabled?: boolean
  className?: string
  'aria-label'?: string // ✅ 접근성 개선
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  isFollowing,
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
  
  // ✅ 실제 useFollow 훅 사용
  const { followUser, unfollowUser, isLoading } = useFollow({
    onFollowSuccess: (userId) => {
      console.log('Follow success:', userId)
      onFollowChange?.(true)
    },
    onUnfollowSuccess: (userId) => {
      console.log('Unfollow success:', userId)
      onFollowChange?.(false)
    },
    onError: (error) => {
      console.error('Follow/Unfollow error:', error)
      // TODO: 에러 토스트 표시
    }
  })

  // ✅ 클릭 핸들러 최적화
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled || isLoading) return

    try {
      if (isFollowing) {
        await unfollowUser(userId)
        // onFollowChange는 useFollow 훅의 콜백에서 처리됨
      } else {
        await followUser(userId)
        // onFollowChange는 useFollow 훅의 콜백에서 처리됨
      }
    } catch (error) {
      console.error('Follow/unfollow failed:', error)
      // 에러는 useFollow 훅의 onError 콜백에서 처리됨
    }
  }, [userId, isFollowing, disabled, isLoading, followUser, unfollowUser])

  // ✅ 크기 클래스를 useMemo로 최적화
  const sizeClasses = useMemo(() => ({
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }), [])

  // ✅ 버튼 상태 결정
  const buttonState = useMemo(() => {
    if (isLoading) return 'loading'
    if (isPending) return 'pending'
    if (isFollowing) return isHovered ? 'unfollow' : 'following'
    return 'follow'
  }, [isLoading, isPending, isFollowing, isHovered])

  // ✅ 버튼 콘텐츠 최적화
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

  // ✅ 버튼 스타일 최적화
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

  // ✅ 툴팁 텍스트
  const tooltipText = useMemo(() => {
    if (ariaLabel) return ariaLabel
    
    switch (buttonState) {
      case 'loading': return '처리 중...'
      case 'pending': return '팔로우 요청이 대기 중입니다'
      case 'unfollow': return '클릭해서 언팔로우'
      case 'following': return '팔로잉 중 (클릭해서 언팔로우)'
      case 'follow': return '클릭해서 팔로우'
      default: return ''
    }
  }, [buttonState, ariaLabel])

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

      {/* ✅ 관계 상태 표시 (showMutualIndicator가 true일 때만) */}
      {showMutualIndicator && (
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
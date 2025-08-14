// FollowButton.tsx 수정 버전

'use client'

import React, { useState, useEffect } from 'react'
import { UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline'

// ============================================================================
// Props 타입 정의 (accountName 추가)
// ============================================================================

interface FollowButtonProps {
  userId: number;
  accountName?: string;           // 🔥 accountName 속성 추가
  initialIsFollowing: boolean;
  isFollowedBy?: boolean;
  onFollowChange?: (newFollowing: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

// ============================================================================
// FollowButton 컴포넌트
// ============================================================================

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  accountName,
  initialIsFollowing,
  isFollowedBy = false,
  onFollowChange,
  disabled = false,
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)

  // initialIsFollowing 변경 시 로컬 상태 동기화
  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  // 팔로우 토글 핸들러
  const handleClick = async () => {
    if (disabled || isLoading || !onFollowChange) return

    const newFollowing = !isFollowing
    setIsLoading(true)

    try {
      // 낙관적 업데이트
      setIsFollowing(newFollowing)
      
      // 부모 컴포넌트의 핸들러 호출
      await onFollowChange(newFollowing)
      
    } catch (error) {
      // 에러 시 롤백
      setIsFollowing(isFollowing)
      console.error('Follow toggle failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 크기별 스타일
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  // 변형별 스타일
  const getVariantClasses = () => {
    if (isFollowing) {
      // 팔로잉 상태 (언팔로우 버튼)
      switch (variant) {
        case 'primary':
          return 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-300 hover:border-red-300'
        case 'secondary':
          return 'bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300'
        case 'outline':
          return 'bg-transparent hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300'
        default:
          return 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-300 hover:border-red-300'
      }
    } else {
      // 팔로우 대기 상태 (팔로우 버튼)
      switch (variant) {
        case 'primary':
          return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700'
        case 'secondary':
          return 'bg-gray-600 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-700'
        case 'outline':
          return 'bg-transparent hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700'
        default:
          return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700'
      }
    }
  }

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
  `.trim()

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${getVariantClasses()}
    ${className}
  `.trim()

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={buttonClasses}
      aria-label={isFollowing ? '언팔로우' : '팔로우'}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          {isFollowing ? '언팔로우 중...' : '팔로우 중...'}
        </>
      ) : (
        <>
          {isFollowing ? (
            <>
              <UserMinusIcon className="w-4 h-4 mr-2" />
              팔로잉
            </>
          ) : (
            <>
              <UserPlusIcon className="w-4 h-4 mr-2" />
              팔로우
            </>
          )}
        </>
      )}

      {/* 상호 팔로우 표시 (선택적) */}
      {isFollowing && isFollowedBy && size !== 'sm' && (
        <span className="ml-2 text-xs opacity-75">
          ↔
        </span>
      )}
    </button>
  )
}

export default FollowButton
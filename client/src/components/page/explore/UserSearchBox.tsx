'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { UserProfile, searchUsers } from '@/lib/api/explore' // 🔥 올바른 경로로 수정

interface UserSearchBoxProps {
  onUserFound: (userId: string) => void
  className?: string
}

const UserSearchBox: React.FC<UserSearchBoxProps> = ({
  onUserFound,
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ 백엔드 API를 사용한 사용자 검색 함수
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      setError(null)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      console.log('🔍 사용자 검색 시작:', searchQuery) // 디버깅용

      const result = await searchUsers(searchQuery, undefined, 10)

      console.log('🔍 검색 결과:', result) // 디버깅용

      if (result.success && result.data) {
        setSearchResults(result.data.users)
        setShowResults(true)
        console.log('✅ 검색 성공:', result.data.users.length, '명 발견')
      } else {
        setError(result.error || '검색 중 오류가 발생했습니다.')
        setSearchResults([])
        setShowResults(true)
        console.error('❌ 검색 실패:', result.error)
      }
    } catch (err) {
      console.error('❌ 검색 API 호출 실패:', err)
      setError('네트워크 오류가 발생했습니다.')
      setSearchResults([])
      setShowResults(true)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // ✅ 디바운싱된 검색 실행
  const debouncedSearch = useCallback((searchQuery: string) => {
    // 이전 타이머 클리어
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 새로운 타이머 설정 (500ms 지연 - API 호출이므로 조금 더 길게)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 500)
  }, [performSearch])

  // ✅ 컴포넌트 언마운트 시 타이머 클리어
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 즉시 검색 (폼 제출 시)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    performSearch(query)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    // 디바운싱된 실시간 검색
    if (value.length >= 2) {
      debouncedSearch(value)
    } else {
      // 타이머 클리어
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      setSearchResults([])
      setShowResults(false)
      setIsSearching(false)
      setError(null)
    }
  }

  const handleUserSelect = (user: UserProfile) => {
    console.log('👤 사용자 선택:', user.id, user.username) // 디버깅용
    onUserFound(user.id)
    setQuery('')
    setShowResults(false)
    setSearchResults([])
    setError(null)
  }

  const handleBlur = () => {
    // 약간의 지연을 주어 클릭 이벤트가 먼저 처리되도록 함
    setTimeout(() => {
      setShowResults(false)
    }, 150)
  }

  // ✅ 키보드 네비게이션 지원
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      setQuery('')
      setError(null)
    }
  }

  // ✅ 사용자 표시명 생성 (username 우선, 없으면 email에서 추출)
  const getUserDisplayName = (user: UserProfile) => {
    return user.username || user.email.split('@')[0]
  }

  // ✅ 팔로워 수 포맷팅
  const formatFollowerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toLocaleString()
  }

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && searchResults.length > 0 && setShowResults(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="사용자명(accountName)으로 검색... (최소 2글자)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-colors"
            autoComplete="off"
          />
          
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <LoadingSpinner size="sm" />
            ) : (
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </form>

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {error ? (
            /* 에러 상태 */
            <div className="px-4 py-6 text-center">
              <div className="text-red-500 text-sm font-medium mb-1">검색 오류</div>
              <p className="text-sm text-gray-500">{error}</p>
              <button
                onClick={() => performSearch(query)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
              >
                다시 시도
              </button>
            </div>
          ) : searchResults.length > 0 ? (
            /* 검색 결과 목록 */
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-500">
                  {searchResults.length}명의 사용자를 찾았습니다
                </p>
              </div>
              <ul className="py-2">
                {searchResults.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => handleUserSelect(user)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 transition-colors focus:outline-none group"
                    >
                      <div className="flex items-center space-x-3">
                        {/* 프로필 이미지 */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={getUserDisplayName(user)}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `<span class="text-sm font-medium text-gray-600">${getUserDisplayName(user).charAt(0).toUpperCase()}</span>`
                                }
                              }}
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {getUserDisplayName(user).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        {/* 사용자 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900 truncate">
                              @{getUserDisplayName(user)}
                            </p>
                            {user.isFollowing && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                팔로잉
                              </span>
                            )}
                            {user.isMe && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                나
                              </span>
                            )}
                          </div>
                          {user.bio && (
                            <p className="text-sm text-gray-500 truncate">{user.bio}</p>
                          )}
                          <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                            <span>팔로워 {formatFollowerCount(user.followersCount)}명</span>
                            <span>•</span>
                            <span>피드 {user.feedsCount}개</span>
                          </div>
                        </div>
                        
                        {/* 화살표 */}
                        <div className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors">
                          <svg 
                            className="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : !isSearching && query.length >= 2 ? (
            /* 검색 결과 없음 */
            <div className="px-4 py-6 text-center">
              <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                "{query}"와 일치하는 사용자를 찾을 수 없습니다
              </p>
              <p className="text-xs text-gray-400 mt-1">
                정확한 accountName을 입력해보세요
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 검색 팁 (포커스 시 표시) */}
      {query.length === 0 && showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">검색 팁</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 최소 2글자 이상 입력해주세요</li>
            <li>• 사용자의 accountName으로 검색됩니다</li>
            <li>• ESC 키를 누르면 검색창이 닫힙니다</li>
          </ul>
        </div>
      )}

      {/* 개발 환경에서만 디버그 정보 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          검색어: "{query}" | 결과: {searchResults.length}개 | 
          {isSearching ? ' 검색 중...' : ' 대기 중'} |
          API: /feeds/search
        </div>
      )}
    </div>
  )
}

export default UserSearchBox
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface UserResult {
  id: string
  name: string
  email: string
  profileImage?: string
  followersCount: number
}

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
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 🔥 디바운싱을 위한 ref

  // Mock 사용자 데이터
  const mockUsers: UserResult[] = [
    {
      id: 'user1',
      name: '김다꾸',
      email: 'daku@example.com',
      profileImage: '/api/placeholder/40/40?seed=1',
      followersCount: 142,
    },
    {
      id: 'user2',
      name: '이예쁜',
      email: 'pretty@example.com',
      followersCount: 89,
    },
    {
      id: 'user3',
      name: '박감성',
      email: 'emotional@example.com',
      profileImage: '/api/placeholder/40/40?seed=3',
      followersCount: 256,
    },
    {
      id: 'user4',
      name: '정아름',
      email: 'beauty@example.com',
      followersCount: 67,
    },
    {
      id: 'user5',
      name: '최귀염',
      email: 'cute@example.com',
      profileImage: '/api/placeholder/40/40?seed=5',
      followersCount: 198,
    },
  ]

  // 🔥 디바운싱이 적용된 검색 함수
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)

    // Mock API 호출 시뮬레이션
    setTimeout(() => {
      const filteredUsers = mockUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      setSearchResults(filteredUsers)
      setShowResults(true)
      setIsSearching(false)
    }, 500)
  }, [mockUsers])

  // 🔥 디바운싱된 검색 실행
  const debouncedSearch = useCallback((searchQuery: string) => {
    // 이전 타이머 클리어
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 새로운 타이머 설정 (300ms 지연)
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
  }, [searchUsers])

  // 🔥 컴포넌트 언마운트 시 타이머 클리어
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 🔥 즉시 검색 (폼 제출 시)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchUsers(query)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    // 🔥 디바운싱된 실시간 검색
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
    }
  }

  const handleUserSelect = (user: UserResult) => {
    onUserFound(user.id)
    setQuery('')
    setShowResults(false)
    setSearchResults([])
  }

  const handleBlur = () => {
    // 약간의 지연을 주어 클릭 이벤트가 먼저 처리되도록 함
    setTimeout(() => {
      setShowResults(false)
    }, 150)
  }

  // 🔥 키보드 네비게이션 지원
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      setQuery('')
    }
  }

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown} // 🔥 키보드 네비게이션 추가
            placeholder="이름 또는 이메일로 사용자 검색... (예: 김다꾸, user@example.com)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
            autoComplete="off" // 🔥 브라우저 자동완성 비활성화
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
          {searchResults.length > 0 ? (
            <ul className="py-2">
              {searchResults.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleUserSelect(user)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center space-x-3">
                      {/* 프로필 이미지 */}
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            loading="lazy" // 🔥 성능 최적화
                            onError={(e) => {
                              // 🔥 이미지 로드 실패 시 fallback
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `<span class="text-sm font-medium text-gray-600">${user.name.charAt(0)}</span>`
                              }
                            }}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {user.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      
                      {/* 사용자 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          팔로워 {user.followersCount.toLocaleString()}명
                        </p>
                      </div>
                      
                      {/* 화살표 */}
                      <div className="text-gray-400 flex-shrink-0">
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
          ) : (
            <div className="px-4 py-6 text-center">
              <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                "{query}"와 일치하는 사용자를 찾을 수 없습니다
              </p>
              <p className="text-xs text-gray-400 mt-1">
                이름이나 이메일을 정확히 입력해보세요
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UserSearchBox
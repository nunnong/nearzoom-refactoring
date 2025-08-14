'use client'

import { MagnifyingGlassIcon, XMarkIcon, HeartIcon, CalendarIcon, PencilIcon } from '@heroicons/react/24/outline'
import React, { useState, ChangeEvent } from 'react'

interface Filter {
  id: string
  type: 'heart' | 'name' | 'date' | 'edited'
  value: string
  display: string
}

interface SearchBoxProps {
  onFiltersChange?: (filters: Filter[]) => void
  placeholder?: string
}

const SearchBox: React.FC<SearchBoxProps> = ({
  onFiltersChange,
  placeholder = '함께 찍은 친구 이메일로 검색하세요 (Enter로 필터 추가)',
}) => {
  const [searchValue, setSearchValue] = useState<string>('')
  const [filters, setFilters] = useState<Filter[]>([])
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // 날짜 필터 추가
  const addDateFilter = (start: string, end?: string) => {
    const dateValue = end ? `${start}~${end}` : start
    const displayValue = end ? `${start} ~ ${end}` : start
    
    const newFilter: Filter = {
      id: Date.now().toString(),
      type: 'date',
      value: dateValue,
      display: displayValue
    }

    const updatedFilters = [...filters, newFilter]
    setFilters(updatedFilters)
    onFiltersChange?.(updatedFilters)
    setShowDatePicker(false)
    setStartDate('')
    setEndDate('')
    
    console.log('📅 Date filter added:', newFilter)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchValue(e.target.value)
  }

  // 좋아요 필터 추가/제거
  const addHeartFilter = () => {
    const existingHeartFilter = filters.find(f => f.type === 'heart')
    
    if (existingHeartFilter) {
      // 이미 있으면 제거
      const updatedFilters = filters.filter(f => f.type !== 'heart')
      setFilters(updatedFilters)
      onFiltersChange?.(updatedFilters)
      console.log('💔 Heart filter removed')
    } else {
      // 새로 추가
      const newFilter: Filter = {
        id: Date.now().toString(),
        type: 'heart',
        value: 'liked',
        display: '💖 좋아요'
      }

      const updatedFilters = [...filters, newFilter]
      setFilters(updatedFilters)
      onFiltersChange?.(updatedFilters)
      console.log('💖 Heart filter added')
    }
  }

  // 이메일 검증 함수 (더 관대한 검증)
  const isValidEmailOrPartial = (value: string): boolean => {
    // 빈 문자열이면 false
    if (!value.trim()) return false
    
    // @ 포함하지 않으면 부분 검색으로 허용
    if (!value.includes('@')) return true
    
    // @ 포함하면 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  // 필터 추가
  const addFilter = (value: string) => {
    if (!value.trim()) return

    // 입력값 정리: 공백 제거, 특수문자 처리
    const trimmedValue = value.trim().replace(/\s+/g, ' ')
    
    // 이메일 검증
    if (!isValidEmailOrPartial(trimmedValue)) {
      alert('올바른 이메일 형식을 입력하거나 검색할 이름을 입력해주세요.')
      return
    }
    
    // 중복 필터 체크
    const existingFilter = filters.find(f => f.type === 'name' && f.value === trimmedValue)
    if (existingFilter) {
      alert('이미 추가된 검색어입니다.')
      return
    }

    const newFilter: Filter = {
      id: Date.now().toString(),
      type: 'name',
      value: trimmedValue,
      display: trimmedValue
    }

    const updatedFilters = [...filters, newFilter]
    setFilters(updatedFilters)
    setSearchValue('')
    onFiltersChange?.(updatedFilters)
    
    console.log('🏷️ Name filter added:', newFilter)
  }

  // 필터 제거
  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId)
    setFilters(updatedFilters)
    onFiltersChange?.(updatedFilters)
    
    console.log('🗑️ Filter removed, remaining filters:', updatedFilters.length)
  }

  // 전체 필터 초기화
  const clearAllFilters = () => {
    setFilters([])
    onFiltersChange?.([])
    console.log('🧹 All filters cleared')
  }

  // 키보드 이벤트 처리
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFilter(searchValue)
    }
  }

  // 필터 색상 설정
  const getFilterColor = (type: Filter['type']) => {
    switch (type) {
      case 'heart':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'name':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'date':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'edited':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* 검색 입력창 */}
      <div className="flex h-12 items-center border-[3px] border-[#C4C8DA] bg-white rounded-lg px-3">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 font-medium"
        />
        
        {/* 좋아요 필터 버튼 */}
        <button
          onClick={addHeartFilter}
          className={`ml-2 p-2 transition-colors ${
            filters.some(f => f.type === 'heart')
              ? 'text-red-500 bg-red-50 rounded-full' 
              : 'text-gray-400 hover:text-red-500'
          }`}
          title={filters.some(f => f.type === 'heart') ? '좋아요 필터 해제' : '좋아요 필터 추가'}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
        
        {/* 날짜 필터 버튼 */}
        <button
          onClick={() => setShowDatePicker(true)}
          className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="날짜 필터 추가"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
        
        {/* 검색어 추가 버튼 */}
        {searchValue && (
          <button
            onClick={() => addFilter(searchValue)}
            className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            검색
          </button>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {filters.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              활성 필터 ({filters.length}개)
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              전체 해제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <div
                key={filter.id}
                className={`flex items-center px-3 py-1 rounded-full border text-sm ${getFilterColor(filter.type)}`}
              >
                {filter.type === 'heart' && (
                  <HeartIcon className="h-3 w-3 mr-1" />
                )}
                {filter.type === 'name' && (
                  <span className="text-xs mr-1">👥</span>
                )}
                {filter.type === 'date' && (
                  <CalendarIcon className="h-3 w-3 mr-1" />
                )}
                <span>{filter.display}</span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-2 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                  title="필터 제거"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 날짜 선택 모달 */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">날짜 필터 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작 날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 날짜 (선택사항)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {endDate && startDate && endDate < startDate && (
                <p className="text-sm text-red-600">
                  종료 날짜는 시작 날짜보다 늦어야 합니다.
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDatePicker(false)
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (startDate) {
                    if (endDate && endDate < startDate) {
                      alert('종료 날짜는 시작 날짜보다 늦어야 합니다.')
                      return
                    }
                    addDateFilter(startDate, endDate || undefined)
                  }
                }}
                disabled={!startDate || (endDate && endDate < startDate)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchBox
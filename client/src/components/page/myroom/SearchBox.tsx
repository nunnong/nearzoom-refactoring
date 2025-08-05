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
  placeholder = '친구 이름으로 검색하세요 (스페이스바로 필터 추가)',
}) => {
  const [searchValue, setSearchValue] = useState<string>('')
  const [filters, setFilters] = useState<Filter[]>([])
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const addDateFilter = (start: string, end?: string) => {
    const dateValue = end ? `${start} ~ ${end}` : start
    const newFilter: Filter = {
      id: Date.now().toString(),
      type: 'date',
      value: dateValue,
      display: dateValue
    }

    const updatedFilters = [...filters, newFilter]
    setFilters(updatedFilters)
    onFiltersChange?.(updatedFilters)
    setShowDatePicker(false)
    setStartDate('')
    setEndDate('')
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchValue(e.target.value)
  }

  const addHeartFilter = () => {
    // 이미 하트 필터가 있는지 확인
    const existingHeartFilter = filters.find(f => f.type === 'heart')
    
    if (existingHeartFilter) {
      // 이미 있으면 추가하지 않음
      return
    }

    const newFilter: Filter = {
      id: Date.now().toString(),
      type: 'heart',
      value: 'liked',
      display: '♥ 좋아요'
    }

    const updatedFilters = [...filters, newFilter]
    setFilters(updatedFilters)
    onFiltersChange?.(updatedFilters)
  }

  const addEditedFilter = () => {
    // 기존 편집 필터가 있는지 확인
    const existingEditFilter = filters.find(f => f.type === 'edited')
    
    if (existingEditFilter) {
      // 기존 필터가 있으면 토글
      const newValue = existingEditFilter.value === 'edited' ? 'not_edited' : 'edited'
      const newDisplay = newValue === 'edited' ? '✏️ 편집됨' : '📝 편집안됨'
      
      const updatedFilters = filters.map(f => 
        f.type === 'edited' 
          ? { ...f, value: newValue, display: newDisplay }
          : f
      )
      setFilters(updatedFilters)
      onFiltersChange?.(updatedFilters)
    } else {
      // 새로운 편집 필터 추가
      const newFilter: Filter = {
        id: Date.now().toString(),
        type: 'edited',
        value: 'edited',
        display: '✏️ 편집됨'
      }

      const updatedFilters = [...filters, newFilter]
      setFilters(updatedFilters)
      onFiltersChange?.(updatedFilters)
    }
  }

  const detectFilterType = (value: string): 'heart' | 'name' | 'date' => {
    // 날짜 범위 패턴 감지 (YYYY.MM.DD ~ YYYY.MM.DD 형식)
    if (/^\d{4}\.\d{1,2}\.\d{1,2}\s*~\s*\d{4}\.\d{1,2}\.\d{1,2}$/.test(value)) {
      return 'date'
    }
    // 단일 날짜 패턴 감지 (YYYY.MM.DD 형식)
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(value)) {
      return 'date'
    }
    // 그 외는 이름으로 처리 (하트 키워드 제거)
    return 'name'
  }

  const addFilter = (value: string) => {
    if (!value.trim()) return

    const type = detectFilterType(value.trim())
    const newFilter: Filter = {
      id: Date.now().toString(),
      type,
      value: value.trim(),
      display: type === 'heart' ? '♥ 좋아요' : value.trim()
    }

    const updatedFilters = [...filters, newFilter]
    setFilters(updatedFilters)
    setSearchValue('')
    onFiltersChange?.(updatedFilters)
  }

  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId)
    setFilters(updatedFilters)
    onFiltersChange?.(updatedFilters)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      addFilter(searchValue)
    } else if (e.key === ' ' && searchValue.trim()) {
      e.preventDefault() // 스페이스바가 입력창에 공백을 추가하는 것을 방지
      addFilter(searchValue.trim())
    }
  }

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
        <button
          onClick={addHeartFilter}
          className={`ml-2 p-2 transition-colors ${
            filters.some(f => f.type === 'heart')
              ? 'text-red-500 bg-red-50 rounded-full'
              : 'text-gray-400 hover:text-red-500'
          }`}
          title={filters.some(f => f.type === 'heart') ? '좋아요 필터 적용됨' : '좋아요 필터 추가'}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
        <button
          onClick={addEditedFilter}
          className={`ml-2 p-2 transition-colors ${
            filters.some(f => f.type === 'edited')
              ? 'text-purple-500 bg-purple-50 rounded-full'
              : 'text-gray-400 hover:text-blue-500'
          }`}
          title={filters.some(f => f.type === 'edited') ? '편집됨 필터 적용됨' : '편집됨 필터 추가'}
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowDatePicker(true)}
          className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="날짜 필터 추가"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
        {searchValue && (
          <button
            onClick={() => addFilter(searchValue)}
            className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            추가
          </button>
        )}
      </div>

      {/* 필터 버튼들 */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className={`flex items-center px-3 py-1 rounded-full border text-sm ${getFilterColor(filter.type)}`}
            >
              {filter.type === 'heart' && (
                <HeartIcon className="h-3 w-3 mr-1" />
              )}
              {filter.type === 'edited' && (
                <PencilIcon className="h-3 w-3 mr-1" />
              )}
              <span>{filter.display}</span>
              <button
                onClick={() => removeFilter(filter.id)}
                className="ml-2 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 날짜 선택 모달 */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">날짜 필터 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시작 날짜</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">종료 날짜 (선택사항)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                    // 날짜를 YYYY.MM.DD 형식으로 변환
                    const formattedStart = startDate.replace(/-/g, '.')
                    const formattedEnd = endDate ? endDate.replace(/-/g, '.') : undefined
                    addDateFilter(formattedStart, formattedEnd)
                  }
                }}
                disabled={!startDate}
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

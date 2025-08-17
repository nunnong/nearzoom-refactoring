'use client'

import { MagnifyingGlassIcon, XMarkIcon, HeartIcon, CalendarIcon, PencilIcon } from '@heroicons/react/24/outline'
import React, { useState, ChangeEvent, useCallback, useMemo, useEffect } from 'react'

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

const SearchBox: React.FC<SearchBoxProps> = React.memo(({
  onFiltersChange,
  placeholder = '친구 메일로 검색하세요 (스페이스바로 필터 추가)',
}) => {
  const [searchValue, setSearchValue] = useState<string>('')
  const [filters, setFilters] = useState<Filter[]>([])
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // 🚀 로컬스토리지에서 필터 상태 복원
  useEffect(() => {
    const savedFilters = localStorage.getItem('myroom-filters')
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters)
        setFilters(parsedFilters)
        console.log('💾 저장된 필터 복원됨:', parsedFilters)
        
        // 🚀 복원된 필터가 있으면 자동으로 적용
        if (parsedFilters.length > 0) {
          setTimeout(() => {
            onFiltersChange?.(parsedFilters)
            console.log('🔄 복원된 필터 자동 적용됨')
          }, 100) // 약간의 지연으로 안정성 확보
        }
      } catch (error) {
        console.error('❌ 저장된 필터 파싱 실패:', error)
        localStorage.removeItem('myroom-filters')
      }
    }
  }, [onFiltersChange]) // onFiltersChange 의존성 복원

  // 🚀 필터 상태를 로컬스토리지에 저장
  const saveFiltersToStorage = useCallback((newFilters: Filter[]) => {
    try {
      localStorage.setItem('myroom-filters', JSON.stringify(newFilters))
      console.log('💾 필터 상태 저장됨:', newFilters)
    } catch (error) {
      console.error('❌ 필터 상태 저장 실패:', error)
    }
  }, [])

  // 🚀 성능 최적화: 디바운스된 필터 변경
  const debouncedFiltersChange = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (newFilters: Filter[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        // 🚀 필터 변경됨 시 자동 적용
        console.log('⏱️ 디바운스 타이머 완료, onFiltersChange 호출:', newFilters)
        onFiltersChange?.(newFilters)
        console.log('🔍 필터 변경됨 (자동 적용):', newFilters)
      }, 300) // 300ms 디바운스
    }
  }, [onFiltersChange]) // onFiltersChange 의존성 복원

  // 🚀 필터 상태 관리 최적화 (로컬스토리지 저장 포함)
  const updateFilters = useCallback((newFilters: Filter[]) => {
    console.log('🔄 updateFilters 호출됨:', newFilters)
    setFilters(newFilters)
    saveFiltersToStorage(newFilters) // 로컬스토리지에 저장
    console.log('💾 로컬스토리지 저장 완료')
    debouncedFiltersChange(newFilters)
    console.log('⏱️ 디바운스된 필터 변경 예약됨')
  }, [saveFiltersToStorage, debouncedFiltersChange]) // debouncedFiltersChange 의존성 복원

  // 날짜 관련 함수
  const addDateFilter = useCallback((start: string, end?: string) => {
    const dateValue = end ? `${start} ~ ${end}` : start
    const newFilter: Filter = {
      id: Date.now().toString(),
      type: 'date',
      value: dateValue,
      display: dateValue
    }

    const updatedFilters = [...filters, newFilter]
    updateFilters(updatedFilters)
    setShowDatePicker(false)
    setStartDate('')
    setEndDate('')
  }, [filters, updateFilters])

  // 🚀 개선된 하트 필터 (토글 가능)
  const toggleHeartFilter = useCallback(() => {
    const existingHeartFilter = filters.find(f => f.type === 'heart')
    
    if (existingHeartFilter) {
      // 기존 하트 필터 제거
      const updatedFilters = filters.filter(f => f.id !== existingHeartFilter.id)
      updateFilters(updatedFilters)
    } else {
      // 새로운 하트 필터 추가
      const newFilter: Filter = {
        id: Date.now().toString(),
        type: 'heart',
        value: 'true',
        display: '♥ 좋아요'
      }
      const updatedFilters = [...filters, newFilter]
      updateFilters(updatedFilters)
    }
  }, [filters, updateFilters])

  const toggleEditedFilter = useCallback(() => {
    console.log('🔍 toggleEditedFilter 호출됨')
    console.log('📋 현재 필터 상태:', filters)
    
    const existingEditFilter = filters.find(f => f.type === 'edited')
    console.log('🔍 기존 편집 필터:', existingEditFilter)
    
    if (!existingEditFilter) {
      // 1단계: 편집된 사진만
      const newFilter: Filter = {
        id: Date.now().toString(),
        type: 'edited',
        value: 'edited',
        display: '✏️ 편집됨'
      }
      const updatedFilters = [...filters, newFilter]
      console.log('✏️ 편집됨 필터 추가:', newFilter)
      console.log('🔄 업데이트된 필터:', updatedFilters)
      updateFilters(updatedFilters)
      console.log('✏️ 편집됨 필터 추가 완료')
    } else if (existingEditFilter.value === 'edited') {
      // 2단계: 편집 안된 사진만
      const updatedFilters = filters.map(f => 
        f.id === existingEditFilter.id 
          ? { ...f, value: 'not_edited', display: '📝 편집안됨' }
          : f
      )
      console.log('📝 편집안됨 필터로 변경:', updatedFilters)
      updateFilters(updatedFilters)
      console.log('📝 편집안됨 필터로 변경 완료')
    } else {
      // 3단계: 필터 제거
      const updatedFilters = filters.filter(f => f.id !== existingEditFilter.id)
      console.log('🚫 편집 필터 제거:', updatedFilters)
      updateFilters(updatedFilters)
      console.log('🚫 편집 필터 제거 완료')
    }
  }, [filters, updateFilters])

  // �� 개선된 날짜 필터 (토글 가능)
  const toggleDateFilter = useCallback(() => {
    const existingDateFilter = filters.find(f => f.type === 'date')
    
    if (existingDateFilter) {
      // 기존 날짜 필터 제거
      const updatedFilters = filters.filter(f => f.id !== existingDateFilter.id)
      updateFilters(updatedFilters)
      console.log('📅 날짜 필터 제거됨')
    } else {
      // 날짜 선택 모달 열기
      setShowDatePicker(true)
    }
  }, [filters, updateFilters])

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setSearchValue(e.target.value)
  }, [])

  const detectFilterType = (value: string): 'heart' | 'name' | 'date' => {
    // 날짜 범위 패턴 감지 (YYYY.MM.DD ~ YYYY.MM.DD 형식)
    if (/^\d{4}\.\d{1,2}\.\d{1,2}\s*~\s*\d{4}\.\d{1,2}\.\d{1,2}$/.test(value)) {
      return 'date'
    }
    // 단일 날짜 패턴 감지 (YYYY.MM.DD 형식)
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(value)) {
      return 'date'
    }
    // 그 외는 이름으로 처리
    return 'name'
  }

  const addFilter = useCallback((value: string) => {
    if (!value.trim()) return

    const type = detectFilterType(value.trim())
    const newFilter: Filter = {
      id: Date.now().toString(),
      type,
      value: value.trim(),
      display: value.trim()
    }

    const updatedFilters = [...filters, newFilter]
    updateFilters(updatedFilters)
    setSearchValue('')
  }, [filters, updateFilters])

  const removeFilter = useCallback((filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId)
    updateFilters(updatedFilters)
  }, [filters, updateFilters])

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      addFilter(searchValue)
    } else if (e.key === ' ' && searchValue.trim()) {
      e.preventDefault()
      addFilter(searchValue.trim())
    }
  }, [searchValue, addFilter])

  // 🚀 필터 상태에 따른 버튼 스타일 계산
  const getFilterButtonStyle = useCallback((type: 'heart' | 'edited' | 'date') => {
    const hasFilter = filters.some(f => f.type === type)
    
    switch (type) {
      case 'heart':
        return hasFilter 
          ? 'text-red-500 bg-red-50 rounded-full shadow-sm' 
          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
      case 'edited':
        return hasFilter 
          ? 'text-purple-500 bg-purple-50 rounded-full shadow-sm' 
          : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'
      case 'date':
        return hasFilter 
          ? 'text-green-500 bg-green-50 rounded-full shadow-sm' 
          : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
      default:
        return 'text-gray-400 hover:text-gray-600'
    }
  }, [filters])

  const getFilterColor = useCallback((type: Filter['type']) => {
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
  }, [])

  // 🚀 메모이제이션된 값들
  const hasFilters = useMemo(() => filters.length > 0, [filters])
  
  const activeFiltersCount = useMemo(() => ({
    heart: filters.filter(f => f.type === 'heart').length,
    edited: filters.filter(f => f.type === 'edited').length,
    date: filters.filter(f => f.type === 'date').length,
    name: filters.filter(f => f.type === 'name').length
  }), [filters])

  // 🚀 필터 초기화
  const clearAllFilters = useCallback(() => {
    setFilters([])
    localStorage.removeItem('myroom-filters') // 로컬스토리지에서도 제거
    // 🚀 필터 초기화 시 자동 적용
    onFiltersChange?.([])
    console.log('🧹 모든 필터 초기화 (로컬스토리지 포함)')
  }, [onFiltersChange]) // onFiltersChange 의존성 복원

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
        
        {/* 🚀 개선된 하트 필터 버튼 */}
        <button
          onClick={toggleHeartFilter}
          className={`ml-2 p-2 transition-all duration-200 ${getFilterButtonStyle('heart')}`}
          title={activeFiltersCount.heart > 0 ? '좋아요 필터 제거' : '좋아요 필터 추가'}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
        
        {/* 🚀 개선된 편집 필터 버튼 */}
        <button
          onClick={toggleEditedFilter}
          className={`ml-2 p-2 transition-all duration-200 ${getFilterButtonStyle('edited')}`}
          title={
            activeFiltersCount.edited === 0 ? '편집 필터 추가' :
            activeFiltersCount.edited > 0 ? '편집 필터 변경/제거' : '편집 필터 제거'
          }
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        
        {/* 🚀 개선된 날짜 필터 버튼 */}
        <button
          onClick={toggleDateFilter}
          className={`ml-2 p-2 transition-all duration-200 ${getFilterButtonStyle('date')}`}
          title={activeFiltersCount.date > 0 ? '날짜 필터 제거' : '날짜 필터 추가'}
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

      {/* 🚀 필터 상태 표시 및 관리 */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* 필터 개수 표시 */}
          <div className="text-xs text-gray-500 mr-2">
            활성 필터: {filters.length}개
          </div>
          
          {/* 모든 필터 초기화 버튼 */}
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-gray-100"
            title="모든 필터 초기화"
          >
            🧹 전체 초기화
          </button>
          
          {/* 개별 필터 태그들 */}
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
              {filter.type === 'date' && (
                <CalendarIcon className="h-3 w-3 mr-1" />
              )}
              <span>{filter.display}</span>
              <button
                onClick={() => removeFilter(filter.id)}
                className="ml-2 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                title="필터 제거"
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
})

export default SearchBox
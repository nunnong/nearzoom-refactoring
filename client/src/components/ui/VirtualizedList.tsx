// src/components/ui/VirtualizedList.tsx
'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// LoadingSpinner 컴포넌트 임시 정의
const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <div className="inline-flex items-center justify-center gap-2">
    <svg
      className="animate-spin h-6 w-6 text-gray-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    {text && <span className="text-gray-600">{text}</span>}
  </div>
)

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  hasMore?: boolean
  isLoading?: boolean
  onLoadMore?: () => void
  className?: string
  overscan?: number
  loadMoreThreshold?: number
  getItemKey?: (item: T, index: number) => string | number
  onScrollPositionChange?: (scrollTop: number) => void
  initialScrollTop?: number
  emptyMessage?: string
}

// 스크롤 throttling을 위한 커스텀 훅
function useThrottle<T extends any[]>(callback: (...args: T) => void, delay: number) {
  const lastCall = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: T) => {
    const now = Date.now()
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      callback(...args)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now()
        callback(...args)
      }, delay - (now - lastCall.current))
    }
  }, [callback, delay])
}

function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  className = '',
  overscan = 5,
  loadMoreThreshold = 200,
  getItemKey,
  onScrollPositionChange,
  initialScrollTop = 0,
  emptyMessage = '표시할 항목이 없습니다'
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(initialScrollTop)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastLoadMoreCall = useRef<number>(0)
  const isInitialized = useRef(false)

  // 아이템 높이 계산 함수
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
  }, [itemHeight])

  // 누적 높이 계산 (동적 높이 지원)
  const itemOffsets = useMemo(() => {
    const offsets: number[] = [0]
    for (let i = 0; i < items.length; i++) {
      offsets.push(offsets[i] + getItemHeight(i))
    }
    return offsets
  }, [items.length, getItemHeight])

  // 가시 영역 계산 (동적 높이 고려)
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) return { startIndex: 0, endIndex: -1 }

    // 시작 인덱스 찾기
    let start = 0
    for (let i = 0; i < items.length; i++) {
      if (itemOffsets[i + 1] > scrollTop) {
        start = Math.max(0, i - overscan)
        break
      }
    }

    // 끝 인덱스 찾기
    let end = items.length - 1
    const viewportBottom = scrollTop + containerHeight
    for (let i = start; i < items.length; i++) {
      if (itemOffsets[i] >= viewportBottom) {
        end = Math.min(items.length - 1, i + overscan)
        break
      }
    }

    return { startIndex: start, endIndex: end }
  }, [scrollTop, containerHeight, items.length, itemOffsets, overscan])

  // 전체 높이 계산
  const totalHeight = itemOffsets[items.length] || 0

  // throttled 스크롤 핸들러
  const throttledScrollHandler = useThrottle((newScrollTop: number) => {
    setScrollTop(newScrollTop)
    onScrollPositionChange?.(newScrollTop)
  }, 16) // ~60fps

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const newScrollTop = target.scrollTop
    
    throttledScrollHandler(newScrollTop)

    // 무한 스크롤 체크
    if (
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      onLoadMore &&
      target.scrollHeight - target.scrollTop - target.clientHeight <= loadMoreThreshold
    ) {
      const now = Date.now()
      if (now - lastLoadMoreCall.current > 1000) { // 1초 디바운스
        lastLoadMoreCall.current = now
        setIsLoadingMore(true)
        onLoadMore()
      }
    }
  }, [hasMore, isLoading, isLoadingMore, onLoadMore, loadMoreThreshold, throttledScrollHandler])

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (!isInitialized.current && containerRef.current && initialScrollTop > 0) {
      containerRef.current.scrollTop = initialScrollTop
      setScrollTop(initialScrollTop)
      isInitialized.current = true
    }
  }, [initialScrollTop])

  // 로딩 완료시 상태 업데이트
  useEffect(() => {
    if (!isLoading && isLoadingMore) {
      setIsLoadingMore(false)
    }
  }, [isLoading, isLoadingMore])

  // 키보드 네비게이션
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!containerRef.current) return

    const container = containerRef.current
    const currentScroll = container.scrollTop

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        container.scrollTop = Math.min(
          currentScroll + getItemHeight(0),
          container.scrollHeight - container.clientHeight
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        container.scrollTop = Math.max(currentScroll - getItemHeight(0), 0)
        break
      case 'PageDown':
        e.preventDefault()
        container.scrollTop = Math.min(
          currentScroll + containerHeight,
          container.scrollHeight - container.clientHeight
        )
        break
      case 'PageUp':
        e.preventDefault()
        container.scrollTop = Math.max(currentScroll - containerHeight, 0)
        break
      case 'Home':
        e.preventDefault()
        container.scrollTop = 0
        break
      case 'End':
        e.preventDefault()
        container.scrollTop = container.scrollHeight - container.clientHeight
        break
    }
  }, [getItemHeight, containerHeight])

  // 가시 영역의 아이템들 렌더링
  const visibleItems = useMemo(() => {
    const items_to_render = []
    
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i] !== undefined) {
        const key = getItemKey ? getItemKey(items[i], i) : i
        items_to_render.push(
          <div
            key={key}
            style={{
              position: 'absolute',
              top: itemOffsets[i],
              left: 0,
              right: 0,
              height: getItemHeight(i),
            }}
            data-index={i}
          >
            {renderItem(items[i], i)}
          </div>
        )
      }
    }
    
    return items_to_render
  }, [startIndex, endIndex, items, itemOffsets, getItemHeight, renderItem, getItemKey])

  // 빈 상태 처리
  if (items.length === 0 && !isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto focus:outline-none ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="가상화된 목록"
      aria-rowcount={items.length}
    >
      <div
        style={{
          position: 'relative',
          height: totalHeight,
        }}
        role="presentation"
      >
        {visibleItems}
        
        {/* 로딩 인디케이터 */}
        {(isLoading || isLoadingMore) && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-live="polite"
            aria-label="추가 항목 로딩 중"
          >
            <LoadingSpinner text="로딩 중..." />
          </div>
        )}
        
        {/* 끝에 도달했을 때 메시지 */}
        {!hasMore && items.length > 0 && !isLoading && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="text-gray-500 text-sm"
            role="status"
            aria-live="polite"
          >
            모든 항목을 확인했습니다
          </div>
        )}
      </div>
    </div>
  )
}

export default VirtualizedList
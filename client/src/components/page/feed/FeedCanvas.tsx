'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { FeedElement, UserFeed } from '@/lib/types/feed'

interface FeedCanvasProps {
  userId: string
  elements: FeedElement[]
  viewport: { x: number; y: number; scale: number }
  selectedElement: string | null
  activeTool: string
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  feedData: UserFeed | null
  backgroundColor?: string
  onElementSelect: (elementId: string | null) => void
  onElementUpdate: (elementId: string, updates: Record<string, any>) => void
  onWheel: (e: React.WheelEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
}

// 🔥 안전한 Element 타입 정의 수정
type SafeElement = FeedElement & {
  [key: string]: any
}

const FeedCanvas: React.FC<FeedCanvasProps> = ({
  userId,
  elements,
  viewport,
  selectedElement,
  activeTool,
  isDragging,
  containerRef,
  feedData,
  backgroundColor,
  onElementSelect,
  onElementUpdate,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1920, 
    height: typeof window !== 'undefined' ? window.innerHeight : 1080 
  })

  // 🔥 배경색 메모이제이션
  const currentBackgroundColor = useMemo(() => 
    backgroundColor || feedData?.backgroundColor || '#f8fafc'
  , [backgroundColor, feedData?.backgroundColor])

  // 🔥 캔버스 크기 계산 메모이제이션
  const canvasSize = useMemo(() => ({
    width: windowSize.width * 2, // 200vw
    height: feedData?.totalHeight || 5000
  }), [windowSize.width, feedData?.totalHeight])

  // 🔥 window resize 이벤트 최적화
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // 디바운스 적용
    const debouncedResize = debounce(handleResize, 100)
    window.addEventListener('resize', debouncedResize)
    return () => window.removeEventListener('resize', debouncedResize)
  }, [])

  // 🔥 디바운스 유틸리티
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(null, args), wait)
    }
  }

  // 캔버스 클릭 처리
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onElementSelect(null)
    }
  }, [onElementSelect])

  // 🔥 요소 드래그 핸들러 최적화
  const handleElementDrag = useCallback((elementId: string, deltaX: number, deltaY: number) => {
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    // 성능을 위해 일정 거리 이상 움직일 때만 업데이트
    const scaledDeltaX = deltaX / viewport.scale
    const scaledDeltaY = deltaY / viewport.scale
    
    if (Math.abs(scaledDeltaX) > 1 || Math.abs(scaledDeltaY) > 1) {
      onElementUpdate(elementId, {
        x: Math.round(element.x + scaledDeltaX),
        y: Math.round(element.y + scaledDeltaY),
      })
    }
  }, [elements, viewport.scale, onElementUpdate])

  // 요소 리사이즈 핸들러
  const handleElementResize = useCallback((elementId: string, width: number, height: number) => {
    onElementUpdate(elementId, { 
      width: Math.max(10, width), // 최소 크기 보장
      height: Math.max(10, height) 
    })
  }, [onElementUpdate])

  // 요소 회전 핸들러
  const handleElementRotate = useCallback((elementId: string, rotation: number) => {
    onElementUpdate(elementId, { rotation: rotation % 360 })
  }, [onElementUpdate])

  // 🔥 요소 렌더링 함수 최적화 (useCallback 적용)
  const renderElement = useCallback((element: FeedElement) => {
    const el = element as SafeElement
    
    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x || 0,
      top: el.y || 0,
      width: el.width || 100,
      height: el.height || 100,
      transform: `rotate(${el.rotation || 0}deg)`,
      zIndex: el.zIndex || 1,
      border: selectedElement === el.id ? '2px solid #3b82f6' : 'none',
      cursor: isDragging ? 'grabbing' : 'pointer',
      borderRadius: '4px',
      overflow: 'hidden',
      userSelect: 'none', // 텍스트 선택 방지
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      onElementSelect(el.id)
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation()
      setDraggedElement(el.id)
      setDragStart({ x: e.clientX, y: e.clientY })
      onElementSelect(el.id)
    }

    // 🔥 키보드 접근성 추가
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (selectedElement !== el.id) return
      
      const step = e.shiftKey ? 10 : 1
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onElementUpdate(el.id, { x: (el.x || 0) - step })
          break
        case 'ArrowRight':
          e.preventDefault()
          onElementUpdate(el.id, { x: (el.x || 0) + step })
          break
        case 'ArrowUp':
          e.preventDefault()
          onElementUpdate(el.id, { y: (el.y || 0) - step })
          break
        case 'ArrowDown':
          e.preventDefault()
          onElementUpdate(el.id, { y: (el.y || 0) + step })
          break
      }
    }

    const commonProps = {
      key: el.id,
      style: commonStyle,
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      onKeyDown: handleKeyDown,
      tabIndex: 0, // 키보드 포커스 가능
      role: "button", // 스크린 리더 지원
      'aria-label': `${el.type} element`,
    }

    const elementType = el.type || 'unknown'

    switch (elementType) {
      case 'PHOTO':
        return (
          <div
            {...commonProps}
            className="bg-gray-200 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <img
              src={el.src || '/api/placeholder/300/200'}
              alt={el.alt || 'Photo'}
              className="w-full h-full object-cover"
              draggable={false}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/api/placeholder/300/200?text=Image+Not+Found'
              }}
            />
            {selectedElement === el.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 border-dashed" />
                {/* 🔥 리사이즈 핸들 추가 */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize" />
              </>
            )}
          </div>
        )

      case 'STICKER':
        return (
          <div
            {...commonProps}
            className="flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <img
              src={el.stickerUrl || '/api/placeholder/80/80?text=🎨'}
              alt="sticker"
              className="w-full h-full object-contain"
              draggable={false}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/api/placeholder/80/80?text=🎨'
              }}
            />
            {selectedElement === el.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize" />
              </>
            )}
          </div>
        )

      case 'TEXT':
        return (
          <div
            {...commonProps}
            style={{
              ...commonStyle,
              fontSize: el.fontSize || 16,
              fontFamily: el.fontFamily || 'Arial, sans-serif',
              color: el.color || '#000000',
              textAlign: el.textAlign || 'left',
              backgroundColor: el.backgroundColor || 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
              padding: '8px',
              lineHeight: 1.2,
            }}
            className="hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="whitespace-pre-wrap break-words">
              {el.content || 'Text'}
            </span>
            {selectedElement === el.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize" />
              </>
            )}
          </div>
        )

      case 'DRAWING':
        return (
          <div
            {...commonProps}
            className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
            dangerouslySetInnerHTML={{ __html: el.svgData || '<svg></svg>' }}
          >
            {selectedElement === el.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize" />
              </>
            )}
          </div>
        )

      default:
        return (
          <div
            {...commonProps}
            className="bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Unknown: {elementType}
            {selectedElement === el.id && (
              <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded" />
            )}
          </div>
        )
    }
  }, [selectedElement, isDragging, onElementSelect, onElementUpdate])

  // 🔥 전역 마우스 이벤트 처리 최적화
  useEffect(() => {
    if (!draggedElement || !dragStart) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      // 쓰로틀링 적용
      requestAnimationFrame(() => {
        handleElementDrag(draggedElement, deltaX, deltaY)
      })
      
      setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleGlobalMouseUp = () => {
      setDraggedElement(null)
      setDragStart(null)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [draggedElement, dragStart, handleElementDrag])

  // 🔥 미니맵 계산 최적화
  const minimapStyle = useMemo(() => {
    const totalWidth = canvasSize.width
    const totalHeight = canvasSize.height
    
    return {
      left: `${Math.max(0, Math.min(100, (-viewport.x / totalWidth) * 100))}%`,
      top: `${Math.max(0, Math.min(100, (-viewport.y / totalHeight) * 100))}%`,
      width: `${Math.min(100, (windowSize.width / viewport.scale / totalWidth) * 100)}%`,
      height: `${Math.min(100, (windowSize.height / viewport.scale / totalHeight) * 100)}%`,
    }
  }, [viewport, canvasSize, windowSize])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        cursor: isDragging ? 'grabbing' : activeTool === 'select' ? 'default' : 'crosshair',
      }}
      role="application"
      aria-label="Feed canvas editor"
    >
      {/* 캔버스 컨테이너 */}
      <div
        ref={canvasRef}
        className="absolute origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: currentBackgroundColor,
          backgroundImage: feedData?.backgroundImageUrl ? `url(${feedData.backgroundImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-color 0.3s ease',
        }}
        onClick={handleCanvasClick}
      >
        {/* 🔥 그리드 배경 최적화 */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: `${50 / viewport.scale}px ${50 / viewport.scale}px`,
          }}
        />

        {/* 피드 요소들 렌더링 */}
        {elements.map(renderElement)}

        {/* 캔버스 경계 표시 */}
        <div
          className="absolute border-2 border-dashed border-gray-400 opacity-30 pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: windowSize.width,
            height: canvasSize.height,
          }}
        />
      </div>

      {/* 🔥 개선된 미니맵 */}
      <div className="absolute bottom-4 right-4 w-32 h-24 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-2 shadow-lg">
        <div className="relative w-full h-full bg-gray-100 rounded overflow-hidden">
          {/* 현재 뷰포트 표시 */}
          <div
            className="absolute bg-blue-500/50 border border-blue-500"
            style={minimapStyle}
          />
          
          {/* 요소들을 미니맵에 표시 */}
          {elements.slice(0, 10).map((element) => (
            <div
              key={element.id}
              className="absolute bg-gray-600 rounded-sm"
              style={{
                left: `${(element.x / canvasSize.width) * 100}%`,
                top: `${(element.y / canvasSize.height) * 100}%`,
                width: `${Math.max(2, (element.width / canvasSize.width) * 100)}%`,
                height: `${Math.max(2, (element.height / canvasSize.height) * 100)}%`,
              }}
            />
          ))}
        </div>
        
        <div className="text-xs text-gray-600 mt-1 text-center">
          {Math.round(viewport.scale * 100)}% | {elements.length} items
        </div>
      </div>

      {/* 🔥 성능 모니터링 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs rounded p-2 space-y-1">
          <div>Scale: {viewport.scale.toFixed(2)}</div>
          <div>X: {viewport.x.toFixed(0)}, Y: {viewport.y.toFixed(0)}</div>
          <div>Elements: {elements.length}</div>
          <div>Selected: {selectedElement || 'None'}</div>
          <div>Tool: {activeTool}</div>
          <div>BG: {currentBackgroundColor}</div>
          <div>Canvas: {canvasSize.width}×{canvasSize.height}</div>
        </div>
      )}
    </div>
  )
}

export default FeedCanvas
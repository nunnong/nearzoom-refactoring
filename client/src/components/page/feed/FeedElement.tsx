'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { FeedElement as FeedElementType } from '@/lib/types/feed'

interface FeedElementProps {
  element: FeedElementType
  isSelected: boolean
  isEditable: boolean
  scale?: number // 🔥 뷰포트 스케일 추가
  onSelect: () => void
  onDrag: (deltaX: number, deltaY: number) => void
  onResize: (width: number, height: number) => void
  onRotate: (rotation: number) => void
  onDelete?: () => void // 🔥 삭제 핸들러 추가
}

// 🔥 리사이즈 핸들 타입 정의
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const FeedElement: React.FC<FeedElementProps> = ({
  element,
  isSelected,
  isEditable,
  scale = 1,
  onSelect,
  onDrag,
  onResize,
  onRotate,
  onDelete,
}) => {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [resizeStart, setResizeStart] = useState<{ 
    x: number; 
    y: number; 
    width: number; 
    height: number;
    handle: ResizeHandle;
  } | null>(null)

  // 🔥 안전한 타입 접근
  const el = element as any

  // 🔥 스타일 메모이제이션
  const baseStyle = useMemo((): React.CSSProperties => ({
    position: 'absolute',
    left: el.x || 0,
    top: el.y || 0,
    width: el.width || 100,
    height: el.height || 100,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.zIndex || 1,
    cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    transformOrigin: 'center center',
  }), [el.x, el.y, el.width, el.height, el.rotation, el.zIndex, isEditable, isDragging])

  // 🔥 마우스 드래그 시작 최적화
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditable) return
    e.stopPropagation()
    onSelect()
    
    const target = e.target as HTMLElement
    if (target.closest('.resize-handle') || target.closest('.rotate-handle')) {
      return // 리사이즈/회전 핸들 클릭은 무시
    }
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })
  }, [isEditable, onSelect])

  // 🔥 리사이즈 핸들별 처리
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    if (!isEditable) return
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: el.width || 100,
      height: el.height || 100,
      handle,
    })
  }, [isEditable, el.width, el.height])

  // 🔥 회전 핸들러 개선
  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    if (!isEditable) return
    e.stopPropagation()
    setIsRotating(true)
    
    const rect = elementRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
    const startRotation = el.rotation || 0
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX)
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI)
      let newRotation = startRotation + deltaAngle
      
      // 🔥 Shift 키로 15도 단위 스냅
      if (moveEvent.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15
      }
      
      onRotate(newRotation)
    }
    
    const handleMouseUp = () => {
      setIsRotating(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [isEditable, el.rotation, onRotate])

  // 🔥 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isSelected || !isEditable) return
    
    const step = e.shiftKey ? 10 : 1
    const sizeStep = e.shiftKey ? 10 : 5
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        onDrag(-step, 0)
        break
      case 'ArrowRight':
        e.preventDefault()
        onDrag(step, 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        onDrag(0, -step)
        break
      case 'ArrowDown':
        e.preventDefault()
        onDrag(0, step)
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        onDelete?.()
        break
      case '=':
      case '+':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onResize((el.width || 100) + sizeStep, (el.height || 100) + sizeStep)
        }
        break
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onResize(Math.max(20, (el.width || 100) - sizeStep), Math.max(20, (el.height || 100) - sizeStep))
        }
        break
    }
  }, [isSelected, isEditable, onDrag, onResize, onDelete, el.width, el.height])

  // 🔥 전역 마우스 이벤트 처리 최적화
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStart) {
        const deltaX = (e.clientX - dragStart.x) / scale
        const deltaY = (e.clientY - dragStart.y) / scale
        onDrag(deltaX, deltaY)
        setDragStart({ x: e.clientX, y: e.clientY })
      }
      
      if (isResizing && resizeStart) {
        const deltaX = (e.clientX - resizeStart.x) / scale
        const deltaY = (e.clientY - resizeStart.y) / scale
        
        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        
        // 🔥 핸들별 리사이즈 처리
        switch (resizeStart.handle) {
          case 'nw':
            newWidth = Math.max(20, resizeStart.width - deltaX)
            newHeight = Math.max(20, resizeStart.height - deltaY)
            break
          case 'n':
            newHeight = Math.max(20, resizeStart.height - deltaY)
            break
          case 'ne':
            newWidth = Math.max(20, resizeStart.width + deltaX)
            newHeight = Math.max(20, resizeStart.height - deltaY)
            break
          case 'e':
            newWidth = Math.max(20, resizeStart.width + deltaX)
            break
          case 'se':
            newWidth = Math.max(20, resizeStart.width + deltaX)
            newHeight = Math.max(20, resizeStart.height + deltaY)
            break
          case 's':
            newHeight = Math.max(20, resizeStart.height + deltaY)
            break
          case 'sw':
            newWidth = Math.max(20, resizeStart.width - deltaX)
            newHeight = Math.max(20, resizeStart.height + deltaY)
            break
          case 'w':
            newWidth = Math.max(20, resizeStart.width - deltaX)
            break
        }
        
        // 🔥 비율 유지 (Shift 키)
        if (e.shiftKey) {
          const ratio = resizeStart.width / resizeStart.height
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / ratio
          } else {
            newWidth = newHeight * ratio
          }
        }
        
        onResize(Math.round(newWidth), Math.round(newHeight))
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setDragStart(null)
      setResizeStart(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeStart, scale, onDrag, onResize])

  // 🔥 키보드 이벤트 등록
  useEffect(() => {
    if (isSelected && isEditable) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSelected, isEditable, handleKeyDown])

  // 🔥 요소 컨텐츠 렌더링 최적화
  const renderElementContent = useMemo(() => {
    const elementType = el.type || 'unknown'

    switch (elementType) {
      case 'PHOTO':
        return (
          <img
            src={el.src || '/api/placeholder/300/200'}
            alt={el.alt || 'Photo'}
            className="w-full h-full object-cover rounded-lg shadow-md"
            draggable={false}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/api/placeholder/300/200?text=Image+Not+Found'
            }}
          />
        )
        
      case 'TEXT':
        return (
          <div
            className="w-full h-full flex items-center p-2 rounded"
            style={{
              fontSize: el.fontSize || 16,
              fontFamily: el.fontFamily || 'Arial, sans-serif',
              color: el.color || '#000000',
              textAlign: el.textAlign || 'left',
              backgroundColor: el.backgroundColor || 'transparent',
              lineHeight: 1.2,
              wordBreak: 'break-word',
              overflow: 'hidden',
              justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            <span className="whitespace-pre-wrap break-words">
              {el.content || 'Text'}
            </span>
          </div>
        )
        
      case 'STICKER':
        return (
          <img
            src={el.stickerUrl || '/api/placeholder/80/80?text=🎨'}
            alt="Sticker"
            className="w-full h-full object-contain hover:scale-105 transition-transform"
            draggable={false}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/api/placeholder/80/80?text=🎨'
            }}
          />
        )
        
      case 'DRAWING':
        return (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: el.svgData || '<svg></svg>' }}
          />
        )
        
      default:
        return (
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm">
            Unknown Element: {elementType}
          </div>
        )
    }
  }, [el])

  // 🔥 리사이즈 핸들 컴포넌트
  const ResizeHandle = ({ position, cursor }: { position: ResizeHandle; cursor: string }) => (
    <div
      className={`resize-handle absolute w-3 h-3 bg-blue-500 border border-white rounded-full hover:scale-125 transition-all duration-200 shadow-md ${
        position.includes('n') ? '-top-1.5' : position.includes('s') ? '-bottom-1.5' : 'top-1/2 -translate-y-1/2'
      } ${
        position.includes('w') ? '-left-1.5' : position.includes('e') ? '-right-1.5' : 'left-1/2 -translate-x-1/2'
      }`}
      style={{ cursor }}
      onMouseDown={(e) => handleResizeStart(e, position)}
      title={`Resize ${position.toUpperCase()}`}
    />
  )

  return (
    <div
      ref={elementRef}
      style={baseStyle}
      onMouseDown={handleMouseDown}
      className={`feed-element group relative ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} ${
        isEditable ? 'hover:ring-1 hover:ring-blue-300' : ''
      }`}
      tabIndex={isEditable ? 0 : -1}
      role="button"
      aria-label={`${el.type || 'unknown'} element`}
      aria-selected={isSelected}
    >
      {/* 실제 컨텐츠 */}
      <div className="feed-element-content w-full h-full">
        {renderElementContent}
      </div>

      {/* 편집 모드일 때만 표시되는 컨트롤들 */}
      {isEditable && isSelected && (
        <>
          {/* 선택 표시 테두리 */}
          <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded pointer-events-none" />
          
          {/* 리사이즈 핸들들 */}
          <ResizeHandle position="nw" cursor="nw-resize" />
          <ResizeHandle position="n" cursor="n-resize" />
          <ResizeHandle position="ne" cursor="ne-resize" />
          <ResizeHandle position="e" cursor="e-resize" />
          <ResizeHandle position="se" cursor="se-resize" />
          <ResizeHandle position="s" cursor="s-resize" />
          <ResizeHandle position="sw" cursor="sw-resize" />
          <ResizeHandle position="w" cursor="w-resize" />

          {/* 회전 핸들 */}
          <div
            className="rotate-handle absolute -top-8 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-green-500 border-2 border-white rounded-full cursor-grab hover:cursor-grabbing hover:scale-125 transition-all duration-200 shadow-lg"
            title="회전 (Shift: 15도 단위)"
            onMouseDown={handleRotateStart}
          >
            <svg className="w-full h-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>

          {/* 🔥 삭제 버튼 추가 */}
          {onDelete && (
            <div
              className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 border-2 border-white rounded-full cursor-pointer hover:scale-110 transition-all duration-200 shadow-lg flex items-center justify-center"
              title="삭제 (Delete/Backspace)"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}

          {/* 요소 정보 표시 */}
          <div className="absolute -top-12 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap shadow-lg">
            <div className="font-medium">{el.type || 'unknown'}</div>
            <div className="opacity-90">
              {Math.round(el.width || 100)}×{Math.round(el.height || 100)}px
              {el.rotation ? ` • ${Math.round(el.rotation)}°` : ''}
            </div>
          </div>

          {/* 🔥 조작 가이드 */}
          <div className="absolute -bottom-8 left-0 text-xs text-gray-500 whitespace-nowrap">
            {isDragging ? '드래그 중...' : isResizing ? '크기 조정 중...' : isRotating ? '회전 중...' : '드래그: 이동 • Shift: 10px 단위'}
          </div>
        </>
      )}

      {/* 호버 효과 (편집 모드가 아닐 때) */}
      {!isEditable && (
        <div className="absolute inset-0 bg-transparent group-hover:bg-blue-500 group-hover:bg-opacity-10 transition-colors pointer-events-none rounded" />
      )}
    </div>
  )
}

export default FeedElement
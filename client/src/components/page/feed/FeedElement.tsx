'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { FeedElement as FeedElementType } from '@/lib/types/feed'

// ✅ 백엔드 연동 API 사용
import { 
  toggleFeedLike,
  getLikeCount,
  checkLikeStatus,
  handleApiError
} from '@/lib/api/feed'

interface FeedElementProps {
  element: FeedElementType
  isSelected: boolean
  isEditable: boolean
  scale?: number
  onSelect: () => void
  onDrag: (deltaX: number, deltaY: number) => void
  onResize: (width: number, height: number) => void
  onRotate: (rotation: number) => void
  onDelete?: () => void
  onUpdate?: (updates: Partial<FeedElementType>) => void
  onLike?: (elementId: string, isLiked: boolean, likeCount: number) => void // 좋아요 상태 변경 콜백
}

// ✅ 리사이즈 핸들 타입 정의
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

// ✅ 타입 가드 함수들
const isPhotoElement = (element: FeedElementType): element is FeedElementType & { photoId: string; src: string; alt?: string } => {
  return element.type === 'PHOTO' && 'photoId' in element
}

const isTextElement = (element: FeedElementType): element is FeedElementType & { 
  content: string; 
  fontSize?: number; 
  fontFamily?: string; 
  color?: string; 
  textAlign?: string; 
  backgroundColor?: string 
} => {
  return element.type === 'TEXT' && 'content' in element
}

const isStickerElement = (element: FeedElementType): element is FeedElementType & { stickerUrl: string } => {
  return element.type === 'STICKER' && 'stickerUrl' in element
}

const isDrawingElement = (element: FeedElementType): element is FeedElementType & { svgData: string } => {
  return element.type === 'DRAWING' && 'svgData' in element
}

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
  onUpdate,
  onLike,
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

  // ✅ 백엔드 연동 좋아요 상태 관리
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)

  // ✅ PHOTO 타입 요소의 좋아요 상태 초기화 (백엔드 API 사용)
  useEffect(() => {
    if (isPhotoElement(element) && element.photoId) {
      initializeLikeStatus()
    }
  }, [element.type, element.id])

  const initializeLikeStatus = async () => {
    if (!isPhotoElement(element) || !element.photoId) return

    try {
      const [isLiked, count] = await Promise.all([
        checkLikeStatus(Number(element.photoId)),
        getLikeCount(Number(element.photoId))
      ])
      
      setLiked(isLiked)
      setLikeCount(count)
    } catch (error) {
      console.error('좋아요 상태 초기화 실패:', error)
    }
  }

  // ✅ 백엔드 API를 사용한 좋아요 처리
  const handleLike = useCallback(async () => {
    if (!isPhotoElement(element) || !element.photoId || likeLoading) return

    setLikeLoading(true)
    const wasLiked = liked
    const prevCount = likeCount

    // 낙관적 업데이트
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1)

    try {
      const result = await toggleFeedLike(Number(element.photoId))
      
      if (result.success && result.data) {
        const { isLiked: newIsLiked, likesCount: newCount } = result.data
        setLiked(newIsLiked)
        setLikeCount(newCount)
        
        // 상위 컴포넌트에 변경 사항 알림
        onLike?.(element.id, newIsLiked, newCount)
      } else {
        throw new Error(result.error || '좋아요 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      
      // 실패시 롤백
      setLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      setLikeLoading(false)
    }
  }, [element, liked, likeCount, likeLoading, onLike])

  // ✅ 스타일 메모이제이션
  const baseStyle = useMemo((): React.CSSProperties => ({
    position: 'absolute',
    left: element.x || 0,
    top: element.y || 0,
    width: element.width || 100,
    height: element.height || 100,
    transform: `rotate(${element.rotation || 0}deg)`,
    zIndex: element.zIndex || 1,
    cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    transformOrigin: 'center center',
  }), [element.x, element.y, element.width, element.height, element.rotation, element.zIndex, isEditable, isDragging])

  // ✅ 마우스 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditable) return
    e.stopPropagation()
    onSelect()
    
    const target = e.target as HTMLElement
    if (target.closest('.resize-handle') || target.closest('.rotate-handle') || target.closest('.action-button')) {
      return
    }
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })
  }, [isEditable, onSelect])

  // ✅ 리사이즈 시작
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    if (!isEditable) return
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width || 100,
      height: element.height || 100,
      handle,
    })
  }, [isEditable, element.width, element.height])

  // ✅ 회전 시작
  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    if (!isEditable) return
    e.stopPropagation()
    setIsRotating(true)
    
    const rect = elementRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
    const startRotation = element.rotation || 0
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX)
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI)
      let newRotation = startRotation + deltaAngle
      
      // Shift 키로 15도 단위 스냅
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
  }, [isEditable, element.rotation, onRotate])

  // ✅ 키보드 이벤트 핸들러
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
          onResize((element.width || 100) + sizeStep, (element.height || 100) + sizeStep)
        }
        break
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onResize(Math.max(20, (element.width || 100) - sizeStep), Math.max(20, (element.height || 100) - sizeStep))
        }
        break
    }
  }, [isSelected, isEditable, onDrag, onResize, onDelete, element.width, element.height])

  // ✅ 전역 마우스 이벤트 처리
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
        
        // 핸들별 리사이즈 처리
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
        
        // 비율 유지 (Shift 키)
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

  // ✅ 키보드 이벤트 등록
  useEffect(() => {
    if (isSelected && isEditable) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSelected, isEditable, handleKeyDown])

  // ✅ 이미지 에러 핸들링
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    if (!target.src.includes('placeholder')) {
      target.src = '/api/placeholder/300/200?text=Image+Not+Found'
    }
  }, [])

  // ✅ 요소 컨텐츠 렌더링 (타입 안전성 개선)
  const renderElementContent = useMemo(() => {
    switch (element.type) {
      case 'PHOTO':
        if (!isPhotoElement(element)) return null
        return (
          <div className="relative w-full h-full">
            <img
              src={element.src || '/api/placeholder/300/200'}
              alt={element.alt || 'Photo'}
              className="w-full h-full object-cover rounded-lg shadow-md"
              draggable={false}
              loading="lazy"
              onError={handleImageError}
            />
            
            {/* 좋아요 기능 (편집 모드가 아닐 때만) */}
            {!isEditable && element.photoId && (
              <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <button
                  className={`action-button p-1 rounded-full transition-colors ${likeLoading ? 'opacity-50' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLike()
                  }}
                  disabled={likeLoading}
                  aria-label={liked ? '좋아요 취소' : '좋아요'}
                >
                  {likeLoading ? (
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className={`w-4 h-4 transition-colors ${
                        liked ? 'text-red-500 fill-current' : 'text-white'
                      }`}
                      fill={liked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                </button>
                {likeCount > 0 && (
                  <span className="text-white text-xs font-medium">
                    {likeCount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
            
            {/* 사진 정보 표시 (개발 모드) */}
            {process.env.NODE_ENV === 'development' && element.photoId && (
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Photo ID: {element.photoId}
              </div>
            )}
          </div>
        )
        
      case 'TEXT':
        if (!isTextElement(element)) return null
        return (
          <div
            className="w-full h-full flex items-center p-2 rounded"
            style={{
              fontSize: element.fontSize || 16,
              fontFamily: element.fontFamily || 'Arial, sans-serif',
              color: element.color || '#000000',
              textAlign: element.textAlign || 'left',
              backgroundColor: element.backgroundColor || 'transparent',
              lineHeight: 1.2,
              wordBreak: 'break-word',
              overflow: 'hidden',
              justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            <span className="whitespace-pre-wrap break-words">
              {element.content || 'Text'}
            </span>
          </div>
        )
        
      case 'STICKER':
        if (!isStickerElement(element)) return null
        return (
          <img
            src={element.stickerUrl || '/api/placeholder/80/80?text=🎨'}
            alt="Sticker"
            className="w-full h-full object-contain hover:scale-105 transition-transform"
            draggable={false}
            loading="lazy"
            onError={handleImageError}
          />
        )
        
      case 'DRAWING':
        if (!isDrawingElement(element)) return null
        return (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: element.svgData || '<svg></svg>' }}
          />
        )
        
      default:
        return (
          <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <div className="font-medium">Unknown Element</div>
              <div className="text-xs opacity-75">{element && 'type' in element ? (element as any).type : 'undefined'}</div>
            </div>
          </div>
        )
    }
  }, [element, isEditable, liked, likeCount, likeLoading, handleLike, handleImageError])

  // ✅ 리사이즈 핸들 컴포넌트
  const ResizeHandle = ({ position, cursor }: { position: ResizeHandle; cursor: string }) => (
    <div
      className={`resize-handle absolute w-3 h-3 bg-blue-500 border border-white rounded-full hover:scale-125 transition-all duration-200 shadow-md z-10 ${
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
      aria-label={`${element.type || 'unknown'} element`}
      aria-selected={isSelected}
    >
      {/* 실제 컨텐츠 */}
      <div className="feed-element-content w-full h-full">
        {renderElementContent}
      </div>

      {/* 편집 모드 컨트롤들 */}
      {isEditable && isSelected && (
        <>
          {/* 선택 표시 테두리 */}
          <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded pointer-events-none z-5" />
          
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
            className="rotate-handle absolute -top-8 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-green-500 border-2 border-white rounded-full cursor-grab hover:cursor-grabbing hover:scale-125 transition-all duration-200 shadow-lg z-10"
            title="회전 (Shift: 15도 단위)"
            onMouseDown={handleRotateStart}
          >
            <svg className="w-full h-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>

          {/* 삭제 버튼 */}
          {onDelete && (
            <div
              className="action-button absolute -top-3 -right-3 w-6 h-6 bg-red-500 border-2 border-white rounded-full cursor-pointer hover:scale-110 transition-all duration-200 shadow-lg flex items-center justify-center z-10"
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
          <div className="absolute -top-12 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap shadow-lg z-10">
            <div className="font-medium">{element.type || 'unknown'}</div>
            <div className="opacity-90">
              {Math.round(element.width || 100)}×{Math.round(element.height || 100)}px
              {element.rotation ? ` • ${Math.round(element.rotation)}°` : ''}
              {isPhotoElement(element) && element.photoId && ` • Photo: ${element.photoId}`}
            </div>
          </div>

          {/* 조작 가이드 */}
          <div className="absolute -bottom-8 left-0 text-xs text-gray-500 whitespace-nowrap z-10">
            {isDragging ? '드래그 중...' : 
             isResizing ? '크기 조정 중...' : 
             isRotating ? '회전 중...' : 
             '드래그: 이동 • Shift: 10px 단위 • Ctrl+±: 크기 조절'}
          </div>
        </>
      )}

      {/* 호버 효과 (편집 모드가 아닐 때) */}
      {!isEditable && (
        <div className="absolute inset-0 bg-transparent group-hover:bg-blue-500 group-hover:bg-opacity-10 transition-colors pointer-events-none rounded" />
      )}

      {/* 접근성 정보 */}
      <div className="sr-only">
        {element.type} element, {element.width}x{element.height} pixels
        {element.rotation && `, rotated ${element.rotation} degrees`}
        {isPhotoElement(element) && liked && ', liked'}
      </div>
    </div>
  )
}

export default FeedElement
'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { FeedElement, CanvasFeedItem, UserFeed } from '@/lib/types/feed'

// ✅ 백엔드 연동 API 사용
import { 
  getFeed, 
  createFeed,
  updateFeed,
  deleteFeed,
  getCurrentUser,
  handleApiError
} from '@/lib/api/feed'

interface FeedCanvasProps {
  userId: string
  elements: FeedElement[]
  viewport: { x: number; y: number; scale: number }
  selectedElement: string | null
  activeTool: string
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  feedData: CanvasFeedItem | UserFeed | null // ✅ Union 타입으로 변경
  backgroundColor?: string
  onElementSelect: (elementId: string | null) => void
  onElementUpdate: (elementId: string, updates: Record<string, any>) => void
  onElementDelete?: (elementId: string) => void
  onWheel: (e: React.WheelEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
  onSave?: () => Promise<void>
  onPublishToFeed?: () => Promise<void>
  onFeedUpdate?: (updatedFeed: CanvasFeedItem) => void
}

// ✅ 타입 가드 함수들 추가
const isCanvasFeedItem = (data: CanvasFeedItem | UserFeed | null): data is CanvasFeedItem => {
  return data !== null && 'authorId' in data && 'photoUrl' in data
}

const isUserFeed = (data: CanvasFeedItem | UserFeed | null): data is UserFeed => {
  return data !== null && 'userId' in data && !('authorId' in data)
}

// ✅ 안전한 Element 타입 정의
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
  onElementDelete,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSave,
  onPublishToFeed,
  onFeedUpdate,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1920, 
    height: typeof window !== 'undefined' ? window.innerHeight : 1080 
  })
  
  // ✅ 저장 및 발행 상태 관리
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  // ✅ feedData 타입에 따른 정보 추출 헬퍼 함수
  const getFeedInfo = useCallback(() => {
    if (isCanvasFeedItem(feedData)) {
      return {
        id: feedData.id,
        photoId: feedData.photoId,
        photoUrl: feedData.photoUrl,
        backgroundColor: feedData.backgroundColor,
        totalHeight: feedData.totalHeight || 5000,
        authorId: feedData.authorId,
        authorName: feedData.authorName
      }
    } else if (isUserFeed(feedData)) {
      return {
        id: feedData.id,
        photoId: feedData.photoId?.toString() || '',
        photoUrl: feedData.photoUrl || '',
        backgroundColor: feedData.backgroundColor,
        totalHeight: feedData.totalHeight || 5000,
        authorId: feedData.userId,
        authorName: feedData.userName || 'Unknown User'
      }
    }
    return null
  }, [feedData])

  const feedInfo = getFeedInfo()

  // ✅ 현재 사용자 정보 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('현재 사용자 정보 로드 실패:', error)
      }
    }
    loadCurrentUser()
  }, [])

  // ✅ 배경색 메모이제이션 (타입 안전하게)
  const currentBackgroundColor = useMemo(() => 
    backgroundColor || feedInfo?.backgroundColor || '#f8fafc'
  , [backgroundColor, feedInfo?.backgroundColor])

  // ✅ 캔버스 크기 계산 메모이제이션 (타입 안전하게)
  const canvasSize = useMemo(() => ({
    width: windowSize.width * 2, // 200vw
    height: feedInfo?.totalHeight || 5000
  }), [windowSize.width, feedInfo?.totalHeight])

  // ✅ 디바운스 유틸리티
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(null, args), wait)
    }
  }, [])

  // ✅ 백엔드 피드 저장 기능 (타입 안전하게)
  const saveFeedToBackend = useCallback(async () => {
    if (!feedInfo || isSaving) return

    setIsSaving(true)
    try {
      const updateData = {
        elements,
        backgroundColor: currentBackgroundColor,
        totalHeight: canvasSize.height,
      }

      const result = await updateFeed(feedInfo.id, updateData)
      
      if (result.success && result.data) {
        setLastSaved(new Date())
        onFeedUpdate?.(result.data)
        console.log('피드 저장 완료')
      } else {
        throw new Error(result.error || '피드 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('피드 저장 실패:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [feedInfo, elements, currentBackgroundColor, canvasSize.height, isSaving, onFeedUpdate])

  // ✅ 자동 저장 기능 (디바운싱)
  const debouncedSave = useMemo(() => 
    debounce(async () => {
      try {
        if (onSave) {
          await onSave()
        } else {
          await saveFeedToBackend()
        }
      } catch (error) {
        console.error('자동 저장 실패:', error)
      }
    }, 2000)
  , [onSave, saveFeedToBackend, debounce])

  // ✅ elements가 변경될 때마다 자동 저장
  useEffect(() => {
    if (elements.length > 0 && feedInfo) {
      debouncedSave()
    }
  }, [elements, feedInfo, debouncedSave])

  // ✅ 피드 발행 핸들러 (백엔드 API 사용) - 타입 안전하게
  const handlePublishToFeed = useCallback(async () => {
    if (!feedInfo?.photoId || isPublishing || !currentUser) {
      console.warn('photoId가 없거나 이미 발행 중이거나 사용자 정보가 없습니다.')
      return
    }

    setIsPublishing(true)
    try {
      // 먼저 현재 상태 저장
      await saveFeedToBackend()

      // 피드로 발행
      if (onPublishToFeed) {
        await onPublishToFeed()
      } else {
        // 기본 발행 로직 - photoId로 새 피드 생성
        const photoIdNum = typeof feedInfo.photoId === 'string' 
          ? parseInt(feedInfo.photoId) 
          : feedInfo.photoId
          
        const result = await createFeed(photoIdNum)
        
        if (result.success && result.data) {
          console.log('피드 발행 완료:', result.data)
          
          // 성공 알림
          if (typeof window !== 'undefined') {
            alert('피드가 성공적으로 발행되었습니다!')
          }
          
          // 발행된 피드 정보 업데이트
          onFeedUpdate?.(result.data)
        } else {
          throw new Error(result.error || '피드 발행에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('피드 발행 실패:', error)
      if (typeof window !== 'undefined') {
        const message = error instanceof Error ? error.message : '피드 발행에 실패했습니다.'
        alert(message)
      }
    } finally {
      setIsPublishing(false)
    }
  }, [feedInfo, isPublishing, currentUser, saveFeedToBackend, onPublishToFeed, onFeedUpdate])

  // ✅ 수동 저장 핸들러
  const handleManualSave = useCallback(async () => {
    try {
      await saveFeedToBackend()
      if (typeof window !== 'undefined') {
        alert('저장되었습니다!')
      }
    } catch (error) {
      console.error('수동 저장 실패:', error)
      if (typeof window !== 'undefined') {
        alert('저장에 실패했습니다.')
      }
    }
  }, [saveFeedToBackend])

  // ✅ window resize 이벤트 최적화
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    const debouncedResize = debounce(handleResize, 100)
    window.addEventListener('resize', debouncedResize)
    return () => window.removeEventListener('resize', debouncedResize)
  }, [debounce])

  // 캔버스 클릭 처리
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onElementSelect(null)
    }
  }, [onElementSelect])

  // ✅ 요소 드래그 핸들러 최적화
  const handleElementDrag = useCallback((elementId: string, deltaX: number, deltaY: number) => {
    const element = elements.find(el => el.id === elementId)
    if (!element) return

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
      width: Math.max(10, width),
      height: Math.max(10, height) 
    })
  }, [onElementUpdate])

  // 요소 회전 핸들러
  const handleElementRotate = useCallback((elementId: string, rotation: number) => {
    onElementUpdate(elementId, { rotation: rotation % 360 })
  }, [onElementUpdate])

  // ✅ 요소 삭제 핸들러
  const handleElementDelete = useCallback((elementId: string) => {
    if (onElementDelete) {
      onElementDelete(elementId)
    }
  }, [onElementDelete])

  // ✅ 이미지 에러 핸들링
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    if (!target.src.includes('placeholder')) {
      target.src = '/api/placeholder/300/200?text=Image+Not+Found'
    }
  }, [])

  // ✅ 요소 렌더링 함수 최적화
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
      userSelect: 'none',
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

    // ✅ 키보드 접근성 및 요소 조작
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
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          handleElementDelete(el.id)
          break
        case '+':
        case '=':
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) {
            const newWidth = (el.width || 100) * 1.1
            const newHeight = (el.height || 100) * 1.1
            handleElementResize(el.id, newWidth, newHeight)
          }
          break
        case '-':
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) {
            const newWidth = (el.width || 100) * 0.9
            const newHeight = (el.height || 100) * 0.9
            handleElementResize(el.id, newWidth, newHeight)
          }
          break
        case 'r':
        case 'R':
          e.preventDefault()
          handleElementRotate(el.id, (el.rotation || 0) + (e.shiftKey ? -15 : 15))
          break
      }
    }

    const commonProps = {
      key: el.id,
      style: commonStyle,
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: "button",
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
              onError={handleImageError}
            />
            {selectedElement === el.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 border-dashed" />
                <div 
                  className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    // 리사이즈 로직 구현
                  }}
                />
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
              onError={handleImageError}
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
  }, [selectedElement, isDragging, onElementSelect, onElementUpdate, handleElementDelete, handleElementResize, handleElementRotate, handleImageError])

  // ✅ 전역 마우스 이벤트 처리
  useEffect(() => {
    if (!draggedElement || !dragStart) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
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

  // ✅ 미니맵 계산 최적화
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
      {/* ✅ 상단 액션 바 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg z-20 flex items-center space-x-3">
        {/* 저장 상태 표시 */}
        <div className="flex items-center space-x-2">
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          )}
          <span className="text-xs text-gray-600">
            {isSaving ? '저장 중...' : lastSaved ? `저장됨 ${lastSaved.toLocaleTimeString()}` : '편집 중'}
          </span>
        </div>
        
        <div className="w-px h-4 bg-gray-300" />
        
        {/* 수동 저장 버튼 */}
        <button
          onClick={handleManualSave}
          disabled={isSaving}
          className="text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors disabled:opacity-50"
        >
          저장
        </button>
        
        <div className="w-px h-4 bg-gray-300" />
        
        {/* 피드 발행 버튼 */}
        <button
          onClick={handlePublishToFeed}
          disabled={isPublishing || elements.length === 0 || !feedInfo?.photoId || !currentUser}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isPublishing ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              <span>발행 중...</span>
            </>
          ) : (
            <span>피드에 발행</span>
          )}
        </button>
      </div>

      {/* 캔버스 컨테이너 */}
      <div
        ref={canvasRef}
        className="absolute origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: currentBackgroundColor,
          backgroundImage: feedInfo?.photoUrl ? `url(${feedInfo.photoUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-color 0.3s ease',
        }}
        onClick={handleCanvasClick}
      >
        {/* 그리드 배경 */}
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

      {/* ✅ 개선된 미니맵 */}
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

      {/* ✅ 키보드 단축키 도움말 */}
      {selectedElement && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs rounded p-2 space-y-1">
          <div className="font-medium">키보드 단축키:</div>
          <div>화살표: 이동 (Shift+화살표: 빠른 이동)</div>
          <div>Delete/Backspace: 삭제</div>
          <div>Ctrl + +/-: 크기 조절</div>
          <div>R: 회전 (Shift+R: 반대 회전)</div>
        </div>
      )}

      {/* ✅ 개발용 정보 패널 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs rounded p-2 space-y-1">
          <div>Scale: {viewport.scale.toFixed(2)}</div>
          <div>X: {viewport.x.toFixed(0)}, Y: {viewport.y.toFixed(0)}</div>
          <div>Elements: {elements.length}</div>
          <div>Selected: {selectedElement || 'None'}</div>
          <div>Tool: {activeTool}</div>
          <div>BG: {currentBackgroundColor}</div>
          <div>Canvas: {canvasSize.width}×{canvasSize.height}</div>
          <div>User: {currentUser?.name || 'Loading...'}</div>
          {feedInfo?.photoId && <div>Photo ID: {feedInfo.photoId}</div>}
          {feedInfo?.id && <div>Feed ID: {feedInfo.id}</div>}
          <div>Feed Type: {isCanvasFeedItem(feedData) ? 'Canvas' : isUserFeed(feedData) ? 'User' : 'None'}</div>
          <div>Last Saved: {lastSaved?.toLocaleTimeString() || 'Never'}</div>
        </div>
      )}
    </div>
  )
}

export default FeedCanvas
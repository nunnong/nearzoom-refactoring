// src/components/ui/InfiniteCanvasViewer.tsx
'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'

// 임시 타입 정의 (실제 타입 파일이 로드되지 않는 경우)
interface CanvasElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex?: number
  
  // 이미지 관련
  src?: string
  imageData?: string
  
  // 텍스트 관련
  text?: string
  content?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  
  // 그리기 관련
  strokeData?: number[]
  strokeWidth?: number
  
  // 스티커 관련
  stickerData?: string
}

// 가상화 훅 임시 구현 (실제 훅이 로드되지 않는 경우)
interface UseVirtualizationProps {
  elements: CanvasElement[]
  viewportWidth: number
  viewportHeight: number
  offsetX: number
  offsetY: number
  scale: number
}

const useVirtualization = ({ elements, viewportWidth, viewportHeight, offsetX, offsetY, scale }: UseVirtualizationProps) => {
  const [visibleElements, setVisibleElements] = useState<CanvasElement[]>(elements)
  
  const updateViewport = useCallback((newOffsetX: number, newOffsetY: number, newScale: number) => {
    // 간단한 가상화: 뷰포트 내의 요소들만 필터링
    const viewport = {
      left: newOffsetX,
      top: newOffsetY,
      right: newOffsetX + viewportWidth / newScale,
      bottom: newOffsetY + viewportHeight / newScale
    }
    
    const visible = elements.filter(element => 
      element.x < viewport.right &&
      element.x + element.width > viewport.left &&
      element.y < viewport.bottom &&
      element.y + element.height > viewport.top
    )
    
    setVisibleElements(visible)
  }, [elements, viewportWidth, viewportHeight])
  
  useEffect(() => {
    updateViewport(offsetX, offsetY, scale)
  }, [offsetX, offsetY, scale, updateViewport])
  
  return { visibleElements, updateViewport }
}

interface InfiniteCanvasViewerProps {
  elements: CanvasElement[]
  viewportWidth: number
  viewportHeight: number
  scale: number
  offsetX: number
  offsetY: number
  onElementClick?: (element: CanvasElement) => void
  onElementMove?: (elementId: string, newX: number, newY: number) => void
  onViewportChange?: (offsetX: number, offsetY: number, scale: number) => void
  className?: string
  enablePanning?: boolean
  enableZooming?: boolean
  minScale?: number
  maxScale?: number
  showGrid?: boolean
}

const InfiniteCanvasViewer: React.FC<InfiniteCanvasViewerProps> = ({
  elements,
  viewportWidth,
  viewportHeight,
  scale,
  offsetX,
  offsetY,
  onElementClick,
  onElementMove,
  onViewportChange,
  className = '',
  enablePanning = true,
  enableZooming = true,
  minScale = 0.1,
  maxScale = 5.0,
  showGrid = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const animationFrameRef = useRef<number | null>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: offsetX, y: offsetY })
  const [draggedElement, setDraggedElement] = useState<CanvasElement | null>(null)
  const [currentCursor, setCurrentCursor] = useState<string>('grab')

  // 가상화를 위한 훅
  const {
    visibleElements,
    updateViewport
  } = useVirtualization({
    elements,
    viewportWidth,
    viewportHeight,
    offsetX,
    offsetY,
    scale
  })

  // 이미지 캐싱
  const getCachedImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const cached = imageCache.current.get(src)
      if (cached) {
        resolve(cached)
        return
      }

      const img = new Image()
      img.onload = () => {
        imageCache.current.set(src, img)
        resolve(img)
      }
      img.onerror = reject
      img.src = src
    })
  }, [])

  // 캔버스 그리기 함수 (RAF 사용)
  const drawCanvas = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 캔버스 클리어
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 변환 매트릭스 설정
      ctx.save()
      ctx.scale(scale, scale)
      ctx.translate(-offsetX, -offsetY)

      // 배경 격자 그리기
      if (showGrid) {
        drawGrid(ctx)
      }

      // 가시적인 요소들만 렌더링
      visibleElements.forEach(element => {
        drawElement(ctx, element)
      })

      ctx.restore()
    })
  }, [visibleElements, scale, offsetX, offsetY, showGrid])

  // 격자 그리기
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const gridSize = 50
    const startX = Math.floor(offsetX / gridSize) * gridSize
    const startY = Math.floor(offsetY / gridSize) * gridSize
    const endX = offsetX + viewportWidth / scale
    const endY = offsetY + viewportHeight / scale

    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1 / scale
    ctx.beginPath()

    // 세로선
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
    }

    // 가로선
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
    }

    ctx.stroke()
  }, [offsetX, offsetY, viewportWidth, viewportHeight, scale])

  // 요소 그리기
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.save()
    ctx.translate(element.x + element.width / 2, element.y + element.height / 2)
    ctx.rotate((element.rotation || 0) * Math.PI / 180)
    ctx.translate(-element.width / 2, -element.height / 2)

    switch (element.type) {
      case 'PHOTO':
      case 'image':
        drawImageElement(ctx, element)
        break
      case 'TEXT':
      case 'text':
        drawTextElement(ctx, element)
        break
      case 'drawing':
        drawDrawingElement(ctx, element)
        break
      case 'sticker':
        drawStickerElement(ctx, element)
        break
      default:
        // 기본 사각형 그리기
        ctx.strokeStyle = '#ccc'
        ctx.strokeRect(0, 0, element.width, element.height)
    }

    ctx.restore()
  }, [])

  // 이미지 요소 그리기
  const drawImageElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    const imageSource = (element as any).src || (element as any).imageData
    if (!imageSource) return

    getCachedImage(imageSource)
      .then(img => {
        ctx.drawImage(img, 0, 0, element.width, element.height)
      })
      .catch(() => {
        // 이미지 로드 실패 시 placeholder
        ctx.strokeStyle = '#ddd'
        ctx.fillStyle = '#f9f9f9'
        ctx.fillRect(0, 0, element.width, element.height)
        ctx.strokeRect(0, 0, element.width, element.height)
        
        ctx.fillStyle = '#999'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('이미지 로드 실패', element.width / 2, element.height / 2)
      })
  }, [getCachedImage])

  // 텍스트 요소 그리기
  const drawTextElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    const text = (element as any).text || (element as any).content || 'Text'
    ctx.font = `${(element as any).fontSize || 16}px ${(element as any).fontFamily || 'Arial'}`
    ctx.fillStyle = (element as any).color || '#000000'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    // 텍스트 줄바꿈 처리
    const lines = text.split('\n')
    const lineHeight = ((element as any).fontSize || 16) * 1.2
    
    lines.forEach((line: string, index: number) => {
      ctx.fillText(line, 0, index * lineHeight)
    })
  }, [])

  // 그리기 요소 그리기
  const drawDrawingElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    const strokeData = (element as any).strokeData
    if (!strokeData || !Array.isArray(strokeData)) return

    ctx.strokeStyle = (element as any).color || '#000000'
    ctx.lineWidth = (element as any).strokeWidth || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    const points = strokeData
    for (let i = 0; i < points.length; i += 2) {
      if (i === 0) {
        ctx.moveTo(points[i], points[i + 1])
      } else {
        ctx.lineTo(points[i], points[i + 1])
      }
    }
    ctx.stroke()
  }, [])

  // 스티커 요소 그리기
  const drawStickerElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    const stickerData = (element as any).stickerData
    if (!stickerData) return

    getCachedImage(stickerData)
      .then(img => {
        ctx.drawImage(img, 0, 0, element.width, element.height)
      })
      .catch(() => {
        // 스티커 로드 실패 시 placeholder
        ctx.strokeStyle = '#ddd'
        ctx.fillStyle = '#f9f9f9'
        ctx.fillRect(0, 0, element.width, element.height)
        ctx.strokeRect(0, 0, element.width, element.height)
      })
  }, [getCachedImage])

  // 마우스 좌표를 캔버스 좌표로 변환
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    const x = (screenX - rect.left) / scale + offsetX
    const y = (screenY - rect.top) / scale + offsetY

    return { x, y }
  }, [scale, offsetX, offsetY])

  // 요소 충돌 검사
  const getElementAt = useCallback((x: number, y: number): CanvasElement | null => {
    // 역순으로 검사 (위에 있는 요소부터)
    for (let i = visibleElements.length - 1; i >= 0; i--) {
      const element = visibleElements[i]
      if (
        x >= element.x &&
        x <= element.x + element.width &&
        y >= element.y &&
        y <= element.y + element.height
      ) {
        return element
      }
    }
    return null
  }, [visibleElements])

  // 포인터 이벤트 핸들러 (마우스 + 터치 통합)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY)
    const element = getElementAt(x, y)

    if (element) {
      setDraggedElement(element)
      setCurrentCursor('move')
      onElementClick?.(element)
    } else if (enablePanning) {
      setIsDragging(true)
      setCurrentCursor('grabbing')
      setDragStart({ x: e.clientX, y: e.clientY })
      setDragOffset({ x: offsetX, y: offsetY })
    }
  }, [screenToCanvas, getElementAt, onElementClick, enablePanning, offsetX, offsetY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggedElement && onElementMove) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY)
      onElementMove(draggedElement.id, x - draggedElement.width / 2, y - draggedElement.height / 2)
    } else if (isDragging && enablePanning) {
      const deltaX = (e.clientX - dragStart.x) / scale
      const deltaY = (e.clientY - dragStart.y) / scale
      const newOffsetX = dragOffset.x - deltaX
      const newOffsetY = dragOffset.y - deltaY
      
      onViewportChange?.(newOffsetX, newOffsetY, scale)
    } else {
      // 호버 상태 커서 업데이트
      const { x, y } = screenToCanvas(e.clientX, e.clientY)
      const element = getElementAt(x, y)
      setCurrentCursor(element ? 'pointer' : 'grab')
    }
  }, [draggedElement, onElementMove, isDragging, enablePanning, screenToCanvas, dragStart, dragOffset, scale, onViewportChange, getElementAt])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setDraggedElement(null)
    setCurrentCursor('grab')
  }, [])

  // 휠 이벤트 (줌)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!enableZooming) return

    e.preventDefault()
    const { x, y } = screenToCanvas(e.clientX, e.clientY)
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor))

    if (newScale !== scale) {
      const newOffsetX = x - (x - offsetX) * (newScale / scale)
      const newOffsetY = y - (y - offsetY) * (newScale / scale)
      onViewportChange?.(newOffsetX, newOffsetY, newScale)
    }
  }, [enableZooming, screenToCanvas, scale, offsetX, offsetY, minScale, maxScale, onViewportChange])

  // 뷰포트 변경시 가상화 업데이트
  useEffect(() => {
    updateViewport(offsetX, offsetY, scale)
  }, [offsetX, offsetY, scale, updateViewport])

  // 캔버스 리렌더링
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // 캔버스 크기 설정
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = viewportWidth * dpr
    canvas.height = viewportHeight * dpr
    canvas.style.width = `${viewportWidth}px`
    canvas.style.height = `${viewportHeight}px`
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [viewportWidth, viewportHeight])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none ${className}`}
      style={{ width: viewportWidth, height: viewportHeight }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="block"
        style={{ cursor: currentCursor }}
      />

      {/* 스케일 표시 */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm pointer-events-none">
        {Math.round(scale * 100)}%
      </div>

      {/* 좌표 표시 */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm pointer-events-none">
        ({Math.round(offsetX)}, {Math.round(offsetY)})
      </div>
    </div>
  )
}

export default InfiniteCanvasViewer
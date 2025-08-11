import { useState, useCallback, useMemo, useRef } from 'react'

// 캔버스 요소 타입 정의
interface CanvasElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex?: number
  
  // 추가 속성들 (타입별로 다를 수 있음)
  [key: string]: any
}

interface UseVirtualizationProps {
  elements: CanvasElement[]
  viewportWidth: number
  viewportHeight: number
  offsetX: number
  offsetY: number
  scale: number
  bufferSize?: number
  enableCulling?: boolean
  enableLOD?: boolean // Level of Detail
  maxRenderDistance?: number
}

interface VirtualizationStats {
  totalElements: number
  visibleElements: number
  culledElements: number
  renderTime: number
  frustumChecks: number
}

interface UseVirtualizationReturn {
  visibleElements: CanvasElement[]
  stats: VirtualizationStats
  updateViewport: (offsetX: number, offsetY: number, scale: number) => void
  forceUpdate: () => void
  setRenderDistance: (distance: number) => void
  toggleCulling: () => void
}

export const useVirtualization = ({
  elements,
  viewportWidth,
  viewportHeight,
  offsetX,
  offsetY,
  scale,
  bufferSize = 100,
  enableCulling = true,
  enableLOD = true,
  maxRenderDistance = 2000
}: UseVirtualizationProps): UseVirtualizationReturn => {
  const [viewport, setViewport] = useState({ offsetX, offsetY, scale })
  const [renderDistance, setRenderDistanceState] = useState(maxRenderDistance)
  const [cullingEnabled, setCullingEnabled] = useState(enableCulling)
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)
  
  // 성능 측정을 위한 refs
  const statsRef = useRef<VirtualizationStats>({
    totalElements: 0,
    visibleElements: 0,
    culledElements: 0,
    renderTime: 0,
    frustumChecks: 0
  })
  const lastUpdateTime = useRef<number>(0)

  // 뷰포트 업데이트
  const updateViewport = useCallback((newOffsetX: number, newOffsetY: number, newScale: number) => {
    setViewport({ 
      offsetX: newOffsetX, 
      offsetY: newOffsetY, 
      scale: newScale 
    })
  }, [])

  // 요소가 뷰포트 내에 있는지 확인 (Frustum Culling)
  const isElementInViewport = useCallback((element: CanvasElement, viewportBounds: {
    left: number
    top: number
    right: number
    bottom: number
  }) => {
    const { x, y, width, height, rotation = 0 } = element
    
    // 회전이 없는 경우 간단한 AABB 체크
    if (rotation === 0) {
      const elementRight = x + width
      const elementBottom = y + height
      
      return !(
        x > viewportBounds.right ||
        elementRight < viewportBounds.left ||
        y > viewportBounds.bottom ||
        elementBottom < viewportBounds.top
      )
    }
    
    // 회전이 있는 경우 더 복잡한 계산
    const centerX = x + width / 2
    const centerY = y + height / 2
    const rad = (rotation * Math.PI) / 180
    
    // 회전된 사각형의 꼭짓점들 계산
    const corners = [
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 2, y: height / 2 },
      { x: -width / 2, y: height / 2 }
    ]
    
    const rotatedCorners = corners.map(corner => ({
      x: centerX + corner.x * Math.cos(rad) - corner.y * Math.sin(rad),
      y: centerY + corner.x * Math.sin(rad) + corner.y * Math.cos(rad)
    }))
    
    // 회전된 사각형의 AABB 계산
    const minX = Math.min(...rotatedCorners.map(c => c.x))
    const maxX = Math.max(...rotatedCorners.map(c => c.x))
    const minY = Math.min(...rotatedCorners.map(c => c.y))
    const maxY = Math.max(...rotatedCorners.map(c => c.y))
    
    return !(
      minX > viewportBounds.right ||
      maxX < viewportBounds.left ||
      minY > viewportBounds.bottom ||
      maxY < viewportBounds.top
    )
  }, [])

  // LOD (Level of Detail) 레벨 계산
  const calculateLOD = useCallback((element: CanvasElement, currentScale: number) => {
    if (!enableLOD) return 'high'
    
    const scaledSize = Math.max(element.width, element.height) * currentScale
    
    if (scaledSize < 50) return 'low'
    if (scaledSize < 200) return 'medium'
    return 'high'
  }, [enableLOD])

  // 요소와 뷰포트 중심점 사이의 거리 계산
  const getDistanceToViewportCenter = useCallback((element: CanvasElement) => {
    const viewportCenterX = viewport.offsetX + viewportWidth / 2
    const viewportCenterY = viewport.offsetY + viewportHeight / 2
    const elementCenterX = element.x + element.width / 2
    const elementCenterY = element.y + element.height / 2
    
    const dx = elementCenterX - viewportCenterX
    const dy = elementCenterY - viewportCenterY
    
    return Math.sqrt(dx * dx + dy * dy)
  }, [viewport, viewportWidth, viewportHeight])

  // 가시적인 요소들 계산 (메모이제이션)
  const visibleElements = useMemo(() => {
    const startTime = performance.now()
    let frustumChecks = 0
    
    // 뷰포트 경계 계산 (버퍼 포함)
    const viewportBounds = {
      left: viewport.offsetX - bufferSize,
      top: viewport.offsetY - bufferSize,
      right: viewport.offsetX + viewportWidth + bufferSize,
      bottom: viewport.offsetY + viewportHeight + bufferSize
    }
    
    const filtered = elements.filter(element => {
      frustumChecks++
      
      // 거리 기반 컬링
      if (cullingEnabled) {
        const distance = getDistanceToViewportCenter(element)
        if (distance > renderDistance) {
          return false
        }
      }
      
      // 뷰포트 내 체크
      const inViewport = isElementInViewport(element, viewportBounds)
      
      return inViewport
    })
    
    // z-index 기준으로 정렬
    const sorted = filtered.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    
    // LOD 정보 추가
    const withLOD = sorted.map(element => ({
      ...element,
      _lod: calculateLOD(element, viewport.scale),
      _distance: getDistanceToViewportCenter(element)
    }))
    
    // 통계 업데이트
    const endTime = performance.now()
    statsRef.current = {
      totalElements: elements.length,
      visibleElements: withLOD.length,
      culledElements: elements.length - withLOD.length,
      renderTime: endTime - startTime,
      frustumChecks
    }
    
    lastUpdateTime.current = endTime
    
    return withLOD
  }, [
    elements,
    viewport,
    viewportWidth,
    viewportHeight,
    bufferSize,
    cullingEnabled,
    renderDistance,
    forceUpdateCounter,
    isElementInViewport,
    calculateLOD,
    getDistanceToViewportCenter
  ])

  // 수동 업데이트
  const forceUpdate = useCallback(() => {
    setForceUpdateCounter(prev => prev + 1)
  }, [])

  // 렌더링 거리 설정
  const setRenderDistance = useCallback((distance: number) => {
    setRenderDistanceState(Math.max(100, Math.min(distance, 10000)))
  }, [])

  // 컬링 토글
  const toggleCulling = useCallback(() => {
    setCullingEnabled(prev => !prev)
  }, [])

  return {
    visibleElements,
    stats: statsRef.current,
    updateViewport,
    forceUpdate,
    setRenderDistance,
    toggleCulling
  }
}

// 2D 공간 분할을 위한 QuadTree 구현 (대용량 요소 처리용)
class QuadTreeNode {
  public children: QuadTreeNode[] = []
  public elements: CanvasElement[] = []
  
  constructor(
    public bounds: { x: number; y: number; width: number; height: number },
    public maxElements: number = 10,
    public maxDepth: number = 5,
    public depth: number = 0
  ) {}
  
  subdivide() {
    const halfWidth = this.bounds.width / 2
    const halfHeight = this.bounds.height / 2
    const x = this.bounds.x
    const y = this.bounds.y
    
    this.children = [
      new QuadTreeNode({ x, y, width: halfWidth, height: halfHeight }, this.maxElements, this.maxDepth, this.depth + 1),
      new QuadTreeNode({ x: x + halfWidth, y, width: halfWidth, height: halfHeight }, this.maxElements, this.maxDepth, this.depth + 1),
      new QuadTreeNode({ x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.maxElements, this.maxDepth, this.depth + 1),
      new QuadTreeNode({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.maxElements, this.maxDepth, this.depth + 1)
    ]
  }
  
  insert(element: CanvasElement): boolean {
    if (!this.contains(element)) {
      return false
    }
    
    if (this.elements.length < this.maxElements && this.children.length === 0) {
      this.elements.push(element)
      return true
    }
    
    if (this.children.length === 0 && this.depth < this.maxDepth) {
      this.subdivide()
    }
    
    if (this.children.length > 0) {
      for (const child of this.children) {
        if (child.insert(element)) {
          return true
        }
      }
    }
    
    this.elements.push(element)
    return true
  }
  
  contains(element: CanvasElement): boolean {
    return (
      element.x >= this.bounds.x &&
      element.x + element.width <= this.bounds.x + this.bounds.width &&
      element.y >= this.bounds.y &&
      element.y + element.height <= this.bounds.y + this.bounds.height
    )
  }
  
  query(range: { x: number; y: number; width: number; height: number }): CanvasElement[] {
    const found: CanvasElement[] = []
    
    if (!this.intersects(range)) {
      return found
    }
    
    for (const element of this.elements) {
      if (this.elementIntersectsRange(element, range)) {
        found.push(element)
      }
    }
    
    for (const child of this.children) {
      found.push(...child.query(range))
    }
    
    return found
  }
  
  private intersects(range: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      range.x > this.bounds.x + this.bounds.width ||
      range.x + range.width < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.height ||
      range.y + range.height < this.bounds.y
    )
  }
  
  private elementIntersectsRange(element: CanvasElement, range: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      element.x > range.x + range.width ||
      element.x + element.width < range.x ||
      element.y > range.y + range.height ||
      element.y + element.height < range.y
    )
  }
}

// QuadTree를 사용한 고성능 가상화 훅 (대용량 데이터용)
export const useQuadTreeVirtualization = ({
  elements,
  viewportWidth,
  viewportHeight,
  offsetX,
  offsetY,
  scale,
  bufferSize = 100
}: UseVirtualizationProps) => {
  const quadTreeRef = useRef<QuadTreeNode | null>(null)
  const [viewport, setViewport] = useState({ offsetX, offsetY, scale })
  
  // QuadTree 재구축
  const rebuildQuadTree = useCallback(() => {
    if (elements.length === 0) {
      quadTreeRef.current = null
      return
    }
    
    // 모든 요소를 포함하는 경계 계산
    const minX = Math.min(...elements.map(e => e.x))
    const minY = Math.min(...elements.map(e => e.y))
    const maxX = Math.max(...elements.map(e => e.x + e.width))
    const maxY = Math.max(...elements.map(e => e.y + e.height))
    
    const bounds = {
      x: minX - bufferSize,
      y: minY - bufferSize,
      width: maxX - minX + bufferSize * 2,
      height: maxY - minY + bufferSize * 2
    }
    
    quadTreeRef.current = new QuadTreeNode(bounds)
    
    for (const element of elements) {
      quadTreeRef.current.insert(element)
    }
  }, [elements, bufferSize])
  
  // 요소가 변경될 때마다 QuadTree 재구축
  useMemo(() => {
    rebuildQuadTree()
  }, [rebuildQuadTree])
  
  // 가시적인 요소들 계산
  const visibleElements = useMemo(() => {
    if (!quadTreeRef.current) return []
    
    const queryRange = {
      x: viewport.offsetX - bufferSize,
      y: viewport.offsetY - bufferSize,
      width: viewportWidth + bufferSize * 2,
      height: viewportHeight + bufferSize * 2
    }
    
    return quadTreeRef.current.query(queryRange)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  }, [viewport, viewportWidth, viewportHeight, bufferSize])
  
  const updateViewport = useCallback((newOffsetX: number, newOffsetY: number, newScale: number) => {
    setViewport({ 
      offsetX: newOffsetX, 
      offsetY: newOffsetY, 
      scale: newScale 
    })
  }, [])
  
  return {
    visibleElements,
    stats: {
      totalElements: elements.length,
      visibleElements: visibleElements.length,
      culledElements: elements.length - visibleElements.length,
      renderTime: 0,
      frustumChecks: 0
    },
    updateViewport,
    forceUpdate: rebuildQuadTree,
    setRenderDistance: () => {},
    toggleCulling: () => {}
  }
}
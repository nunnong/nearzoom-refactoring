// src/lib/utils/virtualization.ts

import { Bounds, Point } from './coordinates'

// feed.ts와 호환되는 CanvasElement 타입
export interface CanvasElement {
  id: string
  type: 'PHOTO' | 'DRAWING' | 'STICKER' | 'TEXT'
  
  // 캔버스 내 위치 & 크기
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  
  // 공통 스타일 속성
  opacity?: number
  
  // 생성/수정 시간
  createdAt: string
  updatedAt: string
  
  // 타입별 데이터
  photoData?: {
    imageUrl: string
    tags: string[]
  }
  
  drawingData?: {
    strokePaths: Array<{
      points: Array<{ x: number; y: number }>
      color: string
      strokeWidth: number
    }>
  }
  
  stickerData?: {
    stickerUrl: string
    stickerType: string
    stickerName: string
  }
  
  textData?: {
    content: string
    fontSize: number
    fontFamily: string
    color: string
    textAlign: 'left' | 'center' | 'right'
    textShadow?: {
      color: string
      blur: number
      offsetX: number
      offsetY: number
    }
  }
}

// 가상화 노드 (쿼드트리용)
export interface VirtualizationNode {
  bounds: Bounds
  elements: CanvasElement[]
  children?: VirtualizationNode[]
  level: number
}

// 가상화 설정
export interface VirtualizationConfig {
  maxElementsPerNode: number
  maxLevels: number
  minNodeSize: number
  viewportPadding: number
}

// 쿼드트리 기반 공간 분할 가상화
export class QuadTreeVirtualizer {
  private config: VirtualizationConfig
  private rootNode: VirtualizationNode | null = null
  private allElements: CanvasElement[] = []

  constructor(config: Partial<VirtualizationConfig> = {}) {
    this.config = {
      maxElementsPerNode: 10,
      maxLevels: 8,
      minNodeSize: 100,
      viewportPadding: 50,
      ...config
    }
  }

  // 요소들로 트리 구축
  buildTree(elements: CanvasElement[], worldBounds: Bounds): void {
    this.allElements = [...elements]
    
    if (elements.length === 0) {
      this.rootNode = null
      return
    }

    this.rootNode = {
      bounds: worldBounds,
      elements: [],
      level: 0
    }

    elements.forEach(element => {
      this.insertElement(element, this.rootNode!)
    })
  }

  // 뷰포트에 보이는 요소들 반환
  getVisibleElements(viewportBounds: Bounds): CanvasElement[] {
    if (!this.rootNode) return []

    const paddedViewport: Bounds = {
      x: viewportBounds.x - this.config.viewportPadding,
      y: viewportBounds.y - this.config.viewportPadding,
      width: viewportBounds.width + this.config.viewportPadding * 2,
      height: viewportBounds.height + this.config.viewportPadding * 2
    }

    const visibleElements: CanvasElement[] = []
    this.queryNode(this.rootNode, paddedViewport, visibleElements)
    
    return visibleElements
  }

  // 요소 삽입
  private insertElement(element: CanvasElement, node: VirtualizationNode): void {
    // 요소가 노드 경계를 벗어나는 경우 처리하지 않음
    if (!this.elementIntersectsNode(element, node)) {
      return
    }

    // 리프 노드이거나 분할 조건에 맞지 않는 경우
    if (!node.children && (
      node.elements.length < this.config.maxElementsPerNode ||
      node.level >= this.config.maxLevels ||
      Math.min(node.bounds.width, node.bounds.height) < this.config.minNodeSize
    )) {
      node.elements.push(element)
      return
    }

    // 자식 노드가 없으면 생성
    if (!node.children) {
      this.subdivideNode(node)
    }

    // 자식 노드에 삽입 시도
    let inserted = false
    node.children!.forEach(child => {
      if (this.elementIntersectsNode(element, child)) {
        this.insertElement(element, child)
        inserted = true
      }
    })

    // 어느 자식에도 완전히 포함되지 않으면 현재 노드에 보관
    if (!inserted) {
      node.elements.push(element)
    }
  }

  // 노드 분할
  private subdivideNode(node: VirtualizationNode): void {
    const { x, y, width, height } = node.bounds
    const halfWidth = width / 2
    const halfHeight = height / 2

    node.children = [
      // 좌상단
      {
        bounds: { x, y, width: halfWidth, height: halfHeight },
        elements: [],
        level: node.level + 1
      },
      // 우상단
      {
        bounds: { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        elements: [],
        level: node.level + 1
      },
      // 좌하단
      {
        bounds: { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        elements: [],
        level: node.level + 1
      },
      // 우하단
      {
        bounds: { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        elements: [],
        level: node.level + 1
      }
    ]
  }

  // 노드 쿼리 (재귀)
  private queryNode(
    node: VirtualizationNode,
    queryBounds: Bounds,
    results: CanvasElement[]
  ): void {
    // 노드가 쿼리 영역과 교차하지 않으면 스킵
    if (!this.boundsIntersect(node.bounds, queryBounds)) {
      return
    }

    // 현재 노드의 요소들 확인
    node.elements.forEach(element => {
      if (this.elementIntersectsBounds(element, queryBounds)) {
        results.push(element)
      }
    })

    // 자식 노드들 재귀 쿼리
    if (node.children) {
      node.children.forEach(child => {
        this.queryNode(child, queryBounds, results)
      })
    }
  }

  // 요소가 노드와 교차하는지 확인
  private elementIntersectsNode(element: CanvasElement, node: VirtualizationNode): boolean {
    return this.boundsIntersect(
      {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      },
      node.bounds
    )
  }

  // 요소가 경계와 교차하는지 확인
  private elementIntersectsBounds(element: CanvasElement, bounds: Bounds): boolean {
    return this.boundsIntersect(
      {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      },
      bounds
    )
  }

  // 두 경계가 교차하는지 확인
  private boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    )
  }

  // 통계 정보 반환
  getStats(): {
    totalNodes: number
    totalElements: number
    maxDepth: number
    averageElementsPerLeaf: number
  } {
    if (!this.rootNode) {
      return { totalNodes: 0, totalElements: 0, maxDepth: 0, averageElementsPerLeaf: 0 }
    }

    let totalNodes = 0
    let maxDepth = 0
    let leafNodes = 0
    let totalElementsInLeaves = 0

    const traverse = (node: VirtualizationNode, depth: number) => {
      totalNodes++
      maxDepth = Math.max(maxDepth, depth)

      if (!node.children) {
        leafNodes++
        totalElementsInLeaves += node.elements.length
      } else {
        node.children.forEach(child => traverse(child, depth + 1))
      }
    }

    traverse(this.rootNode, 0)

    return {
      totalNodes,
      totalElements: this.allElements.length,
      maxDepth,
      averageElementsPerLeaf: leafNodes > 0 ? totalElementsInLeaves / leafNodes : 0
    }
  }

  // 특정 위치의 요소들 검색
  queryPoint(point: Point): CanvasElement[] {
    if (!this.rootNode) return []

    const pointBounds: Bounds = {
      x: point.x,
      y: point.y,
      width: 1,
      height: 1
    }

    const results: CanvasElement[] = []
    this.queryNode(this.rootNode, pointBounds, results)
    return results
  }

  // 영역 내 요소들 검색
  queryRegion(region: Bounds): CanvasElement[] {
    if (!this.rootNode) return []

    const results: CanvasElement[] = []
    this.queryNode(this.rootNode, region, results)
    return results
  }
}

// 레벨별 세부사항 (LOD) 관리
export class LevelOfDetailManager {
  private lodLevels: Map<string, LODLevel[]> = new Map()

  // LOD 레벨 정의
  defineLODLevels(elementType: string, levels: LODLevel[]): void {
    this.lodLevels.set(elementType, levels.sort((a, b) => a.minScale - b.minScale))
  }

  // 현재 스케일에 맞는 LOD 레벨 반환
  getLODLevel(elementType: string, scale: number): LODLevel | null {
    const levels = this.lodLevels.get(elementType)
    if (!levels) return null

    // 스케일에 맞는 가장 높은 품질 레벨 찾기
    for (let i = levels.length - 1; i >= 0; i--) {
      if (scale >= levels[i].minScale) {
        return levels[i]
      }
    }

    return levels[0] // 기본값
  }

  // 요소의 렌더링 품질 결정
  getElementRenderQuality(element: CanvasElement, scale: number): ElementRenderQuality {
    const lodLevel = this.getLODLevel(element.type, scale)
    
    if (!lodLevel) {
      return {
        shouldRender: true,
        quality: 'high',
        simplification: 1.0
      }
    }

    return {
      shouldRender: scale >= lodLevel.minScale,
      quality: lodLevel.quality,
      simplification: Math.min(1.0, scale / lodLevel.optimalScale)
    }
  }

  // 모든 LOD 레벨 가져오기
  getAllLODLevels(): Map<string, LODLevel[]> {
    return new Map(this.lodLevels)
  }

  // LOD 레벨 삭제
  removeLODLevels(elementType: string): void {
    this.lodLevels.delete(elementType)
  }
}

// LOD 레벨 정의
export interface LODLevel {
  minScale: number // 이 레벨이 적용되는 최소 스케일
  optimalScale: number // 최적 스케일
  quality: 'low' | 'medium' | 'high'
  features: LODFeatures
}

export interface LODFeatures {
  showTextures: boolean
  showDetails: boolean
  showShadows: boolean
  maxComplexity: number // 최대 복잡도 (점의 개수 등)
}

export interface ElementRenderQuality {
  shouldRender: boolean
  quality: 'low' | 'medium' | 'high'
  simplification: number // 0~1, 단순화 정도
}

// 뷰포트 기반 가상화 매니저
export class ViewportVirtualizer {
  private quadTree: QuadTreeVirtualizer
  private lodManager: LevelOfDetailManager
  private viewportBounds: Bounds
  private scale: number = 1
  private lastUpdateTime: number = 0
  private updateThrottleMs: number = 16 // ~60fps

  constructor(config?: Partial<VirtualizationConfig>) {
    this.quadTree = new QuadTreeVirtualizer(config)
    this.lodManager = new LevelOfDetailManager()
    this.viewportBounds = { x: 0, y: 0, width: 800, height: 600 }
    
    this.initializeLODLevels()
  }

  // 기본 LOD 레벨 초기화
  private initializeLODLevels(): void {
    // 사진 요소 LOD
    this.lodManager.defineLODLevels('PHOTO', [
      {
        minScale: 0.1,
        optimalScale: 0.5,
        quality: 'low',
        features: { showTextures: false, showDetails: false, showShadows: false, maxComplexity: 10 }
      },
      {
        minScale: 0.5,
        optimalScale: 1.0,
        quality: 'medium',
        features: { showTextures: true, showDetails: false, showShadows: false, maxComplexity: 50 }
      },
      {
        minScale: 1.0,
        optimalScale: 2.0,
        quality: 'high',
        features: { showTextures: true, showDetails: true, showShadows: true, maxComplexity: 200 }
      }
    ])

    // 드로잉 요소 LOD
    this.lodManager.defineLODLevels('DRAWING', [
      {
        minScale: 0.2,
        optimalScale: 0.5,
        quality: 'low',
        features: { showTextures: false, showDetails: false, showShadows: false, maxComplexity: 20 }
      },
      {
        minScale: 0.5,
        optimalScale: 1.0,
        quality: 'medium',
        features: { showTextures: false, showDetails: true, showShadows: false, maxComplexity: 100 }
      },
      {
        minScale: 1.0,
        optimalScale: 3.0,
        quality: 'high',
        features: { showTextures: true, showDetails: true, showShadows: true, maxComplexity: 1000 }
      }
    ])

    // 텍스트 요소 LOD
    this.lodManager.defineLODLevels('TEXT', [
      {
        minScale: 0.3,
        optimalScale: 0.8,
        quality: 'low',
        features: { showTextures: false, showDetails: false, showShadows: false, maxComplexity: 50 }
      },
      {
        minScale: 0.8,
        optimalScale: 1.5,
        quality: 'medium',
        features: { showTextures: false, showDetails: true, showShadows: false, maxComplexity: 200 }
      },
      {
        minScale: 1.5,
        optimalScale: 3.0,
        quality: 'high',
        features: { showTextures: true, showDetails: true, showShadows: true, maxComplexity: 500 }
      }
    ])

    // 스티커 요소 LOD
    this.lodManager.defineLODLevels('STICKER', [
      {
        minScale: 0.2,
        optimalScale: 0.6,
        quality: 'low',
        features: { showTextures: false, showDetails: false, showShadows: false, maxComplexity: 15 }
      },
      {
        minScale: 0.6,
        optimalScale: 1.2,
        quality: 'medium',
        features: { showTextures: true, showDetails: false, showShadows: false, maxComplexity: 75 }
      },
      {
        minScale: 1.2,
        optimalScale: 2.5,
        quality: 'high',
        features: { showTextures: true, showDetails: true, showShadows: true, maxComplexity: 150 }
      }
    ])
  }

  // 뷰포트 업데이트
  updateViewport(bounds: Bounds, scale: number): void {
    const now = performance.now()
    
    // 스로틀링 적용
    if (now - this.lastUpdateTime < this.updateThrottleMs) {
      return
    }

    this.viewportBounds = bounds
    this.scale = scale
    this.lastUpdateTime = now
  }

  // 요소들로 가상화 시스템 초기화
  initialize(elements: CanvasElement[], worldBounds: Bounds): void {
    this.quadTree.buildTree(elements, worldBounds)
  }

  // 렌더링할 요소들 반환
  getElementsToRender(): VirtualizedElement[] {
    const visibleElements = this.quadTree.getVisibleElements(this.viewportBounds)
    
    return visibleElements
      .map(element => {
        const renderQuality = this.lodManager.getElementRenderQuality(element, this.scale)
        
        if (!renderQuality.shouldRender) {
          return null
        }

        return {
          element: this.simplifyElement(element, renderQuality),
          quality: renderQuality.quality,
          simplification: renderQuality.simplification,
          distance: this.calculateElementDistance(element, this.viewportBounds)
        }
      })
      .filter((item): item is VirtualizedElement => item !== null)
      .sort((a, b) => {
        // zIndex 우선, 그 다음 거리
        const zIndexDiff = a.element.zIndex - b.element.zIndex
        if (zIndexDiff !== 0) return zIndexDiff
        return a.distance - b.distance
      })
  }

  // 요소 단순화 (feed.ts 타입에 맞게 수정)
  private simplifyElement(element: CanvasElement, quality: ElementRenderQuality): CanvasElement {
    if (quality.quality === 'high' || quality.simplification >= 1.0) {
      return element
    }

    const simplified = { ...element }

    // 드로잉 요소의 경우 점 개수 줄이기
    if (element.type === 'DRAWING' && element.drawingData?.strokePaths) {
      simplified.drawingData = {
        strokePaths: element.drawingData.strokePaths.map(strokePath => {
          const targetPoints = Math.max(
            2,
            Math.floor(strokePath.points.length * quality.simplification)
          )
          
          if (strokePath.points.length > targetPoints) {
            return {
              ...strokePath,
              points: this.simplifyStrokePoints(strokePath.points, targetPoints)
            }
          }
          
          return strokePath
        })
      }
    }

    // 텍스트 요소의 경우 폰트 크기 조정
    if (element.type === 'TEXT' && element.textData && quality.quality === 'low') {
      simplified.textData = {
        ...element.textData,
        fontSize: Math.max(8, element.textData.fontSize * quality.simplification)
      }
    }

    return simplified
  }

  // 스트로크 점들 단순화
  private simplifyStrokePoints(points: Array<{ x: number; y: number }>, targetCount: number): Array<{ x: number; y: number }> {
    if (points.length <= targetCount) {
      return points
    }

    const step = Math.floor(points.length / targetCount)
    const simplified: Array<{ x: number; y: number }> = []

    for (let i = 0; i < points.length; i += step) {
      simplified.push(points[i])
    }

    // 마지막 점 포함
    if (simplified.length < targetCount && points.length > 0) {
      simplified.push(points[points.length - 1])
    }

    return simplified
  }

  // 요소와 뷰포트 간의 거리 계산
  private calculateElementDistance(element: CanvasElement, viewport: Bounds): number {
    const elementCenter = {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2
    }

    const viewportCenter = {
      x: viewport.x + viewport.width / 2,
      y: viewport.y + viewport.height / 2
    }

    return Math.sqrt(
      Math.pow(elementCenter.x - viewportCenter.x, 2) +
      Math.pow(elementCenter.y - viewportCenter.y, 2)
    )
  }

  // 성능 통계 반환
  getPerformanceStats(): VirtualizationStats {
    const quadTreeStats = this.quadTree.getStats()
    const visibleElements = this.quadTree.getVisibleElements(this.viewportBounds)
    
    return {
      totalElements: quadTreeStats.totalElements,
      visibleElements: visibleElements.length,
      culledElements: quadTreeStats.totalElements - visibleElements.length,
      quadTreeNodes: quadTreeStats.totalNodes,
      maxDepth: quadTreeStats.maxDepth,
      averageElementsPerLeaf: quadTreeStats.averageElementsPerLeaf,
      cullRatio: quadTreeStats.totalElements > 0 
        ? (quadTreeStats.totalElements - visibleElements.length) / quadTreeStats.totalElements 
        : 0
    }
  }

  // 메모리 정리
  cleanup(): void {
    this.quadTree = new QuadTreeVirtualizer()
    this.lodManager = new LevelOfDetailManager()
    this.initializeLODLevels()
  }

  // 설정 업데이트
  updateConfig(config: Partial<VirtualizationConfig>): void {
    this.quadTree = new QuadTreeVirtualizer({ ...this.quadTree['config'], ...config })
  }

  // 특정 위치의 요소 검색
  getElementsAtPoint(point: Point): CanvasElement[] {
    return this.quadTree.queryPoint(point)
  }

  // 영역 내 요소 검색
  getElementsInRegion(region: Bounds): CanvasElement[] {
    return this.quadTree.queryRegion(region)
  }
}

// 가상화된 요소
export interface VirtualizedElement {
  element: CanvasElement
  quality: 'low' | 'medium' | 'high'
  simplification: number
  distance: number
}

// 성능 통계
export interface VirtualizationStats {
  totalElements: number
  visibleElements: number
  culledElements: number
  quadTreeNodes: number
  maxDepth: number
  averageElementsPerLeaf: number
  cullRatio: number // 0~1, 컬링된 비율
}

// 동적 LOD 조정기
export class DynamicLODAdjuster {
  private targetFPS: number = 60
  private currentFPS: number = 60
  private frameTimeHistory: number[] = []
  private historySize: number = 30
  private adjustmentThreshold: number = 0.8 // 목표 FPS의 80% 이하로 떨어지면 조정

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS
  }

  // 프레임 시간 기록
  recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime)
    
    if (this.frameTimeHistory.length > this.historySize) {
      this.frameTimeHistory.shift()
    }

    // 평균 FPS 계산
    const averageFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
    this.currentFPS = 1000 / averageFrameTime
  }

  // LOD 조정이 필요한지 판단
  shouldAdjustLOD(): { adjust: boolean; direction: 'up' | 'down' } {
    if (this.frameTimeHistory.length < this.historySize) {
      return { adjust: false, direction: 'up' }
    }

    const targetThreshold = this.targetFPS * this.adjustmentThreshold

    if (this.currentFPS < targetThreshold) {
      return { adjust: true, direction: 'down' } // 품질 낮추기
    } else if (this.currentFPS > this.targetFPS * 1.2) {
      return { adjust: true, direction: 'up' } // 품질 높이기
    }

    return { adjust: false, direction: 'up' }
  }

  // 적응형 LOD 설정 생성
  getAdaptiveLODConfig(): Partial<VirtualizationConfig> {
    const adjustment = this.shouldAdjustLOD()
    
    if (!adjustment.adjust) {
      return {}
    }

    if (adjustment.direction === 'down') {
      // 성능 향상을 위해 더 적극적인 컬링
      return {
        maxElementsPerNode: 5,
        viewportPadding: 25,
        minNodeSize: 150
      }
    } else {
      // 품질 향상을 위해 덜 적극적인 컬링
      return {
        maxElementsPerNode: 15,
        viewportPadding: 100,
        minNodeSize: 50
      }
    }
  }

  // 현재 성능 정보 반환
  getPerformanceInfo(): {
    currentFPS: number
    targetFPS: number
    performanceRatio: number
    recommendedAction: 'maintain' | 'reduce_quality' | 'increase_quality'
  } {
    const performanceRatio = this.currentFPS / this.targetFPS
    
    let recommendedAction: 'maintain' | 'reduce_quality' | 'increase_quality'
    if (performanceRatio < this.adjustmentThreshold) {
      recommendedAction = 'reduce_quality'
    } else if (performanceRatio > 1.2) {
      recommendedAction = 'increase_quality'
    } else {
      recommendedAction = 'maintain'
    }

    return {
      currentFPS: this.currentFPS,
      targetFPS: this.targetFPS,
      performanceRatio,
      recommendedAction
    }
  }

  // 통계 초기화
  reset(): void {
    this.frameTimeHistory = []
    this.currentFPS = this.targetFPS
  }
}

// 메모리 효율적인 요소 풀링
export class ElementPool {
  private pools: Map<string, CanvasElement[]> = new Map()
  private maxPoolSize: number = 100

  constructor(maxPoolSize: number = 100) {
    this.maxPoolSize = maxPoolSize
  }

  // 요소 빌리기
  borrowElement(type: CanvasElement['type']): CanvasElement | null {
    const pool = this.pools.get(type)
    return pool && pool.length > 0 ? pool.pop()! : null
  }

  // 요소 반환하기
  returnElement(element: CanvasElement): void {
    const type = element.type
    let pool = this.pools.get(type)

    if (!pool) {
      pool = []
      this.pools.set(type, pool)
    }

    if (pool.length < this.maxPoolSize) {
      // 요소 초기화
      this.resetElement(element)
      pool.push(element)
    }
  }

  // 요소 초기화
  private resetElement(element: CanvasElement): void {
    element.x = 0
    element.y = 0
    element.width = 100
    element.height = 100
    element.rotation = 0
    element.opacity = 1
    
    // 타입별 특성 초기화
    switch (element.type) {
      case 'TEXT':
        element.textData = {
          content: '',
          fontSize: 16,
          fontFamily: 'Arial',
          color: '#000000',
          textAlign: 'left'
        }
        break
      case 'DRAWING':
        element.drawingData = {
          strokePaths: []
        }
        break
      case 'PHOTO':
        element.photoData = undefined
        break
      case 'STICKER':
        element.stickerData = undefined
        break
    }
  }

  // 풀 통계
  getPoolStats(): Record<string, { available: number; type: string }> {
    const stats: Record<string, { available: number; type: string }> = {}
    
    this.pools.forEach((pool, type) => {
      stats[type] = {
        available: pool.length,
        type
      }
    })

    return stats
  }

  // 메모리 정리
  cleanup(): void {
    this.pools.clear()
  }

  // 특정 타입의 풀 크기 조정
  resizePool(type: CanvasElement['type'], newSize: number): void {
    const pool = this.pools.get(type)
    if (!pool) return

    if (newSize < pool.length) {
      pool.splice(newSize)
    }
  }
}

// 프레임률 모니터
export class FrameRateMonitor {
  private frameCount: number = 0
  private lastTime: number = performance.now()
  private fps: number = 0
  private callback?: (fps: number) => void
  private fpsHistory: number[] = []
  private maxHistorySize: number = 60

  constructor(callback?: (fps: number) => void) {
    this.callback = callback
  }

  // 프레임 업데이트
  update(): void {
    this.frameCount++
    const currentTime = performance.now()
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = (this.frameCount * 1000) / (currentTime - this.lastTime)
      this.frameCount = 0
      this.lastTime = currentTime
      
      // FPS 히스토리 업데이트
      this.fpsHistory.push(this.fps)
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift()
      }
      
      this.callback?.(this.fps)
    }
  }

  // 현재 FPS 반환
  getFPS(): number {
    return this.fps
  }

  // 평균 FPS 반환
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return this.fps
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
  }

  // 최소 FPS 반환
  getMinFPS(): number {
    if (this.fpsHistory.length === 0) return this.fps
    return Math.min(...this.fpsHistory)
  }

  // 최대 FPS 반환
  getMaxFPS(): number {
    if (this.fpsHistory.length === 0) return this.fps
    return Math.max(...this.fpsHistory)
  }

  // 성능 등급 반환
  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgFPS = this.getAverageFPS()
    if (avgFPS >= 55) return 'excellent'
    if (avgFPS >= 40) return 'good'
    if (avgFPS >= 25) return 'fair'
    return 'poor'
  }

  // FPS 안정성 체크 (표준편차 기반)
  getStability(): 'stable' | 'unstable' | 'very_unstable' {
    if (this.fpsHistory.length < 10) return 'stable'
    
    const avg = this.getAverageFPS()
    const variance = this.fpsHistory.reduce((sum, fps) => sum + Math.pow(fps - avg, 2), 0) / this.fpsHistory.length
    const stdDev = Math.sqrt(variance)
    
    if (stdDev < 5) return 'stable'
    if (stdDev < 15) return 'unstable'
    return 'very_unstable'
  }

  // 통계 초기화
  reset(): void {
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 0
    this.fpsHistory = []
  }
}

// 가상화 최적화 도우미
export class VirtualizationOptimizer {
  // 요소 복잡도 분석 (feed.ts 타입에 맞게 수정)
  static analyzeElementComplexity(element: CanvasElement): number {
    let complexity = 0

    switch (element.type) {
      case 'DRAWING':
        if (element.drawingData?.strokePaths) {
          complexity = element.drawingData.strokePaths.reduce(
            (sum, path) => sum + path.points.length, 0
          )
        }
        break
      case 'TEXT':
        complexity = (element.textData?.content?.length || 0) * 2
        break
      case 'PHOTO':
      case 'STICKER':
        complexity = (element.width * element.height) / 10000 // 픽셀 기반
        break
    }

    // 변환 복잡도 추가
    if (element.rotation && element.rotation !== 0) complexity += 10
    if (element.opacity && element.opacity !== 1) complexity += 5

    return complexity
  }

  // 최적 렌더링 순서 계산
  static calculateRenderOrder(elements: VirtualizedElement[]): VirtualizedElement[] {
    return elements.sort((a, b) => {
      // 1. zIndex 우선
      const zIndexDiff = a.element.zIndex - b.element.zIndex
      if (zIndexDiff !== 0) return zIndexDiff

      // 2. 거리 우선 (가까운 것부터)
      const distanceDiff = a.distance - b.distance
      if (Math.abs(distanceDiff) > 10) return distanceDiff

      // 3. 복잡도 우선 (간단한 것부터)
      const complexityA = this.analyzeElementComplexity(a.element)
      const complexityB = this.analyzeElementComplexity(b.element)
      
      return complexityA - complexityB
    })
  }

  // 배치 렌더링 그룹핑
  static groupElementsForBatchRendering(elements: VirtualizedElement[]): VirtualizedElement[][] {
    const groups: Map<string, VirtualizedElement[]> = new Map()

    elements.forEach(virtualizedElement => {
      const element = virtualizedElement.element
      let colorKey = 'default'
      
      // 타입별 색상 키 추출
      switch (element.type) {
        case 'TEXT':
          colorKey = element.textData?.color || 'default'
          break
        case 'DRAWING':
          if (element.drawingData?.strokePaths?.length) {
            colorKey = element.drawingData.strokePaths[0].color || 'default'
          }
          break
        default:
          colorKey = 'default'
      }
      
      const key = `${element.type}_${virtualizedElement.quality}_${colorKey}`
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      
      groups.get(key)!.push(virtualizedElement)
    })

    return Array.from(groups.values())
  }

  // 메모리 사용량 추정
  static estimateMemoryUsage(elements: CanvasElement[]): number {
    let totalBytes = 0

    elements.forEach(element => {
      // 기본 객체 크기
      totalBytes += 200 // 기본 객체 오버헤드

      switch (element.type) {
        case 'DRAWING':
          if (element.drawingData?.strokePaths) {
            totalBytes += element.drawingData.strokePaths.reduce(
              (sum, path) => sum + path.points.length * 16, // x, y 좌표 각각 8바이트
              0
            )
          }
          break
        case 'TEXT':
          totalBytes += (element.textData?.content?.length || 0) * 2 // UTF-16
          break
        case 'PHOTO':
        case 'STICKER':
          // 이미지 데이터는 별도 계산 (실제로는 더 복잡)
          totalBytes += element.width * element.height * 4 // RGBA
          break
      }
    })

    return totalBytes
  }

  // 렌더링 비용 추정
  static estimateRenderingCost(element: CanvasElement): number {
    const complexity = this.analyzeElementComplexity(element)
    const size = element.width * element.height
    const transformCost = element.rotation !== 0 ? 1.5 : 1.0
    const opacityCost = element.opacity !== undefined && element.opacity !== 1 ? 1.2 : 1.0
    
    return complexity * size * transformCost * opacityCost / 1000000
  }

  // 최적화 제안 생성
  static generateOptimizationSuggestions(
    elements: CanvasElement[], 
    stats: VirtualizationStats
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // 컬링 비율이 낮으면 뷰포트 패딩 조정 제안
    if (stats.cullRatio < 0.3) {
      suggestions.push({
        type: 'viewport_padding',
        severity: 'medium',
        description: '뷰포트 패딩을 줄여 성능을 향상시킬 수 있습니다.',
        expectedImprovement: 'fps_increase'
      })
    }
    
    // 너무 많은 요소가 있으면 LOD 조정 제안
    if (stats.visibleElements > 500) {
      suggestions.push({
        type: 'lod_adjustment',
        severity: 'high',
        description: '가시 요소가 너무 많습니다. LOD 레벨을 조정하세요.',
        expectedImprovement: 'fps_increase'
      })
    }
    
    // 쿼드트리 깊이가 너무 깊으면 조정 제안
    if (stats.maxDepth > 10) {
      suggestions.push({
        type: 'quadtree_config',
        severity: 'medium',
        description: '쿼드트리 최대 레벨을 줄여 메모리 사용량을 개선할 수 있습니다.',
        expectedImprovement: 'memory_usage'
      })
    }
    
    // 복잡한 요소들 감지
    const complexElements = elements.filter(el => this.analyzeElementComplexity(el) > 1000)
    if (complexElements.length > 10) {
      suggestions.push({
        type: 'element_simplification',
        severity: 'high',
        description: `${complexElements.length}개의 복잡한 요소가 감지되었습니다. 단순화를 고려하세요.`,
        expectedImprovement: 'fps_increase'
      })
    }
    
    return suggestions
  }

  // 자동 최적화 적용
  static autoOptimize(
    elements: CanvasElement[],
    targetFPS: number = 60,
    currentFPS: number
  ): VirtualizationConfig {
    const performanceRatio = currentFPS / targetFPS
    
    if (performanceRatio >= 0.9) {
      // 성능이 좋음 - 품질 우선
      return {
        maxElementsPerNode: 15,
        maxLevels: 10,
        minNodeSize: 50,
        viewportPadding: 100
      }
    } else if (performanceRatio >= 0.7) {
      // 성능이 보통 - 균형
      return {
        maxElementsPerNode: 10,
        maxLevels: 8,
        minNodeSize: 100,
        viewportPadding: 50
      }
    } else {
      // 성능이 나쁨 - 성능 우선
      return {
        maxElementsPerNode: 5,
        maxLevels: 6,
        minNodeSize: 150,
        viewportPadding: 25
      }
    }
  }
}

// 최적화 제안 인터페이스
export interface OptimizationSuggestion {
  type: 'viewport_padding' | 'lod_adjustment' | 'quadtree_config' | 'element_simplification'
  severity: 'low' | 'medium' | 'high'
  description: string
  expectedImprovement: 'fps_increase' | 'memory_usage' | 'battery_life'
}

// 성능 프로파일러
export class PerformanceProfiler {
  private samples: PerformanceSample[] = []
  private maxSamples: number = 100
  private isRecording: boolean = false

  startRecording(): void {
    this.isRecording = true
    this.samples = []
  }

  stopRecording(): PerformanceReport {
    this.isRecording = false
    return this.generateReport()
  }

  recordSample(
    renderTime: number,
    elementCount: number,
    visibleElements: number,
    memoryUsage: number
  ): void {
    if (!this.isRecording) return

    this.samples.push({
      timestamp: performance.now(),
      renderTime,
      elementCount,
      visibleElements,
      memoryUsage,
      fps: 1000 / renderTime
    })

    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
  }

  private generateReport(): PerformanceReport {
    if (this.samples.length === 0) {
      return {
        avgFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        avgRenderTime: 0,
        avgVisibleElements: 0,
        peakMemoryUsage: 0,
        frameTimeVariance: 0,
        recommendations: []
      }
    }

    const avgFPS = this.samples.reduce((sum, s) => sum + s.fps, 0) / this.samples.length
    const minFPS = Math.min(...this.samples.map(s => s.fps))
    const maxFPS = Math.max(...this.samples.map(s => s.fps))
    const avgRenderTime = this.samples.reduce((sum, s) => sum + s.renderTime, 0) / this.samples.length
    const avgVisibleElements = this.samples.reduce((sum, s) => sum + s.visibleElements, 0) / this.samples.length
    const peakMemoryUsage = Math.max(...this.samples.map(s => s.memoryUsage))

    // 프레임 시간 분산 계산
    const renderTimes = this.samples.map(s => s.renderTime)
    const meanRenderTime = avgRenderTime
    const variance = renderTimes.reduce((sum, time) => sum + Math.pow(time - meanRenderTime, 2), 0) / renderTimes.length
    const frameTimeVariance = Math.sqrt(variance)

    return {
      avgFPS,
      minFPS,
      maxFPS,
      avgRenderTime,
      avgVisibleElements,
      peakMemoryUsage,
      frameTimeVariance,
      recommendations: this.generateRecommendations(avgFPS, frameTimeVariance, peakMemoryUsage)
    }
  }

  private generateRecommendations(
    avgFPS: number, 
    frameTimeVariance: number, 
    peakMemoryUsage: number
  ): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = []

    if (avgFPS < 30) {
      recommendations.push({
        type: 'lod_adjustment',
        severity: 'high',
        description: '평균 FPS가 30 미만입니다. LOD 레벨을 더 적극적으로 조정하세요.',
        expectedImprovement: 'fps_increase'
      })
    }

    if (frameTimeVariance > 10) {
      recommendations.push({
        type: 'element_simplification',
        severity: 'medium',
        description: '프레임 시간 편차가 큽니다. 복잡한 요소들을 단순화하세요.',
        expectedImprovement: 'fps_increase'
      })
    }

    if (peakMemoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push({
        type: 'viewport_padding',
        severity: 'medium',
        description: '메모리 사용량이 높습니다. 뷰포트 패딩을 줄이거나 요소 풀링을 사용하세요.',
        expectedImprovement: 'memory_usage'
      })
    }

    return recommendations
  }
}

// 성능 샘플 인터페이스
interface PerformanceSample {
  timestamp: number
  renderTime: number
  elementCount: number
  visibleElements: number
  memoryUsage: number
  fps: number
}

// 성능 보고서 인터페이스
export interface PerformanceReport {
  avgFPS: number
  minFPS: number
  maxFPS: number
  avgRenderTime: number
  avgVisibleElements: number
  peakMemoryUsage: number
  frameTimeVariance: number
  recommendations: OptimizationSuggestion[]
}
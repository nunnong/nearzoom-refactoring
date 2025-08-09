// src/lib/utils/coordinates.ts

// 🔥 기본 타입 정의 강화
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
}

export interface Vector2D {
  x: number
  y: number
}

// 🔥 추가 타입 정의
export interface Circle {
  center: Point
  radius: number
}

export interface Line {
  start: Point
  end: Point
}

export interface Polygon {
  points: Point[]
}

export interface ViewportState {
  x: number
  y: number
  scale: number
  width: number
  height: number
}

export interface AnimationOptions {
  duration?: number
  easing?: (t: number) => number
  onUpdate?: (value: any) => void
  onComplete?: () => void
}

// 🔥 상수 정의
export const COORDINATE_CONSTANTS = {
  EPSILON: 1e-10,
  DEFAULT_SNAP_THRESHOLD: 10,
  DEFAULT_GRID_SIZE: 20,
  DEFAULT_ANIMATION_DURATION: 300,
  MIN_SCALE: 0.01,
  MAX_SCALE: 100,
  ANGLE_SNAP_INCREMENTS: [0, 15, 30, 45, 60, 75, 90] as number[],
}

// 🔥 좌표 변환 클래스 (개선)
export class CoordinateTransformer {
  private static matrixCache = new Map<string, DOMMatrix>()

  static createTransformMatrix(transform: Transform): DOMMatrix {
    const cacheKey = `${transform.x.toFixed(2)},${transform.y.toFixed(2)},${transform.scaleX.toFixed(2)},${transform.scaleY.toFixed(2)},${transform.rotation.toFixed(2)}`
    
    if (this.matrixCache.has(cacheKey)) {
      const cached = this.matrixCache.get(cacheKey)
      if (cached) {
        return cached.multiply(new DOMMatrix()) // 복사본 반환
      }
    }

    const matrix = new DOMMatrix()
    matrix.translateSelf(transform.x, transform.y)
    matrix.scaleSelf(transform.scaleX, transform.scaleY)
    matrix.rotateSelf(transform.rotation)
    
    // 캐시 크기 제한
    if (this.matrixCache.size > 100) {
      const keys = Array.from(this.matrixCache.keys())
      const firstKey = keys[0]
      if (firstKey) {
        this.matrixCache.delete(firstKey)
      }
    }
    
    this.matrixCache.set(cacheKey, matrix.multiply(new DOMMatrix()))
    return matrix
  }

  // 점을 변환 (에러 처리 추가)
  static transformPoint(point: Point, matrix: DOMMatrix): Point {
    try {
      if (typeof DOMPoint !== 'undefined') {
        const domPoint = new DOMPoint(point.x, point.y)
        const transformed = matrix.transformPoint(domPoint)
        return { x: transformed.x, y: transformed.y }
      } else {
        // 폴백 구현
        return {
          x: point.x * (matrix as any).a + point.y * (matrix as any).c + (matrix as any).e,
          y: point.x * (matrix as any).b + point.y * (matrix as any).d + (matrix as any).f
        }
      }
    } catch (error) {
      console.warn('Transform point failed, using fallback:', error)
      return point
    }
  }

  // 🔥 다중 점 변환 (성능 최적화)
  static transformPoints(points: Point[], matrix: DOMMatrix): Point[] {
    return points.map(point => this.transformPoint(point, matrix))
  }

  // 역변환 (에러 처리 추가)
  static inverseTransformPoint(point: Point, matrix: DOMMatrix): Point {
    try {
      const inverse = matrix.inverse()
      return this.transformPoint(point, inverse)
    } catch (error) {
      console.warn('Inverse transform failed:', error)
      return point
    }
  }

  // 🔥 바운딩 박스 변환 최적화
  static transformBounds(bounds: Bounds, matrix: DOMMatrix): Bounds {
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height }
    ]

    const transformedCorners = this.transformPoints(corners, matrix)
    const xs = transformedCorners.map(c => c.x)
    const ys = transformedCorners.map(c => c.y)

    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // 🔥 빠른 변환 함수들 (매트릭스 없이)
  static translate(point: Point, offset: Vector2D): Point {
    return {
      x: point.x + offset.x,
      y: point.y + offset.y
    }
  }

  static scale(point: Point, scale: number | { x: number; y: number }, origin: Point = { x: 0, y: 0 }): Point {
    const sx = typeof scale === 'number' ? scale : scale.x
    const sy = typeof scale === 'number' ? scale : scale.y
    
    return {
      x: origin.x + (point.x - origin.x) * sx,
      y: origin.y + (point.y - origin.y) * sy
    }
  }

  static rotate(point: Point, angle: number, origin: Point = { x: 0, y: 0 }): Point {
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const dx = point.x - origin.x
    const dy = point.y - origin.y

    return {
      x: origin.x + dx * cos - dy * sin,
      y: origin.y + dx * sin + dy * cos
    }
  }

  // 🔥 캐시 정리
  static clearCache(): void {
    this.matrixCache.clear()
  }
}

// 🔥 뷰포트 관리 클래스 (개선)
export class ViewportManager {
  private state: ViewportState
  private readonly constraints: {
    minScale: number
    maxScale: number
    bounds?: Bounds
  }
  private animationFrame: number | null = null

  constructor(
    viewportWidth: number, 
    viewportHeight: number,
    constraints: { minScale?: number; maxScale?: number; bounds?: Bounds } = {}
  ) {
    this.state = {
      x: 0,
      y: 0,
      scale: 1,
      width: viewportWidth,
      height: viewportHeight
    }
    
    this.constraints = {
      minScale: constraints.minScale ?? COORDINATE_CONSTANTS.MIN_SCALE,
      maxScale: constraints.maxScale ?? COORDINATE_CONSTANTS.MAX_SCALE,
      bounds: constraints.bounds
    }
  }

  // 🔥 상태 검증 및 제약 적용
  private validateState(): void {
    // 스케일 제약
    this.state.scale = Math.max(
      this.constraints.minScale,
      Math.min(this.constraints.maxScale, this.state.scale)
    )

    // 경계 제약
    if (this.constraints.bounds) {
      const bounds = this.constraints.bounds
      const scaledWidth = this.state.width / this.state.scale
      const scaledHeight = this.state.height / this.state.scale

      this.state.x = Math.max(
        bounds.x,
        Math.min(bounds.x + bounds.width - scaledWidth, this.state.x)
      )
      this.state.y = Math.max(
        bounds.y,
        Math.min(bounds.y + bounds.height - scaledHeight, this.state.y)
      )
    }
  }

  // 기존 메서드들
  setOffset(offsetX: number, offsetY: number): void {
    this.state.x = offsetX
    this.state.y = offsetY
    this.validateState()
  }

  pan(deltaX: number, deltaY: number): void {
    this.state.x += deltaX / this.state.scale
    this.state.y += deltaY / this.state.scale
    this.validateState()
  }

  zoom(factor: number, centerX?: number, centerY?: number): void {
    const newScale = this.state.scale * factor
    this.setScale(newScale, centerX, centerY)
  }

  setScale(scale: number, centerX?: number, centerY?: number): void {
    const newScale = Math.max(this.constraints.minScale, Math.min(this.constraints.maxScale, scale))
    
    if (centerX !== undefined && centerY !== undefined) {
      const worldCenterX = centerX / this.state.scale + this.state.x
      const worldCenterY = centerY / this.state.scale + this.state.y
      
      this.state.x = worldCenterX - centerX / newScale
      this.state.y = worldCenterY - centerY / newScale
    }
    
    this.state.scale = newScale
    this.validateState()
  }

  updateViewportSize(width: number, height: number): void {
    this.state.width = width
    this.state.height = height
  }

  screenToWorld(screenPoint: Point): Point {
    return {
      x: screenPoint.x / this.state.scale + this.state.x,
      y: screenPoint.y / this.state.scale + this.state.y
    }
  }

  worldToScreen(worldPoint: Point): Point {
    return {
      x: (worldPoint.x - this.state.x) * this.state.scale,
      y: (worldPoint.y - this.state.y) * this.state.scale
    }
  }

  isInViewport(bounds: Bounds): boolean {
    const viewportBounds = this.getWorldViewportBounds()
    return GeometryUtils.rectsIntersect(bounds, viewportBounds)
  }

  getWorldViewportBounds(): Bounds {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width / this.state.scale,
      height: this.state.height / this.state.scale
    }
  }

  fitToBounds(bounds: Bounds, padding: number = 50): void {
    const paddedBounds = {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    }

    const scaleX = this.state.width / paddedBounds.width
    const scaleY = this.state.height / paddedBounds.height
    const newScale = Math.min(scaleX, scaleY)

    this.state.scale = Math.max(this.constraints.minScale, Math.min(this.constraints.maxScale, newScale))
    this.state.x = paddedBounds.x - (this.state.width / this.state.scale - paddedBounds.width) / 2
    this.state.y = paddedBounds.y - (this.state.height / this.state.scale - paddedBounds.height) / 2
    this.validateState()
  }

  centerOn(point: Point): void {
    this.state.x = point.x - this.state.width / (2 * this.state.scale)
    this.state.y = point.y - this.state.height / (2 * this.state.scale)
    this.validateState()
  }

  reset(): void {
    this.state.scale = 1
    this.state.x = 0
    this.state.y = 0
  }

  getState(): ViewportState {
    return { ...this.state }
  }

  updateConstraints(constraints: Partial<typeof this.constraints>): void {
    Object.assign(this.constraints, constraints)
    this.validateState()
  }

  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }
}

// 🔥 기하학적 계산 유틸리티
export class GeometryUtils {
  private static distanceCache = new Map<string, number>()

  static distance(p1: Point, p2: Point): number {
    const key = `${p1.x.toFixed(2)},${p1.y.toFixed(2)}-${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
    
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!
    }

    const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    
    if (this.distanceCache.size > 1000) {
      const keys = Array.from(this.distanceCache.keys())
      const firstKey = keys[0]
      if (firstKey) {
        this.distanceCache.delete(firstKey)
      }
    }
    
    this.distanceCache.set(key, distance)
    return distance
  }

  static distanceSquared(p1: Point, p2: Point): number {
    return Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  }

  static manhattanDistance(p1: Point, p2: Point): number {
    return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y)
  }

  static pointInRect(point: Point, rect: Bounds): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    )
  }

  static pointInCircle(point: Point, center: Point, radius: number): boolean {
    return this.distanceSquared(point, center) <= radius * radius
  }

  static rectsIntersect(rect1: Bounds, rect2: Bounds): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    )
  }

  static rectIntersection(rect1: Bounds, rect2: Bounds): Bounds | null {
    if (!this.rectsIntersect(rect1, rect2)) {
      return null
    }

    const x = Math.max(rect1.x, rect2.x)
    const y = Math.max(rect1.y, rect2.y)
    const width = Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - x
    const height = Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - y

    return { x, y, width, height }
  }

  static getBoundingRect(rects: Bounds[]): Bounds | null {
    if (rects.length === 0) return null

    const first = rects[0]
    let minX = first.x
    let minY = first.y
    let maxX = first.x + first.width
    let maxY = first.y + first.height

    for (let i = 1; i < rects.length; i++) {
      const rect = rects[i]
      minX = Math.min(minX, rect.x)
      minY = Math.min(minY, rect.y)
      maxX = Math.max(maxX, rect.x + rect.width)
      maxY = Math.max(maxY, rect.y + rect.height)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  static getBoundingRectFromPoints(points: Point[]): Bounds | null {
    if (points.length === 0) return null

    const first = points[0]
    let minX = first.x
    let minY = first.y
    let maxX = first.x
    let maxY = first.y

    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  static rotatePoint(point: Point, center: Point, angle: number): Point {
    if (angle === 0) return point
    
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const dx = point.x - center.x
    const dy = point.y - center.y

    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    }
  }

  static rotatePoints(points: Point[], center: Point, angle: number): Point[] {
    if (angle === 0) return points
    
    const rad = (angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    return points.map(point => {
      const dx = point.x - center.x
      const dy = point.y - center.y
      return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
      }
    })
  }

  static normalizeAngle(angle: number): number {
    angle = angle % 360
    if (angle > 180) angle -= 360
    if (angle < -180) angle += 360
    return angle
  }

  static angleDifference(angle1: number, angle2: number): number {
    return this.normalizeAngle(angle2 - angle1)
  }

  static angleBetweenPoints(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
  }

  static normalizeVector(vector: Vector2D): Vector2D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    if (length < COORDINATE_CONSTANTS.EPSILON) return { x: 0, y: 0 }
    return { x: vector.x / length, y: vector.y / length }
  }

  static dotProduct(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.x + v1.y * v2.y
  }

  static crossProduct(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.y - v1.y * v2.x
  }

  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
  }

  static lerpPoint(start: Point, end: Point, t: number): Point {
    return {
      x: this.lerp(start.x, end.x, t),
      y: this.lerp(start.y, end.y, t)
    }
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  static pointsEqual(p1: Point, p2: Point, tolerance: number = COORDINATE_CONSTANTS.EPSILON): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
  }

  static clearCache(): void {
    this.distanceCache.clear()
  }
}

// 🔥 스냅핑 유틸리티
export class SnapUtils {
  private static snapCache = new Map<string, Point>()

  static snapToGrid(point: Point, gridSize: number): Point {
    const key = `grid_${point.x.toFixed(2)}_${point.y.toFixed(2)}_${gridSize}`
    
    if (this.snapCache.has(key)) {
      const cached = this.snapCache.get(key)
      if (cached) {
        return cached
      }
    }

    const snapped = {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    }

    if (this.snapCache.size > 1000) {
      const keys = Array.from(this.snapCache.keys())
      const firstKey = keys[0]
      if (firstKey) {
        this.snapCache.delete(firstKey)
      }
    }

    this.snapCache.set(key, snapped)
    return snapped
  }

  static snapToPoints(
    point: Point, 
    snapPoints: Point[], 
    threshold: number = COORDINATE_CONSTANTS.DEFAULT_SNAP_THRESHOLD
  ): Point {
    let closestPoint = point
    let minDistanceSquared = threshold * threshold

    for (const snapPoint of snapPoints) {
      const distanceSquared = GeometryUtils.distanceSquared(point, snapPoint)
      
      if (distanceSquared < minDistanceSquared) {
        minDistanceSquared = distanceSquared
        closestPoint = snapPoint
      }
    }

    return closestPoint
  }

  static snapToAngle(
    angle: number, 
    snapAngles: number[] = COORDINATE_CONSTANTS.ANGLE_SNAP_INCREMENTS,
    threshold: number = 7.5
  ): number {
    let closestAngle = angle
    let minDifference = threshold

    for (const snapAngle of snapAngles) {
      for (let i = 0; i < 4; i++) {
        const testAngle = snapAngle + i * 90
        const difference = Math.abs(GeometryUtils.angleDifference(angle, testAngle))
        
        if (difference < minDifference) {
          minDifference = difference
          closestAngle = testAngle
        }
      }
    }

    return GeometryUtils.normalizeAngle(closestAngle)
  }

  static clearCache(): void {
    this.snapCache.clear()
  }
}

// 🔥 애니메이션 유틸리티
export class AnimationUtils {
  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
  }

  static lerpPoint(start: Point, end: Point, t: number): Point {
    return {
      x: this.lerp(start.x, end.x, t),
      y: this.lerp(start.y, end.y, t)
    }
  }

  static easeInQuad(t: number): number {
    return t * t
  }

  static easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t)
  }

  static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  static easeInCubic(t: number): number {
    return t * t * t
  }

  static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  static easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }

  static spring(
    t: number, 
    tension: number = 120, 
    friction: number = 14,
    mass: number = 1
  ): number {
    const dampingRatio = friction / (2 * Math.sqrt(tension * mass))
    const angularFreq = Math.sqrt(tension / mass)
    
    if (dampingRatio < 1) {
      const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio)
      return 1 - Math.exp(-dampingRatio * angularFreq * t) * 
             Math.cos(dampedFreq * t + Math.acos(dampingRatio))
    } else {
      return 1 - Math.exp(-angularFreq * t) * (1 + angularFreq * t)
    }
  }
}

// 🔥 전역 정리 함수
export function clearAllCaches(): void {
  CoordinateTransformer.clearCache()
  GeometryUtils.clearCache()
  SnapUtils.clearCache()
}

// 🔥 유틸리티 함수들을 하나의 객체로 export
export const CoordinateUtils = {
  // 기본 변환
  translate: CoordinateTransformer.translate,
  scale: CoordinateTransformer.scale,
  rotate: CoordinateTransformer.rotate,
  
  // 거리 계산
  distance: GeometryUtils.distance,
  distanceSquared: GeometryUtils.distanceSquared,
  manhattanDistance: GeometryUtils.manhattanDistance,
  
  // 충돌 감지
  pointInRect: GeometryUtils.pointInRect,
  pointInCircle: GeometryUtils.pointInCircle,
  rectsIntersect: GeometryUtils.rectsIntersect,
  
  // 각도 계산
  angleBetweenPoints: GeometryUtils.angleBetweenPoints,
  normalizeAngle: GeometryUtils.normalizeAngle,
  angleDifference: GeometryUtils.angleDifference,
  
  // 스냅핑
  snapToGrid: SnapUtils.snapToGrid,
  snapToPoints: SnapUtils.snapToPoints,
  snapToAngle: SnapUtils.snapToAngle,
  
  // 애니메이션
  lerp: AnimationUtils.lerp,
  lerpPoint: AnimationUtils.lerpPoint,
  easeOutCubic: AnimationUtils.easeOutCubic,
  easeOutBack: AnimationUtils.easeOutBack,
  
  // 유틸리티
  clamp: GeometryUtils.clamp,
  pointsEqual: GeometryUtils.pointsEqual,
  
  // 정리
  clearCaches: clearAllCaches,
}

// 🔥 기본 export
export default CoordinateUtils
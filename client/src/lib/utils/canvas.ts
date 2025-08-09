// src/lib/utils/canvas.ts

// 캔버스 요소 타입 정의 (feed.ts의 CanvasElement와 호환)
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
  
  // 텍스트 데이터 (새로 추가)
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

// 캔버스 좌표 변환 유틸리티
export class CanvasCoordinates {
  constructor(
    private scale: number,
    private offsetX: number,
    private offsetY: number,
    private canvasWidth: number,
    private canvasHeight: number
  ) {}

  // 화면 좌표를 캔버스 좌표로 변환
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.scale + this.offsetX,
      y: screenY / this.scale + this.offsetY
    }
  }

  // 캔버스 좌표를 화면 좌표로 변환
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: (canvasX - this.offsetX) * this.scale,
      y: (canvasY - this.offsetY) * this.scale
    }
  }

  // 뷰포트 내에 있는지 확인
  isInViewport(element: CanvasElement): boolean {
    const viewportLeft = this.offsetX
    const viewportRight = this.offsetX + this.canvasWidth / this.scale
    const viewportTop = this.offsetY
    const viewportBottom = this.offsetY + this.canvasHeight / this.scale

    return !(
      element.x + element.width < viewportLeft ||
      element.x > viewportRight ||
      element.y + element.height < viewportTop ||
      element.y > viewportBottom
    )
  }

  // 거리 계산
  distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  // 스케일 업데이트
  updateScale(scale: number): void {
    this.scale = scale
  }

  // 오프셋 업데이트
  updateOffset(offsetX: number, offsetY: number): void {
    this.offsetX = offsetX
    this.offsetY = offsetY
  }

  // 현재 설정 가져오기
  getSettings() {
    return {
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight
    }
  }
}

// 캔버스 렌더링 최적화 유틸리티
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D
  private imageCache: Map<string, HTMLImageElement> = new Map()

  constructor(context: CanvasRenderingContext2D) {
    this.ctx = context
  }

  // 이미지 캐싱 및 로드
  async loadImage(src: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)!
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.imageCache.set(src, img)
        resolve(img)
      }
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      img.src = src
    })
  }

  // 요소 렌더링 (feed.ts 타입에 맞게 수정)
  async renderElement(element: CanvasElement): Promise<void> {
    this.ctx.save()
    
    // 변환 적용
    this.ctx.translate(element.x + element.width / 2, element.y + element.height / 2)
    if (element.rotation) {
      this.ctx.rotate((element.rotation * Math.PI) / 180)
    }
    this.ctx.translate(-element.width / 2, -element.height / 2)

    // 투명도 적용
    if (element.opacity !== undefined) {
      this.ctx.globalAlpha = element.opacity
    }

    try {
      switch (element.type) {
        case 'PHOTO':
          await this.renderPhotoElement(element)
          break
        case 'TEXT':
          this.renderTextElement(element)
          break
        case 'DRAWING':
          this.renderDrawingElement(element)
          break
        case 'STICKER':
          await this.renderStickerElement(element)
          break
        default:
          console.warn(`Unknown element type: ${element.type}`)
      }
    } catch (error) {
      console.error('Failed to render element:', error)
      this.renderErrorPlaceholder(element)
    }

    this.ctx.restore()
  }

  // 사진 요소 렌더링
  private async renderPhotoElement(element: CanvasElement): Promise<void> {
    if (!element.photoData?.imageUrl) return

    try {
      const img = await this.loadImage(element.photoData.imageUrl)
      this.ctx.drawImage(img, 0, 0, element.width, element.height)
    } catch (error) {
      console.error('Failed to render photo element:', error)
      this.renderErrorPlaceholder(element)
    }
  }

  // 텍스트 요소 렌더링
  private renderTextElement(element: CanvasElement): void {
    if (!element.textData?.content) return

    const textData = element.textData
    
    this.ctx.font = `${textData.fontSize}px ${textData.fontFamily}`
    this.ctx.fillStyle = textData.color
    this.ctx.textAlign = textData.textAlign || 'left'
    this.ctx.textBaseline = 'top'

    // 텍스트 그림자 효과
    if (textData.textShadow) {
      this.ctx.shadowColor = textData.textShadow.color
      this.ctx.shadowBlur = textData.textShadow.blur
      this.ctx.shadowOffsetX = textData.textShadow.offsetX
      this.ctx.shadowOffsetY = textData.textShadow.offsetY
    }

    // 여러 줄 텍스트 처리
    const lines = textData.content.split('\n')
    const lineHeight = textData.fontSize * 1.2

    lines.forEach((line, index) => {
      let x = 0
      if (textData.textAlign === 'center') {
        x = element.width / 2
      } else if (textData.textAlign === 'right') {
        x = element.width
      }
      
      this.ctx.fillText(line, x, index * lineHeight)
    })

    // 그림자 리셋
    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0
  }

  // 그리기 요소 렌더링
  private renderDrawingElement(element: CanvasElement): void {
    if (!element.drawingData?.strokePaths || element.drawingData.strokePaths.length === 0) return

    for (const strokePath of element.drawingData.strokePaths) {
      if (strokePath.points.length < 2) continue

      this.ctx.strokeStyle = strokePath.color
      this.ctx.lineWidth = strokePath.strokeWidth
      this.ctx.lineCap = 'round'
      this.ctx.lineJoin = 'round'

      this.ctx.beginPath()
      
      // 첫 번째 점으로 이동
      const firstPoint = strokePath.points[0]
      this.ctx.moveTo(firstPoint.x, firstPoint.y)

      // 나머지 점들로 선 그리기
      for (let i = 1; i < strokePath.points.length; i++) {
        const point = strokePath.points[i]
        this.ctx.lineTo(point.x, point.y)
      }

      this.ctx.stroke()
    }
  }

  // 스티커 요소 렌더링
  private async renderStickerElement(element: CanvasElement): Promise<void> {
    if (!element.stickerData?.stickerUrl) return

    try {
      const img = await this.loadImage(element.stickerData.stickerUrl)
      this.ctx.drawImage(img, 0, 0, element.width, element.height)
    } catch (error) {
      console.error('Failed to render sticker element:', error)
      this.renderErrorPlaceholder(element)
    }
  }

  // 에러 플레이스홀더 렌더링
  private renderErrorPlaceholder(element: CanvasElement): void {
    this.ctx.fillStyle = '#f3f4f6'
    this.ctx.fillRect(0, 0, element.width, element.height)
    
    this.ctx.strokeStyle = '#d1d5db'
    this.ctx.strokeRect(0, 0, element.width, element.height)
    
    this.ctx.fillStyle = '#6b7280'
    this.ctx.font = '14px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('로드 실패', element.width / 2, element.height / 2)
  }

  // 모든 요소 렌더링 (zIndex 순서대로)
  async renderElements(elements: CanvasElement[]): Promise<void> {
    // zIndex 순서로 정렬
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)
    
    for (const element of sortedElements) {
      await this.renderElement(element)
    }
  }

  // 캐시 클리어
  clearImageCache(): void {
    this.imageCache.clear()
  }

  // 캐시 상태 확인
  getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.imageCache.size,
      keys: Array.from(this.imageCache.keys())
    }
  }
}

// 캔버스 히트 테스트 (요소 선택 감지)
export class CanvasHitTester {
  // 점이 요소 내부에 있는지 확인
  static hitTestPoint(element: CanvasElement, x: number, y: number): boolean {
    // 회전 고려한 히트 테스트
    if (element.rotation) {
      const centerX = element.x + element.width / 2
      const centerY = element.y + element.height / 2
      const rotatedPoint = this.rotatePoint(x, y, centerX, centerY, -element.rotation)
      x = rotatedPoint.x
      y = rotatedPoint.y
    }

    return (
      x >= element.x &&
      x <= element.x + element.width &&
      y >= element.y &&
      y <= element.y + element.height
    )
  }

  // 점 회전
  private static rotatePoint(x: number, y: number, centerX: number, centerY: number, angle: number): { x: number; y: number } {
    const cos = Math.cos((angle * Math.PI) / 180)
    const sin = Math.sin((angle * Math.PI) / 180)
    const dx = x - centerX
    const dy = y - centerY

    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos
    }
  }

  // 여러 요소 중 가장 위에 있는 요소 찾기 (zIndex 고려)
  static hitTestElements(elements: CanvasElement[], x: number, y: number): CanvasElement | null {
    // zIndex 순서로 정렬 후 역순으로 검사 (위에 있는 요소부터)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex)
    
    for (const element of sortedElements) {
      if (this.hitTestPoint(element, x, y)) {
        return element
      }
    }
    return null
  }

  // 영역 내의 모든 요소 찾기
  static hitTestArea(
    elements: CanvasElement[], 
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number
  ): CanvasElement[] {
    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)
    const minY = Math.min(startY, endY)
    const maxY = Math.max(startY, endY)

    return elements.filter(element => {
      const elementLeft = element.x
      const elementRight = element.x + element.width
      const elementTop = element.y
      const elementBottom = element.y + element.height

      // 영역과 겹치는지 확인
      return !(
        elementRight < minX ||
        elementLeft > maxX ||
        elementBottom < minY ||
        elementTop > maxY
      )
    })
  }
}

// 캔버스 내보내기 유틸리티
export class CanvasExporter {
  static async exportToImage(
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 1.0
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('캔버스 내보내기에 실패했습니다.'))
          }
        },
        `image/${format}`,
        quality
      )
    })
  }

  static exportToDataURL(
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 1.0
  ): string {
    return canvas.toDataURL(`image/${format}`, quality)
  }

  // 고해상도 내보내기
  static async exportHighResolution(
    elements: CanvasElement[],
    width: number,
    height: number,
    backgroundColor: string = '#ffffff',
    scale: number = 2,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 1.0
  ): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    
    // 배경 설정
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // 모든 요소 렌더링
    const renderer = new CanvasRenderer(ctx)
    await renderer.renderElements(elements)
    
    return this.exportToImage(canvas, format, quality)
  }

  // 특정 영역만 내보내기
  static async exportRegion(
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality: number = 1.0
  ): Promise<Blob> {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)
    
    return this.exportToImage(tempCanvas, format, quality)
  }
}

// 캔버스 성능 최적화 유틸리티
export class CanvasOptimizer {
  private static readonly MAX_CACHE_SIZE = 50
  private static renderCache: Map<string, ImageData> = new Map()

  // 요소 캐싱 키 생성
  static generateCacheKey(element: CanvasElement): string {
    const baseKey = `${element.type}_${element.x}_${element.y}_${element.width}_${element.height}_${element.rotation}_${element.zIndex}`
    
    // 타입별 추가 정보
    switch (element.type) {
      case 'PHOTO':
        return `${baseKey}_${element.photoData?.imageUrl || ''}`
      case 'TEXT':
        return `${baseKey}_${element.textData?.content || ''}_${element.textData?.fontSize || ''}_${element.textData?.color || ''}`
      case 'STICKER':
        return `${baseKey}_${element.stickerData?.stickerUrl || ''}`
      case 'DRAWING':
        return `${baseKey}_${element.drawingData?.strokePaths?.length || 0}`
      default:
        return baseKey
    }
  }

  // 캐시된 렌더링 가져오기
  static getCachedRender(key: string): ImageData | null {
    return this.renderCache.get(key) || null
  }

  // 렌더링 결과 캐시
  static setCachedRender(key: string, imageData: ImageData): void {
    if (this.renderCache.size >= this.MAX_CACHE_SIZE) {
      // LRU 방식으로 오래된 항목 삭제
      const firstKey = this.renderCache.keys().next().value
      if (firstKey) {
        this.renderCache.delete(firstKey)
      }
    }
    this.renderCache.set(key, imageData)
  }

  // 캐시 클리어
  static clearRenderCache(): void {
    this.renderCache.clear()
  }

  // 요소가 복잡한지 판단 (캐싱 필요성 판단)
  static isComplexElement(element: CanvasElement): boolean {
    switch (element.type) {
      case 'DRAWING':
        return (element.drawingData?.strokePaths?.length || 0) > 10
      case 'PHOTO':
      case 'STICKER':
        return element.width > 200 || element.height > 200
      case 'TEXT':
        return (element.textData?.content?.length || 0) > 50
      default:
        return false
    }
  }

  // 뷰포트 내 요소만 필터링 (성능 최적화)
  static filterVisibleElements(
    elements: CanvasElement[],
    coordinates: CanvasCoordinates
  ): CanvasElement[] {
    return elements.filter(element => coordinates.isInViewport(element))
  }
}

// 캔버스 이벤트 처리 유틸리티
export class CanvasEventHandler {
  private canvas: HTMLCanvasElement
  private coordinates: CanvasCoordinates

  constructor(canvas: HTMLCanvasElement, coordinates: CanvasCoordinates) {
    this.canvas = canvas
    this.coordinates = coordinates
  }

  // 마우스/터치 이벤트에서 캔버스 좌표 추출
  getCanvasCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if (event instanceof MouseEvent) {
      clientX = event.clientX
      clientY = event.clientY
    } else {
      const touch = event.touches[0] || event.changedTouches[0]
      if (!touch) return { x: 0, y: 0 }
      clientX = touch.clientX
      clientY = touch.clientY
    }

    const screenX = clientX - rect.left
    const screenY = clientY - rect.top

    return this.coordinates.screenToCanvas(screenX, screenY)
  }

  // 드래그 거리 계산
  calculateDragDistance(startX: number, startY: number, endX: number, endY: number): number {
    return Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
  }

  // 제스처 감지 (줌, 회전 등)
  detectGesture(touches: TouchList): {
    type: 'none' | 'pan' | 'zoom' | 'rotate'
    center?: { x: number; y: number }
    scale?: number
    rotation?: number
  } {
    if (touches.length === 1) {
      return { type: 'pan' }
    } else if (touches.length === 2) {
      const touch1 = touches[0]
      const touch2 = touches[1]
      
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * (180 / Math.PI)

      return {
        type: 'zoom',
        center: { x: centerX, y: centerY },
        scale: distance,
        rotation: angle
      }
    }

    return { type: 'none' }
  }

  // 요소 선택 처리
  handleElementSelection(
    event: MouseEvent | TouchEvent,
    elements: CanvasElement[]
  ): CanvasElement | null {
    const coords = this.getCanvasCoordinates(event)
    return CanvasHitTester.hitTestElements(elements, coords.x, coords.y)
  }
}

// 캔버스 실행취소/재실행 관리
export class CanvasHistory {
  private history: CanvasElement[][] = []
  private currentIndex: number = -1
  private maxHistorySize: number = 50

  constructor(maxSize: number = 50) {
    this.maxHistorySize = maxSize
  }

  // 현재 상태 저장
  saveState(elements: CanvasElement[]): void {
    // 현재 위치 이후의 히스토리 제거
    this.history = this.history.slice(0, this.currentIndex + 1)
    
    // 새 상태 추가 (deep copy)
    this.history.push(JSON.parse(JSON.stringify(elements)))
    this.currentIndex++

    // 최대 크기 제한
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.currentIndex--
    }
  }

  // 실행취소
  undo(): CanvasElement[] | null {
    if (this.canUndo()) {
      this.currentIndex--
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }

  // 재실행
  redo(): CanvasElement[] | null {
    if (this.canRedo()) {
      this.currentIndex++
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }

  // 실행취소 가능 여부
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  // 재실행 가능 여부
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  // 히스토리 초기화
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  // 현재 상태 정보
  getState(): { canUndo: boolean; canRedo: boolean; historySize: number; currentIndex: number } {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historySize: this.history.length,
      currentIndex: this.currentIndex
    }
  }

  // 특정 상태로 이동
  goToState(index: number): CanvasElement[] | null {
    if (index >= 0 && index < this.history.length) {
      this.currentIndex = index
      return JSON.parse(JSON.stringify(this.history[index]))
    }
    return null
  }
}

// 캔버스 변환 헬퍼 유틸리티
export class CanvasTransformHelper {
  // 요소 이동
  static moveElement(element: CanvasElement, deltaX: number, deltaY: number): CanvasElement {
    return {
      ...element,
      x: element.x + deltaX,
      y: element.y + deltaY,
      updatedAt: new Date().toISOString()
    }
  }

  // 요소 크기 조정
  static resizeElement(
    element: CanvasElement, 
    newWidth: number, 
    newHeight: number,
    maintainAspectRatio: boolean = false
  ): CanvasElement {
    let width = newWidth
    let height = newHeight

    if (maintainAspectRatio) {
      const aspectRatio = element.width / element.height
      if (newWidth / newHeight > aspectRatio) {
        width = newHeight * aspectRatio
      } else {
        height = newWidth / aspectRatio
      }
    }

    return {
      ...element,
      width: Math.max(1, width),
      height: Math.max(1, height),
      updatedAt: new Date().toISOString()
    }
  }

  // 요소 회전
  static rotateElement(element: CanvasElement, angle: number): CanvasElement {
    return {
      ...element,
      rotation: (element.rotation + angle) % 360,
      updatedAt: new Date().toISOString()
    }
  }

  // 요소 복제
  static duplicateElement(element: CanvasElement, offsetX: number = 10, offsetY: number = 10): CanvasElement {
    return {
      ...element,
      id: `${element.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: element.x + offsetX,
      y: element.y + offsetY,
      zIndex: element.zIndex + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  // 요소들을 그룹 중심으로 정렬
  static alignElements(elements: CanvasElement[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): CanvasElement[] {
    if (elements.length < 2) return elements

    const bounds = this.getElementsBounds(elements)

    return elements.map(element => {
      let newX = element.x
      let newY = element.y

      switch (alignment) {
        case 'left':
          newX = bounds.minX
          break
        case 'center':
          newX = bounds.centerX - element.width / 2
          break
        case 'right':
          newX = bounds.maxX - element.width
          break
        case 'top':
          newY = bounds.minY
          break
        case 'middle':
          newY = bounds.centerY - element.height / 2
          break
        case 'bottom':
          newY = bounds.maxY - element.height
          break
      }

      return {
        ...element,
        x: newX,
        y: newY,
        updatedAt: new Date().toISOString()
      }
    })
  }

  // 요소들의 경계 계산
  static getElementsBounds(elements: CanvasElement[]): {
    minX: number
    maxX: number
    minY: number
    maxY: number
    centerX: number
    centerY: number
    width: number
    height: number
  } {
    if (elements.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0, width: 0, height: 0 }
    }

    const bounds = elements.reduce((acc, element) => {
      const elementRight = element.x + element.width
      const elementBottom = element.y + element.height
      
      return {
        minX: Math.min(acc.minX, element.x),
        maxX: Math.max(acc.maxX, elementRight),
        minY: Math.min(acc.minY, element.y),
        maxY: Math.max(acc.maxY, elementBottom)
      }
    }, {
      minX: elements[0].x,
      maxX: elements[0].x + elements[0].width,
      minY: elements[0].y,
      maxY: elements[0].y + elements[0].height
    })

    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    const centerX = bounds.minX + width / 2
    const centerY = bounds.minY + height / 2

    return {
      ...bounds,
      centerX,
      centerY,
      width,
      height
    }
  }

  // 요소들을 균등하게 분배
  static distributeElements(
    elements: CanvasElement[], 
    direction: 'horizontal' | 'vertical'
  ): CanvasElement[] {
    if (elements.length < 3) return elements

    const sortedElements = [...elements].sort((a, b) => {
      return direction === 'horizontal' ? a.x - b.x : a.y - b.y
    })

    const first = sortedElements[0]
    const last = sortedElements[sortedElements.length - 1]
    
    const totalDistance = direction === 'horizontal' 
      ? (last.x + last.width) - first.x
      : (last.y + last.height) - first.y
    
    const gap = totalDistance / (elements.length - 1)

    return sortedElements.map((element, index) => {
      if (index === 0 || index === sortedElements.length - 1) {
        return element // 첫 번째와 마지막은 그대로
      }

      const newPosition = direction === 'horizontal'
        ? first.x + gap * index
        : first.y + gap * index

      return {
        ...element,
        x: direction === 'horizontal' ? newPosition : element.x,
        y: direction === 'vertical' ? newPosition : element.y,
        updatedAt: new Date().toISOString()
      }
    })
  }
}
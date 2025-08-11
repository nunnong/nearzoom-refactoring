import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

// 임시 타입 정의 (실제 타입 파일이 없는 경우)
interface BaseFeedElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  createdAt: string
  updatedAt: string
}

interface PhotoElement extends BaseFeedElement {
  type: 'PHOTO'
  photoId: string
  src: string
  alt: string
}

interface StickerElement extends BaseFeedElement {
  type: 'STICKER'
  stickerUrl: string
  stickerType: 'emoji' | 'custom' | 'default'
}

interface TextElement extends BaseFeedElement {
  type: 'TEXT'
  content: string
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor?: string
  textAlign: 'left' | 'center' | 'right'
}

interface DrawingElement extends BaseFeedElement {
  type: 'DRAWING'
  svgData: string
  strokeWidth: number
  strokeColor: string
}

type FeedElement = PhotoElement | StickerElement | TextElement | DrawingElement

interface UserFeed {
  id: string
  userId: string
  name: string
  description: string
  isPublic: boolean
  backgroundColor: string
  backgroundImageUrl?: string
  totalHeight: number
  followersCount: number
  likesCount: number
  isFollowing: boolean
  isLiked: boolean
  createdAt: string
  updatedAt: string
}

interface UseFeedEditorOptions {
  userId: string
  initialScale?: number
  autoSaveInterval?: number
  maxHistorySize?: number
  gridSize?: number
  enableSnapToGrid?: boolean
}

interface ViewportState {
  x: number
  y: number
  scale: number
}

interface HistoryState {
  elements: FeedElement[]
  feedData: UserFeed | null
  timestamp: number
}

interface EditorState {
  selectedElementId: string | null
  selectedElementIds: string[]
  clipboardData: FeedElement | null
  tool: 'select' | 'draw' | 'text' | 'photo' | 'sticker'
  isMultiSelecting: boolean
}

interface GridSettings {
  size: number
  enabled: boolean
  visible: boolean
}

// 🔥 디바운스 유틸리티
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }
}

// 🔥 쓰로틀 유틸리티
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean
  return (...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export const useFeedEditor = ({ 
  userId, 
  initialScale = 1,
  autoSaveInterval = 3000,
  maxHistorySize = 50,
  gridSize = 20,
  enableSnapToGrid = false
}: UseFeedEditorOptions) => {
  // 🔥 기본 상태들
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    scale: initialScale,
  })
  
  const [elements, setElements] = useState<FeedElement[]>([])
  const [feedData, setFeedData] = useState<UserFeed | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 🔥 확장된 에디터 상태
  const [editorState, setEditorState] = useState<EditorState>({
    selectedElementId: null,
    selectedElementIds: [],
    clipboardData: null,
    tool: 'select',
    isMultiSelecting: false
  })
  
  // 🔥 그리드 설정
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    size: gridSize,
    enabled: enableSnapToGrid,
    visible: false
  })
  
  // 🔥 히스토리 관리
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // 🔥 Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const isInternalUpdate = useRef(false)
  const lastWheelTime = useRef(0)

  // 🔥 스냅 함수
  const snapToGridValue = useCallback((value: number) => {
    if (!gridSettings.enabled) return value
    return Math.round(value / gridSettings.size) * gridSettings.size
  }, [gridSettings.enabled, gridSettings.size])

  // 🔥 히스토리에 현재 상태 저장
  const saveToHistory = useCallback((newElements?: FeedElement[], newFeedData?: UserFeed | null) => {
    if (isInternalUpdate.current) return
    
    const state: HistoryState = {
      elements: newElements || elements,
      feedData: newFeedData || feedData,
      timestamp: Date.now()
    }
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(state)
      
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize)
      }
      
      return newHistory
    })
    
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1))
  }, [elements, feedData, historyIndex, maxHistorySize])

  // 🔥 실행 취소/재실행
  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    
    isInternalUpdate.current = true
    const prevState = history[historyIndex - 1]
    setElements(prevState.elements)
    setFeedData(prevState.feedData)
    setHistoryIndex(prev => prev - 1)
    setHasUnsavedChanges(true)
    isInternalUpdate.current = false
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    
    isInternalUpdate.current = true
    const nextState = history[historyIndex + 1]
    setElements(nextState.elements)
    setFeedData(nextState.feedData)
    setHistoryIndex(prev => prev + 1)
    setHasUnsavedChanges(true)
    isInternalUpdate.current = false
  }, [history, historyIndex])

  // 🔥 피드 데이터 로드
  useEffect(() => {
    const loadFeedData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockFeed: UserFeed = {
          id: `feed-${userId}`,
          userId: userId,
          name: '내 소중한 다이어리 ✨',
          description: '일상의 소중한 순간들을 기록하는 공간입니다',
          isPublic: true,
          backgroundColor: '#fef7f0',
          backgroundImageUrl: undefined,
          totalHeight: 5000,
          followersCount: 42,
          likesCount: 128,
          isFollowing: false,
          isLiked: false,
          createdAt: '2024-01-15',
          updatedAt: '2024-08-07',
        }
        
        const mockElements: FeedElement[] = [
          {
            id: 'element-1',
            type: 'PHOTO',
            x: 100,
            y: 100,
            width: 300,
            height: 200,
            rotation: 0,
            zIndex: 1,
            photoId: 'photo1',
            src: '/api/placeholder/300/200?seed=1',
            alt: 'Beautiful sunset',
            createdAt: '2024-08-01',
            updatedAt: '2024-08-01',
          } as PhotoElement,
          {
            id: 'element-2',
            type: 'TEXT',
            x: 450,
            y: 120,
            width: 200,
            height: 50,
            rotation: 0,
            zIndex: 2,
            content: '오늘은 정말 좋은 날이었어! ✨',
            fontSize: 18,
            fontFamily: 'Arial, sans-serif',
            color: '#1f2937',
            textAlign: 'left',
            createdAt: '2024-08-01',
            updatedAt: '2024-08-01',
          } as TextElement,
        ]
        
        setFeedData(mockFeed)
        setElements(mockElements)
        
        isInternalUpdate.current = true
        saveToHistory(mockElements, mockFeed)
        isInternalUpdate.current = false
        
      } catch (error) {
        console.error('Failed to load feed data:', error)
        setError('피드 데이터를 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (userId) {
      loadFeedData()
    }
  }, [userId])

  // 🔥 자동 저장
  useEffect(() => {
    if (hasUnsavedChanges && !isLoading) {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
      }
      
      autosaveTimer.current = setTimeout(async () => {
        try {
          await saveFeed()
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, autoSaveInterval)
    }
    
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
      }
    }
  }, [hasUnsavedChanges, isLoading, autoSaveInterval])

  // 🔥 뷰포트 조작 함수들
  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2)
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale * 0.8)
    }))
  }, [])

  const resetZoom = useCallback(() => {
    setViewport(prev => ({ ...prev, scale: 1 }))
  }, [])

  const zoomToFit = useCallback(() => {
    if (!containerRef.current || elements.length === 0) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    const bounds = elements.reduce((acc, element) => ({
      minX: Math.min(acc.minX, element.x),
      minY: Math.min(acc.minY, element.y),
      maxX: Math.max(acc.maxX, element.x + element.width),
      maxY: Math.max(acc.maxY, element.y + element.height),
    }), {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    })
    
    const contentWidth = bounds.maxX - bounds.minX
    const contentHeight = bounds.maxY - bounds.minY
    
    const scaleX = containerRect.width / contentWidth
    const scaleY = containerRect.height / contentHeight
    const scale = Math.min(scaleX, scaleY, 1) * 0.9
    
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    
    setViewport({
      x: containerRect.width / 2 - centerX * scale,
      y: containerRect.height / 2 - centerY * scale,
      scale,
    })
  }, [elements])

  // 🔥 마우스/휠 이벤트 핸들러들 (쓰로틀링 적용)
  const handleWheel = useCallback(throttle((e: React.WheelEvent) => {
    e.preventDefault()
    
    if (e.ctrlKey || e.metaKey) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(3, viewport.scale * delta))
      
      const scaleDiff = newScale - viewport.scale
      const newX = viewport.x - (mouseX * scaleDiff)
      const newY = viewport.y - (mouseY * scaleDiff)
      
      setViewport({ x: newX, y: newY, scale: newScale })
    } else {
      setViewport(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }))
    }
  }, 16), [viewport])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX - viewport.x,
      y: e.clientY - viewport.y,
    }
  }, [viewport.x, viewport.y])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return

    setViewport(prev => ({
      ...prev,
      x: e.clientX - dragStart.current!.x,
      y: e.clientY - dragStart.current!.y,
    }))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
  }, [])

  const panTo = useCallback((x: number, y: number) => {
    setViewport(prev => ({ ...prev, x, y }))
  }, [])

  // 🔥 요소 관리 함수들
  const addElement = useCallback(<T extends FeedElement['type']>(
    type: T,
    elementData: Partial<Extract<FeedElement, { type: T }>>
  ): FeedElement => {
    const baseElement = {
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      x: snapToGridValue(elementData.x || 0),
      y: snapToGridValue(elementData.y || 0),
      rotation: elementData.rotation || 0,
      zIndex: elementData.zIndex || Math.max(...elements.map(e => e.zIndex), 0) + 1,
    }

    let newElement: FeedElement

    switch (type) {
      case 'PHOTO':
        newElement = {
          ...baseElement,
          type: 'PHOTO',
          width: elementData.width || 300,
          height: elementData.height || 200,
          photoId: (elementData as Partial<PhotoElement>).photoId || '',
          src: (elementData as Partial<PhotoElement>).src || '',
          alt: (elementData as Partial<PhotoElement>).alt || '',
        } as PhotoElement
        break

      case 'STICKER':
        newElement = {
          ...baseElement,
          type: 'STICKER',
          width: elementData.width || 80,
          height: elementData.height || 80,
          stickerUrl: (elementData as Partial<StickerElement>).stickerUrl || '',
          stickerType: (elementData as Partial<StickerElement>).stickerType || 'custom',
        } as StickerElement
        break

      case 'TEXT':
        newElement = {
          ...baseElement,
          type: 'TEXT',
          width: elementData.width || 200,
          height: elementData.height || 50,
          content: (elementData as Partial<TextElement>).content || '새 텍스트',
          fontSize: (elementData as Partial<TextElement>).fontSize || 16,
          fontFamily: (elementData as Partial<TextElement>).fontFamily || 'Arial, sans-serif',
          color: (elementData as Partial<TextElement>).color || '#000000',
          backgroundColor: (elementData as Partial<TextElement>).backgroundColor,
          textAlign: (elementData as Partial<TextElement>).textAlign || 'left',
        } as TextElement
        break

      case 'DRAWING':
        newElement = {
          ...baseElement,
          type: 'DRAWING',
          width: elementData.width || 100,
          height: elementData.height || 100,
          svgData: (elementData as Partial<DrawingElement>).svgData || '',
          strokeWidth: (elementData as Partial<DrawingElement>).strokeWidth || 2,
          strokeColor: (elementData as Partial<DrawingElement>).strokeColor || '#000000',
        } as DrawingElement
        break

      default:
        throw new Error(`Unsupported element type: ${type}`)
    }
    
    const newElements = [...elements, newElement]
    setElements(newElements)
    setHasUnsavedChanges(true)
    saveToHistory(newElements)
    
    return newElement
  }, [elements, saveToHistory, snapToGridValue])

  // 🔥 디바운스된 요소 업데이트
  const updateElement = useCallback(<T extends FeedElement>(
    elementId: string,
    updates: Partial<T>
  ) => {
    const newElements = elements.map(el => {
      if (el.id !== elementId) return el
      
      const updatedElement = {
        ...el,
        ...updates,
        updatedAt: new Date().toISOString(),
      } as FeedElement
      
      // 그리드 스냅 적용
      if (updates.x !== undefined) {
        updatedElement.x = snapToGridValue(updates.x as number)
      }
      if (updates.y !== undefined) {
        updatedElement.y = snapToGridValue(updates.y as number)
      }
      
      return updatedElement
    })
    
    setElements(newElements)
    setHasUnsavedChanges(true)
    saveToHistory(newElements)
  }, [elements, saveToHistory, snapToGridValue])

  const debouncedUpdateElement = useMemo(
    () => debounce(updateElement, 100),
    [updateElement]
  )

  const removeElement = useCallback((elementId: string) => {
    const newElements = elements.filter(el => el.id !== elementId)
    setElements(newElements)
    setHasUnsavedChanges(true)
    saveToHistory(newElements)
    
    if (editorState.selectedElementId === elementId) {
      setEditorState(prev => ({ 
        ...prev, 
        selectedElementId: null,
        selectedElementIds: prev.selectedElementIds.filter(id => id !== elementId)
      }))
    }
  }, [elements, editorState.selectedElementId, saveToHistory])

  // 🔥 다중 요소 삭제
  const removeElements = useCallback((elementIds: string[]) => {
    const newElements = elements.filter(el => !elementIds.includes(el.id))
    setElements(newElements)
    setHasUnsavedChanges(true)
    saveToHistory(newElements)
    
    setEditorState(prev => ({
      ...prev,
      selectedElementId: elementIds.includes(prev.selectedElementId || '') ? null : prev.selectedElementId,
      selectedElementIds: prev.selectedElementIds.filter(id => !elementIds.includes(id))
    }))
  }, [elements, saveToHistory])

  // 🔥 요소 복사/붙여넣기
  const copyElement = useCallback((elementId: string) => {
    const element = elements.find(el => el.id === elementId)
    if (element) {
      setEditorState(prev => ({ ...prev, clipboardData: element }))
    }
  }, [elements])

  const pasteElement = useCallback((x?: number, y?: number) => {
    if (!editorState.clipboardData) return
    
    const newElement = {
      ...editorState.clipboardData,
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: snapToGridValue(x !== undefined ? x : editorState.clipboardData.x + 20),
      y: snapToGridValue(y !== undefined ? y : editorState.clipboardData.y + 20),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const newElements = [...elements, newElement]
    setElements(newElements)
    setHasUnsavedChanges(true)
    saveToHistory(newElements)
    
    return newElement
  }, [elements, editorState.clipboardData, saveToHistory, snapToGridValue])

  // 🔥 레이어 관리
  const bringToFront = useCallback((elementId: string) => {
    const maxZIndex = Math.max(...elements.map(e => e.zIndex))
    updateElement(elementId, { zIndex: maxZIndex + 1 })
  }, [elements, updateElement])

  const sendToBack = useCallback((elementId: string) => {
    const minZIndex = Math.min(...elements.map(e => e.zIndex))
    updateElement(elementId, { zIndex: minZIndex - 1 })
  }, [elements, updateElement])

  const bringForward = useCallback((elementId: string) => {
    const element = elements.find(el => el.id === elementId)
    if (element) {
      updateElement(elementId, { zIndex: element.zIndex + 1 })
    }
  }, [elements, updateElement])

  const sendBackward = useCallback((elementId: string) => {
    const element = elements.find(el => el.id === elementId)
    if (element) {
      updateElement(elementId, { zIndex: element.zIndex - 1 })
    }
  }, [elements, updateElement])

  // 🔥 다중 선택 관리
  const selectElement = useCallback((elementId: string | null) => {
    setEditorState(prev => ({ 
      ...prev, 
      selectedElementId: elementId,
      selectedElementIds: elementId ? [elementId] : []
    }))
  }, [])

  const selectMultipleElements = useCallback((elementIds: string[]) => {
    setEditorState(prev => ({ 
      ...prev, 
      selectedElementIds: elementIds,
      selectedElementId: elementIds.length === 1 ? elementIds[0] : null
    }))
  }, [])

  const addToSelection = useCallback((elementId: string) => {
    setEditorState(prev => {
      const newIds = prev.selectedElementIds.includes(elementId) 
        ? prev.selectedElementIds.filter(id => id !== elementId)
        : [...prev.selectedElementIds, elementId]
      
      return {
        ...prev,
        selectedElementIds: newIds,
        selectedElementId: newIds.length === 1 ? newIds[0] : null
      }
    })
  }, [])

  const selectAllElements = useCallback(() => {
    const allIds = elements.map(el => el.id)
    setEditorState(prev => ({ 
      ...prev, 
      selectedElementIds: allIds,
      selectedElementId: null
    }))
  }, [elements])

  const clearSelection = useCallback(() => {
    setEditorState(prev => ({ 
      ...prev, 
      selectedElementId: null,
      selectedElementIds: []
    }))
  }, [])

  // 🔥 그리드 관리
  const toggleGrid = useCallback(() => {
    setGridSettings(prev => ({ ...prev, visible: !prev.visible }))
  }, [])

  const toggleSnapToGrid = useCallback(() => {
    setGridSettings(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const setGridSize = useCallback((size: number) => {
    setGridSettings(prev => ({ ...prev, size }))
  }, [])

  // 🔥 뷰포트 내 요소들 계산
  const visibleElements = useMemo((): FeedElement[] => {
    if (!containerRef.current) return elements
    
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    
    const viewportBounds = {
      left: (-viewport.x) / viewport.scale,
      top: (-viewport.y) / viewport.scale,
      right: (containerRect.width - viewport.x) / viewport.scale,
      bottom: (containerRect.height - viewport.y) / viewport.scale,
    }
    
    return elements
      .filter(element => {
        const elementRight = element.x + element.width
        const elementBottom = element.y + element.height
        
        return (
          element.x < viewportBounds.right &&
          elementRight > viewportBounds.left &&
          element.y < viewportBounds.bottom &&
          elementBottom > viewportBounds.top
        )
      })
      .sort((a, b) => a.zIndex - b.zIndex)
  }, [elements, viewport])

  // 🔥 피드 저장
  const saveFeed = useCallback(async () => {
    if (!feedData || isLoading) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Saving feed:', { feedData, elements })
      setHasUnsavedChanges(false)
      
      // TODO: 실제 API 호출
    } catch (error) {
      console.error('Failed to save feed:', error)
      setError('피드 저장에 실패했습니다.')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [feedData, elements, isLoading])

  // 🔥 배경 관리
  const updateBackground = useCallback((backgroundUrl: string) => {
    if (!feedData) return
    
    const newFeedData = {
      ...feedData,
      backgroundImageUrl: backgroundUrl,
      updatedAt: new Date().toISOString(),
    }
    
    setFeedData(newFeedData)
    setHasUnsavedChanges(true)
    saveToHistory(undefined, newFeedData)
  }, [feedData, saveToHistory])

  const updateFeedBackground = useCallback((backgroundColor: string) => {
    if (!feedData) return
    
    const newFeedData = {
      ...feedData,
      backgroundColor,
      updatedAt: new Date().toISOString(),
    }
    
    setFeedData(newFeedData)
    setHasUnsavedChanges(true)
    saveToHistory(undefined, newFeedData)
  }, [feedData, saveToHistory])

  // 🔥 편의 함수들
  const setTool = useCallback((tool: EditorState['tool']) => {
    setEditorState(prev => ({ ...prev, tool }))
  }, [])

  const getElementBounds = useCallback(() => {
    if (elements.length === 0) return null
    
    return elements.reduce((acc, element) => ({
      minX: Math.min(acc.minX, element.x),
      minY: Math.min(acc.minY, element.y),
      maxX: Math.max(acc.maxX, element.x + element.width),
      maxY: Math.max(acc.maxY, element.y + element.height),
    }), {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    })
  }, [elements])

  // 🔥 Cleanup
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
      }
    }
  }, [])

  return {
    // 🔥 State
    viewport,
    elements,
    visibleElements,
    feedData,
    isLoading,
    isDragging,
    hasUnsavedChanges,
    editorState,
    gridSettings,
    error,
    
    // 🔥 History
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    
    // 🔥 Refs
    containerRef,
    
    // 🔥 Viewport actions
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    panTo,
    
    // 🔥 Element actions
    addElement,
    updateElement,
    debouncedUpdateElement,
    removeElement,
    removeElements,
    copyElement,
    pasteElement,
    
    // 🔥 Selection actions
    selectElement,
    selectMultipleElements,
    addToSelection,
    selectAllElements,
    clearSelection,
    
    // 🔥 Layer actions
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    
    // 🔥 Grid actions
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    snapToGridValue,
    
    // 🔥 History actions
    undo,
    redo,
    saveToHistory,
    
    // 🔥 Feed actions
    saveFeed,
    updateBackground,
    updateFeedBackground,
    
    // 🔥 Editor actions
    setTool,
    getElementBounds,
    
    // 🔥 Event handlers
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // 🔥 Utils
    setError,
    setGridSettings,
    setViewport,
    setElements,
    setFeedData,
    setEditorState,
    
    // 🔥 Computed values
    selectedElements: elements.filter(el => editorState.selectedElementIds.includes(el.id)),
    hasSelection: editorState.selectedElementIds.length > 0,
    isMultiSelection: editorState.selectedElementIds.length > 1,
    totalElements: elements.length,
    
    // 🔥 Helper functions
    getElementById: useCallback((id: string) => elements.find(el => el.id === id), [elements]),
    isElementSelected: useCallback((id: string) => editorState.selectedElementIds.includes(id), [editorState.selectedElementIds]),
    getNextZIndex: useCallback(() => Math.max(...elements.map(e => e.zIndex), 0) + 1, [elements]),
    
    // 🔥 Keyboard shortcuts support
    handleKeyDown: useCallback((e: KeyboardEvent) => {
      if (!editorState.selectedElementIds.length) return
      
      const step = e.shiftKey ? 10 : 1
      const selectedIds = editorState.selectedElementIds
      
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          removeElements(selectedIds)
          break
        case 'ArrowLeft':
          e.preventDefault()
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { x: element.x - step })
            }
          })
          break
        case 'ArrowRight':
          e.preventDefault()
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { x: element.x + step })
            }
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { y: element.y - step })
            }
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { y: element.y + step })
            }
          })
          break
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (selectedIds.length === 1) {
              copyElement(selectedIds[0])
            }
          }
          break
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            pasteElement()
          }
          break
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectAllElements()
          }
          break
        case 'Escape':
          e.preventDefault()
          clearSelection()
          break
        case ']':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectedIds.forEach(id => bringForward(id))
          }
          break
        case '[':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectedIds.forEach(id => sendBackward(id))
          }
          break
        case '}':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectedIds.forEach(id => bringToFront(id))
          }
          break
        case '{':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectedIds.forEach(id => sendToBack(id))
          }
          break
        case 'g':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            toggleGrid()
          }
          break
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            toggleSnapToGrid()
          }
          break
      }
    }, [
      editorState.selectedElementIds,
      elements,
      removeElements,
      updateElement,
      copyElement,
      pasteElement,
      undo,
      redo,
      selectAllElements,
      clearSelection,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      toggleGrid,
      toggleSnapToGrid
    ]),
    
    // 🔥 Advanced features
    duplicateElement: useCallback((elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (!element) return
      
      const newElement = {
        ...element,
        id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: snapToGridValue(element.x + 20),
        y: snapToGridValue(element.y + 20),
        zIndex: Math.max(...elements.map(e => e.zIndex), 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const newElements = [...elements, newElement]
      setElements(newElements)
      setHasUnsavedChanges(true)
      saveToHistory(newElements)
      
      return newElement
    }, [elements, snapToGridValue, saveToHistory]),
    
    groupElements: useCallback((elementIds: string[]) => {
      // TODO: 그룹 기능 구현
      console.log('Grouping elements:', elementIds)
    }, []),
    
    ungroupElements: useCallback((groupId: string) => {
      // TODO: 그룹 해제 기능 구현
      console.log('Ungrouping elements:', groupId)
    }, []),
    
    alignElements: useCallback((type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      const selectedIds = editorState.selectedElementIds
      if (selectedIds.length < 2) return
      
      const selectedEls = elements.filter(el => selectedIds.includes(el.id))
      
      switch (type) {
        case 'left':
          const minX = Math.min(...selectedEls.map(el => el.x))
          selectedIds.forEach(id => updateElement(id, { x: minX }))
          break
        case 'right':
          const maxX = Math.max(...selectedEls.map(el => el.x + el.width))
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { x: maxX - element.width })
            }
          })
          break
        case 'center':
          const centerX = (Math.min(...selectedEls.map(el => el.x)) + Math.max(...selectedEls.map(el => el.x + el.width))) / 2
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { x: centerX - element.width / 2 })
            }
          })
          break
        case 'top':
          const minY = Math.min(...selectedEls.map(el => el.y))
          selectedIds.forEach(id => updateElement(id, { y: minY }))
          break
        case 'bottom':
          const maxY = Math.max(...selectedEls.map(el => el.y + el.height))
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { y: maxY - element.height })
            }
          })
          break
        case 'middle':
          const centerY = (Math.min(...selectedEls.map(el => el.y)) + Math.max(...selectedEls.map(el => el.y + el.height))) / 2
          selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
              updateElement(id, { y: centerY - element.height / 2 })
            }
          })
          break
      }
    }, [editorState.selectedElementIds, elements, updateElement]),
    
    distributeElements: useCallback((type: 'horizontal' | 'vertical') => {
      const selectedIds = editorState.selectedElementIds
      if (selectedIds.length < 3) return
      
      const selectedEls = elements.filter(el => selectedIds.includes(el.id))
      
      if (type === 'horizontal') {
        selectedEls.sort((a, b) => a.x - b.x)
        const totalWidth = selectedEls[selectedEls.length - 1].x + selectedEls[selectedEls.length - 1].width - selectedEls[0].x
        const spacing = (totalWidth - selectedEls.reduce((sum, el) => sum + el.width, 0)) / (selectedEls.length - 1)
        
        let currentX = selectedEls[0].x
        selectedEls.forEach((el, index) => {
          if (index > 0) {
            currentX += selectedEls[index - 1].width + spacing
            updateElement(el.id, { x: currentX })
          }
        })
      } else {
        selectedEls.sort((a, b) => a.y - b.y)
        const totalHeight = selectedEls[selectedEls.length - 1].y + selectedEls[selectedEls.length - 1].height - selectedEls[0].y
        const spacing = (totalHeight - selectedEls.reduce((sum, el) => sum + el.height, 0)) / (selectedEls.length - 1)
        
        let currentY = selectedEls[0].y
        selectedEls.forEach((el, index) => {
          if (index > 0) {
            currentY += selectedEls[index - 1].height + spacing
            updateElement(el.id, { y: currentY })
          }
        })
      }
    }, [editorState.selectedElementIds, elements, updateElement]),
    
    exportFeed: useCallback(async (format: 'json' | 'png' | 'svg' = 'json') => {
      if (format === 'json') {
        return {
          feed: feedData,
          elements: elements,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        }
      }
      
      // TODO: PNG/SVG 내보내기 구현
      console.log(`Exporting as ${format}...`)
      return null
    }, [feedData, elements]),
    
    importFeed: useCallback(async (data: any) => {
      try {
        if (data.feed && data.elements) {
          setFeedData(data.feed)
          setElements(data.elements)
          setHasUnsavedChanges(true)
          saveToHistory(data.elements, data.feed)
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to import feed:', error)
        setError('피드 가져오기에 실패했습니다.')
        return false
      }
    }, [saveToHistory]),
  }
}
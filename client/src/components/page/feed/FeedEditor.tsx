import React, { useState, useEffect, useCallback } from 'react'
import FeedCanvas from './FeedCanvas'
import EditToolbar from './EditToolbar'
import BackgroundColorPicker from './BackgroundColorPicker'
// 기존 drawing 컴포넌트들 재사용
import StickerModal from '@/components/page/drawing/StickerModal'
import TextModal from '@/components/page/drawing/TextModal'
import PhotoUploadModal from './PhotoUploadModal' // ✅ 다시 추가
import { useFeedEditor } from '@/hooks/useFeedEditor'
import { FeedElement, StickerElement, TextElement, PhotoElement } from '@/lib/types/feed'

// ✅ 백엔드 API 연동
import { 
  createFeed, 
  getFeed, 
  deleteFeed,
  getCurrentUser,
  handleApiError 
} from '@/lib/api/feed'

interface FeedEditorProps {
  userId?: string
  feedId?: string // 기존 피드 편집용
  photoId?: string // ✅ myroom에서 선택된 photoId (URL 파라미터에서)
  mode?: 'create' | 'edit' // 생성 모드 vs 편집 모드
  className?: string
  onComplete?: () => void // ✅ 편집 완료 시 콜백 (/my로 이동)
  onCancel?: () => void // 취소 콜백 (/myroom으로 이동)
}

// 🔥 EditToolbar와 일치하는 타입 사용 (save 추가)
export type EditTool = 'select' | 'photo' | 'sticker' | 'text' | 'draw' | 'background' | 'save'

const FeedEditor: React.FC<FeedEditorProps> = ({
  userId,
  feedId,
  photoId, // ✅ myroom에서 전달받은 photoId
  mode = 'create',
  className = '',
  onComplete, // ✅ 편집 완료 콜백 (/my로 이동)
  onCancel
}) => {
  const [activeTool, setActiveTool] = useState<EditTool>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [showStickerModal, setShowStickerModal] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // ✅ 백엔드 연동 상태
  const [isSaving, setIsSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [basePhotoId, setBasePhotoId] = useState<number | null>(null)
  const [currentFeedId, setCurrentFeedId] = useState<string | null>(feedId || null)

  const {
    elements,
    viewport,
    isDragging,
    isLoading,
    containerRef,
    feedData,
    addElement,
    updateElement,
    removeElement,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    resetZoom,
    panTo,
  } = useFeedEditor({ userId: userId || currentUser?.id || '' })

  // 🔥 배경색 상태 관리
  const [selectedBgColor, setSelectedBgColor] = useState(feedData?.backgroundColor || '#fef7f0')

  // ✅ 현재 사용자 정보 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('현재 사용자 정보 로드 실패:', error)
        showToast('사용자 정보를 불러올 수 없습니다', 'error')
      }
    }
    
    if (!userId) {
      loadCurrentUser()
    }
  }, [userId])

  // ✅ myroom에서 전달받은 photoId로 초기화
  useEffect(() => {
    if (photoId) {
      const photoIdNum = parseInt(photoId)
      if (!isNaN(photoIdNum)) {
        setBasePhotoId(photoIdNum)
        showToast('사진이 로드되었습니다. 자유롭게 편집해보세요!')
      }
    }
  }, [photoId])

  // ✅ 기존 피드 데이터 로드 (편집 모드)
  useEffect(() => {
    const loadExistingFeed = async () => {
      if (mode === 'edit' && feedId) {
        try {
          const result = await getFeed(feedId)
          if (result.success && result.data) {
            setSelectedBgColor(result.data.backgroundColor)
            // photoId 추출
            const photoIdMatch = result.data.backgroundImageUrl?.match(/\/photos\/(\d+)/)
            if (photoIdMatch) {
              setBasePhotoId(parseInt(photoIdMatch[1]))
            }
          }
        } catch (error) {
          console.error('피드 로드 실패:', error)
          showToast('피드를 불러올 수 없습니다', 'error')
        }
      }
    }

    loadExistingFeed()
  }, [mode, feedId])

  // feedData 변경 시 배경색 동기화
  useEffect(() => {
    if (feedData?.backgroundColor) {
      setSelectedBgColor(feedData.backgroundColor)
    }
  }, [feedData?.backgroundColor])

  // 🔥 토스트 메시지 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type })
    setTimeout(() => setToastMessage(null), 3000)
  }, [])

  // ✅ 피드 저장 후 완료 처리
  const handleSaveFeed = useCallback(async () => {
    if (!basePhotoId) {
      showToast('사진을 먼저 선택해주세요', 'error')
      return
    }

    setIsSaving(true)
    
    try {
      if (mode === 'create') {
        // 새 피드 생성
        const result = await createFeed(basePhotoId)
        
        if (result.success && result.data) {
          setCurrentFeedId(result.data.id)
          showToast('피드가 성공적으로 생성되었습니다!')
          
          // 편집 완료 - /my 페이지로 이동
          if (onComplete) {
            setTimeout(() => {
              onComplete()
            }, 1500)
          }
        } else {
          throw new Error(result.error || '피드 생성에 실패했습니다')
        }
      } else {
        // 기존 피드 업데이트
        showToast('피드 업데이트 기능은 아직 지원되지 않습니다', 'error')
      }
    } catch (error) {
      console.error('피드 저장 실패:', error)
      showToast(handleApiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }, [basePhotoId, mode, onComplete])

  // ✅ 피드 삭제 함수
  const handleDeleteFeed = useCallback(async () => {
    if (!currentFeedId || mode !== 'edit') return
    
    if (!confirm('정말 이 피드를 삭제하시겠습니까?')) return

    setIsSaving(true)
    
    try {
      const result = await deleteFeed(currentFeedId)
      
      if (result.success) {
        showToast('피드가 삭제되었습니다')
        if (onCancel) {
          onCancel()
        }
      } else {
        throw new Error(result.error || '피드 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('피드 삭제 실패:', error)
      showToast(handleApiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }, [currentFeedId, mode, onCancel])

  // 🔥 캔버스 크기 기반 랜덤 위치 생성
  const getRandomPosition = useCallback(() => {
    const canvasWidth = containerRef.current?.clientWidth || 800
    const canvasHeight = containerRef.current?.clientHeight || 600
    
    return {
      x: Math.random() * Math.max(canvasWidth - 300, 100) + 100,
      y: Math.random() * Math.max(canvasHeight - 300, 100) + 100,
    }
  }, [containerRef])

  // 🔥 배경색 변경 핸들러 - 현재는 로컬 상태만 업데이트
  const handleBackgroundColorChange = async (color: string) => {
    const previousColor = selectedBgColor
    setSelectedBgColor(color)
    
    try {
      // ⚠️ 백엔드에서 배경색 업데이트 API를 지원하지 않으므로 로컬만 업데이트
      console.log('Background color changed to:', color)
      showToast('배경색이 변경되었습니다 (저장 시 반영됩니다)')
    } catch (error) {
      console.error('Failed to update background color:', error)
      setSelectedBgColor(previousColor)
      showToast('배경색 변경에 실패했습니다', 'error')
    }
  }

  // 도구 변경 핸들러
  const handleToolChange = (tool: EditTool) => {
    // 저장 도구 처리
    if (tool === 'save') {
      handleSaveFeed()
      return
    }

    setActiveTool(tool)
    
    // 기존 패널들 닫기
    setShowStickerModal(false)
    setShowTextModal(false)
    setShowColorPicker(false)
    setShowPhotoModal(false)
    
    // 새로운 패널 열기
    switch (tool) {
      case 'sticker':
        setShowStickerModal(true)
        break
      case 'text':
        setShowTextModal(true)
        break
      case 'background':
        setShowColorPicker(true)
        break
      case 'photo':
        setShowPhotoModal(true)
        break
    }
  }

  // 요소 선택
  const handleElementSelect = (elementId: string | null) => {
    setSelectedElement(elementId)
  }

  // 요소 삭제
  const handleElementDelete = (elementId: string) => {
    try {
      removeElement(elementId)
      if (selectedElement === elementId) {
        setSelectedElement(null)
      }
      showToast('요소가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete element:', error)
      showToast('요소 삭제에 실패했습니다', 'error')
    }
  }

  // ⚠️ 스티커 추가 - 백엔드에서 지원하지 않으므로 경고 표시
  const handleStickerAdd = (stickerUrl: string) => {
    showToast('스티커 기능은 현재 백엔드에서 지원되지 않습니다', 'error')
    setShowStickerModal(false)
    
    // 로컬 상태에만 추가 (데모용)
    try {
      const { x, y } = getRandomPosition()
      
      const stickerData = {
        x,
        y,
        width: 80,
        height: 80,
        rotation: 0,
        zIndex: elements.length + 1,
        stickerUrl,
        stickerType: 'custom' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const newElement = addElement('STICKER', stickerData)
      
      if (newElement && newElement.id) {
        setSelectedElement(newElement.id)
      }
      setActiveTool('select')
    } catch (error) {
      console.error('Failed to add sticker:', error)
    }
  }

  // ⚠️ 텍스트 추가 - 백엔드에서 지원하지 않으므로 경고 표시
  const handleTextAdd = (text: string, fontFamily: string, fontSize: number, color: string) => {
    showToast('텍스트 기능은 현재 백엔드에서 지원되지 않습니다', 'error')
    setShowTextModal(false)

    // 로컬 상태에만 추가 (데모용)
    try {
      const { x, y } = getRandomPosition()
      
      const textData = {
        x,
        y,
        width: Math.max(200, text.length * fontSize * 0.6),
        height: fontSize * 1.5,
        rotation: 0,
        zIndex: elements.length + 1,
        content: text,
        fontSize,
        fontFamily,
        color,
        textAlign: 'left' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const newElement = addElement('TEXT', textData)
      
      if (newElement && newElement.id) {
        setSelectedElement(newElement.id)
      }
      setActiveTool('select')
    } catch (error) {
      console.error('Failed to add text:', error)
    }
  }

  // 사진 추가
  const handlePhotoAdd = () => {
    setShowPhotoModal(true)
  }

  // ✅ 사진 선택 - 실제 photoId 설정 (백엔드 API 용)
  const handlePhotoSelect = (imageData: string, photoId?: number) => {
    try {
      if (photoId) {
        // 실제 업로드된 사진의 photoId 설정
        setBasePhotoId(photoId)
        showToast('사진이 선택되었습니다. 저장 버튼을 눌러 피드를 생성하세요.')
      } else {
        // 로컬 이미지의 경우 (데모용)
        const { x, y } = getRandomPosition()
        
        const photoData = {
          x,
          y,
          width: 300,
          height: 200,
          rotation: 0,
          zIndex: elements.length + 1,
          photoId: `photo_${Date.now()}`,
          src: imageData,
          alt: 'Uploaded photo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        const newElement = addElement('PHOTO', photoData)
        
        if (newElement && newElement.id) {
          setSelectedElement(newElement.id)
          showToast('사진이 추가되었습니다 (로컬에만 표시됩니다)')
        }
      }
      
      setShowPhotoModal(false)
      setActiveTool('select')
    } catch (error) {
      console.error('Failed to add photo:', error)
      showToast('사진 추가에 실패했습니다', 'error')
    }
  }

  // 🔥 키보드 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있을 때는 단축키 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedElement) {
            e.preventDefault()
            handleElementDelete(selectedElement)
          }
          break
        case 'Escape':
          setSelectedElement(null)
          setActiveTool('select')
          break
        case '1':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('select')
          }
          break
        case '2':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('photo')
          }
          break
        case '3':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('sticker')
          }
          break
        case '4':
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool('text')
          }
          break
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleSaveFeed()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement, handleSaveFeed])

  // 🔥 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (toastMessage) {
        setToastMessage(null)
      }
    }
  }, [])

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-100 ${className}`}>
      {/* 상단 도구 모음 */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <EditToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          selectedElement={selectedElement}
          onElementDelete={handleElementDelete}
          onPhotoAdd={handlePhotoAdd}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          zoomLevel={viewport.scale}
          // ✅ 추가 프롭스
          onSave={handleSaveFeed}
          onCancel={onCancel}
          onDelete={mode === 'edit' ? handleDeleteFeed : undefined}
          isSaving={isSaving}
          canSave={!!basePhotoId}
          mode={mode}
        />
      </div>

      {/* 백엔드 제약사항 경고 */}
      <div className="absolute top-16 left-4 right-4 z-30">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                현재 백엔드에서는 사진 기반 피드 생성만 지원됩니다. 
                스티커, 텍스트, 요소 편집 기능은 추후 구현 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 캔버스 영역 */}
      <div className="absolute inset-0 pt-28">
        <FeedCanvas
          userId={userId || currentUser?.id || ''}
          elements={elements as any}
          viewport={viewport}
          selectedElement={selectedElement}
          activeTool={activeTool}
          isDragging={isDragging}
          containerRef={containerRef}
          feedData={feedData}
          backgroundColor={selectedBgColor}
          onElementSelect={handleElementSelect}
          onElementUpdate={updateElement}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* 🔥 우측 사이드 패널 - 색상 팔레트 */}
      {showColorPicker && (
        <div className="absolute top-28 right-0 bottom-0 w-80 z-20">
          <BackgroundColorPicker
            selectedColor={selectedBgColor}
            onColorChange={handleBackgroundColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}

      {/* 기존 drawing 모달들 재사용 */}
      <StickerModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        onStickerSelect={handleStickerAdd}
      />

      <TextModal
        isOpen={showTextModal}
        onClose={() => setShowTextModal(false)}
        onTextAdd={handleTextAdd}
        fontOptions={[
          { name: '깔끔', family: 'Noto Sans KR, sans-serif', displayName: 'Noto Sans KR' },
          { name: '귀여움', family: 'Jua, cursive', displayName: 'Jua' },
          { name: '힙함', family: 'Black Han Sans, sans-serif', displayName: 'Black Han Sans' },
          { name: '손글씨', family: 'Gamja Flower, cursive', displayName: 'Gamja Flower' },
          { name: '삐뚤빼뚤', family: 'Gaegu, cursive', displayName: 'Gaegu' },
          { name: '기본', family: 'Arial, sans-serif', displayName: 'Arial' },
        ]}
        colors={[
          '#000000', '#FFFFFF', '#DC2626', '#EA580C', '#CA8A04', '#16A34A',
          '#0EA5E9', '#7C3AED', '#DB2777', '#0D9488', '#BE123C', '#6366F1',
        ]}
        defaultFontSize={24}
        minFontSize={12}
        maxFontSize={96}
      />

      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelect={(imageData: string) => handlePhotoSelect(imageData)}
        onPhotoUpload={(file: File, photoId?: number | undefined) => {
          if (photoId) {
            setBasePhotoId(photoId)
            showToast('사진이 업로드되었습니다!')
            setShowPhotoModal(false)
          }
        }}
      />

      {/* 🔥 토스트 알림 */}
      {toastMessage && (
        <div className={`absolute top-32 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toastMessage.message}
        </div>
      )}

      {/* 로딩 오버레이 */}
      {(isLoading || isSaving) && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700 font-medium">
                {isSaving ? '저장 중...' : '로드 중...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 키보드 단축키 도움말 */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs rounded p-3 z-30 max-w-xs">
        <div className="font-semibold mb-1">키보드 단축키</div>
        <div>Ctrl+S: 저장</div>
        <div>Del/Backspace: 삭제</div>
        <div>Esc: 선택 해제</div>
        <div>1-4: 도구 선택</div>
        <div>Ctrl+Wheel: 확대/축소</div>
      </div>

      {/* 피드 정보 표시 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs rounded p-3 z-30">
          <div className="font-semibold mb-1">디버그 정보</div>
          <div>모드: {mode}</div>
          <div>사용자: {currentUser?.name || 'Unknown'}</div>
          <div>피드 ID: {currentFeedId || 'None'}</div>
          <div>사진 ID: {basePhotoId || 'None'}</div>
          <div>요소 수: {elements.length}</div>
        </div>
      )}
    </div>
  )
}

export default FeedEditor
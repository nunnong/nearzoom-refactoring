import React, { useState, useEffect, useCallback } from 'react'
import FeedCanvas from './FeedCanvas'
import EditToolbar from './EditToolbar'
import BackgroundColorPicker from './BackgroundColorPicker'
// 기존 drawing 컴포넌트들 재사용 (로컬 데모용)
import StickerModal from '@/components/page/drawing/StickerModal'
import TextModal from '@/components/page/drawing/TextModal'
import PhotoUploadModal from './PhotoUploadModal'
import { useFeedEditor } from '@/hooks/useFeedEditor'
import { FeedElement, StickerElement, TextElement, PhotoElement } from '@/lib/types/feed'

// ✅ 백엔드 API 연동
import { 
  createFeed, 
  getFeed, 
  getCurrentUser,
  handleApiError 
} from '@/lib/api/feed'

interface FeedEditorProps {
  userId?: string
  feedId?: string | null  // 기존 피드 편집용
  photoId?: number        // ✅ 선택된 photoId
  mode?: 'create' | 'edit' // 생성 모드 vs 편집 모드
  className?: string
  onSave?: (caption: string) => Promise<void> // ✅ 부모에서 처리
  onComplete?: () => void // ✅ 편집 완료 시 콜백 (/my로 이동)
  onCancel?: () => void   // 취소 콜백
}

// 🔥 EditToolbar와 일치하는 타입 사용 (save 추가)
export type EditTool = 'select' | 'photo' | 'sticker' | 'text' | 'draw' | 'background' | 'save'

const FeedEditor: React.FC<FeedEditorProps> = ({
  userId,
  feedId,
  photoId, // ✅ 선택된 photoId
  mode = 'create',
  className = '',
  onSave, // ✅ 부모에서 처리하는 저장 함수
  onComplete,
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
  const [currentFeedId, setCurrentFeedId] = useState<string | null>(feedId || null)
  const [caption, setCaption] = useState<string>('') // ✅ 피드 설명

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

  // 🔥 배경색 상태 관리 (로컬에서만 사용)
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

  // ✅ photoId 확인 및 알림
  useEffect(() => {
    if (photoId) {
      showToast('사진이 선택되었습니다. 설명을 입력하고 저장해주세요!')
    } else if (mode === 'create') {
      showToast('사진을 먼저 선택해주세요', 'error')
    }
  }, [photoId, mode])

  // ✅ 기존 피드 데이터 로드 (편집 모드)
  useEffect(() => {
    const loadExistingFeed = async () => {
      if (mode === 'edit' && feedId) {
        try {
          const result = await getFeed(feedId)
          if (result.success && result.data) {
            setSelectedBgColor(result.data.backgroundColor)
            setCaption(result.data.description || '')
            setCurrentFeedId(feedId)
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

  // ✅ 피드 저장 처리 (부모 컴포넌트의 onSave 사용)
  const handleSaveFeed = useCallback(async () => {
    if (!photoId && mode === 'create') {
      showToast('사진을 먼저 선택해주세요', 'error')
      return
    }

    if (!caption.trim()) {
      showToast('피드 설명을 입력해주세요', 'error')
      return
    }

    setIsSaving(true)
    
    try {
      if (onSave) {
        await onSave(caption)
      } else {
        // 기본 저장 로직 (onSave가 없는 경우)
        if (mode === 'create' && photoId) {
          const result = await createFeed(photoId, caption)
          
          if (result.success && result.data) {
            setCurrentFeedId(result.data.id)
            showToast('피드가 성공적으로 생성되었습니다!')
            
            if (onComplete) {
              setTimeout(() => {
                onComplete()
              }, 1500)
            }
          } else {
            throw new Error(result.error || '피드 생성에 실패했습니다')
          }
        } else {
          showToast('피드 업데이트 기능은 현재 지원되지 않습니다', 'error')
        }
      }
    } catch (error) {
      console.error('피드 저장 실패:', error)
      showToast(handleApiError(error), 'error')
    } finally {
      setIsSaving(false)
    }
  }, [photoId, caption, mode, onSave, onComplete])

  // 🔥 배경색 변경 핸들러 - 로컬에서만 사용 (백엔드 미지원)
  const handleBackgroundColorChange = async (color: string) => {
    setSelectedBgColor(color)
    showToast('배경색이 변경되었습니다 (로컬 표시용)')
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
      showToast('요소가 삭제되었습니다 (로컬에서만)')
    } catch (error) {
      console.error('Failed to delete element:', error)
      showToast('요소 삭제에 실패했습니다', 'error')
    }
  }

  // 🔥 캔버스 크기 기반 랜덤 위치 생성
  const getRandomPosition = useCallback(() => {
    const canvasWidth = containerRef.current?.clientWidth || 800
    const canvasHeight = containerRef.current?.clientHeight || 600
    
    return {
      x: Math.random() * Math.max(canvasWidth - 300, 100) + 100,
      y: Math.random() * Math.max(canvasHeight - 300, 100) + 100,
    }
  }, [containerRef])

  // ⚠️ 스티커 추가 - 로컬 데모용 (백엔드 미지원)
  const handleStickerAdd = (stickerUrl: string) => {
    showToast('스티커는 로컬에서만 표시됩니다 (백엔드 미지원)', 'error')
    setShowStickerModal(false)
    
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

  // ⚠️ 텍스트 추가 - 로컬 데모용 (백엔드 미지원)
  const handleTextAdd = (text: string, fontFamily: string, fontSize: number, color: string) => {
    showToast('텍스트는 로컬에서만 표시됩니다 (백엔드 미지원)', 'error')
    setShowTextModal(false)

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

  // 사진 추가 - 현재는 기본 사진만 지원
  const handlePhotoAdd = () => {
    if (photoId) {
      showToast('이미 사진이 선택되어 있습니다', 'error')
      return
    }
    setShowPhotoModal(true)
  }

  // ✅ 사진 선택 처리 (PhotoUploadModal의 ImageInfo 타입에 맞춤)
  const handlePhotoSelect = (imageData: string, imageInfo?: any) => {
    if (imageInfo?.photoId) {
      // 실제 업로드된 사진의 photoId 사용
      showToast('새 사진이 선택되었습니다. 이제 설명을 입력하고 저장해주세요.')
    } else {
      showToast('로컬 이미지는 데모용으로만 표시됩니다', 'error')
      
      // 로컬 이미지 캔버스에 추가 (데모용)
      try {
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
        }
      } catch (error) {
        console.error('Failed to add photo:', error)
      }
    }
    
    setShowPhotoModal(false)
    setActiveTool('select')
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
          isSaving={isSaving}
          canSave={!!photoId && !!caption.trim()}
          mode={mode}
        />
      </div>

      {/* 백엔드 제약사항 안내 */}
      <div className="absolute top-16 left-4 right-4 z-30">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">현재 백엔드 지원 기능</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>✅ 사진 기반 피드 생성 (photoId + caption)</li>
                  <li>⚠️ 스티커, 텍스트는 로컬 데모용 (저장되지 않음)</li>
                  <li>⚠️ 캔버스 편집 요소들은 추후 구현 예정</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 피드 설명 입력 */}
      <div className="absolute top-36 left-4 right-4 z-30">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
            피드 설명 (필수)
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="이 피드에 대한 설명을 입력해주세요..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            maxLength={200}
          />
          <div className="mt-1 text-xs text-gray-500">
            {caption.length}/200 글자
          </div>
        </div>
      </div>

      {/* 메인 캔버스 영역 */}
      <div className="absolute inset-0 pt-64">
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
        <div className="absolute top-64 right-0 bottom-0 w-80 z-20">
          <BackgroundColorPicker
            selectedColor={selectedBgColor}
            onColorChange={handleBackgroundColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}

      {/* 로컬 데모용 모달들 */}
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
        onPhotoSelect={handlePhotoSelect}
        onPhotoUpload={(file: File, uploadedImageInfo?: any) => {
          // PhotoUploadModal에서 실제 업로드 처리
          if (uploadedImageInfo?.photoId) {
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
                {isSaving ? '피드 저장 중...' : '로딩 중...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 피드 정보 표시 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs rounded p-3 z-30">
          <div className="font-semibold mb-1">디버그 정보</div>
          <div>모드: {mode}</div>
          <div>사용자: {currentUser?.name || 'Unknown'}</div>
          <div>피드 ID: {currentFeedId || 'None'}</div>
          <div>사진 ID: {photoId || 'None'}</div>
          <div>설명: {caption.length > 0 ? '입력됨' : '미입력'}</div>
          <div>요소 수: {elements.length} (로컬)</div>
        </div>
      )}
    </div>
  )
}

export default FeedEditor
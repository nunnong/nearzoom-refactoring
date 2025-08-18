// Edit Slice - 순차적 사진 배경 편집 관리

export type BackgroundType = 'color' | 'prompt'

export interface PhotoBackground {
  photoIndex: number
  backgroundType: BackgroundType
  backgroundValue: string
  completed: boolean
}

export interface EditSliceState {
  // 편집할 사진들 (선택된 순서대로)
  selectedPhotoUrls: string[]
  
  // 각 사진의 personIds (Photo 객체에서 추출)
  photoPersonIds: string[][]
  
  // 백그라운드 처리된 사진 URL들
  processedPhotoUrls: string[]
  
  // 현재 편집 중인 사진 인덱스 (0-based, 순차적 진행만 가능)
  currentEditIndex: number
  
  // 현재 사진의 배경 타입
  backgroundType: BackgroundType
  
  // 현재 사진의 선택된 색상
  selectedColor: string
  
  // 현재 사진의 프롬프트 텍스트
  promptText: string
  
  // 각 사진의 배경 설정 (완료된 사진들)
  photoBackgrounds: PhotoBackground[]
  
  // 편집 세션이 시작되었는지 여부
  editSessionStarted: boolean
}

// Photo 객체 타입 임포트
import type { Photo } from './selectSlice'

export interface EditSliceActions {
  // 편집 세션 초기화 (Photo 객체 배열로 받아서 URL과 personIds 추출)
  initializeEditSession: (selectedPhotos: Photo[]) => void
  
  // 현재 사진의 배경 타입 변경
  setBackgroundType: (type: BackgroundType) => void
  
  // 현재 사진의 색상 변경
  setSelectedColor: (color: string) => void
  
  // 현재 사진의 프롬프트 텍스트 변경
  setPromptText: (text: string) => void
  
  // 현재 사진 저장하고 다음으로 진행 (순차적)
  saveAndProceedNext: () => void
  
  // 모든 편집 완료
  completeEditing: () => void
  
  // 편집 세션 리셋
  resetEditSession: () => void
  
  // 현재 사진이 완료되었는지 확인
  isCurrentPhotoComplete: () => boolean
  
  // 모든 사진 편집이 완료되었는지 확인
  isAllPhotosComplete: () => boolean
}

export type EditSlice = EditSliceState & EditSliceActions

export const defaultEditSliceState: EditSliceState = {
  selectedPhotoUrls: [],
  photoPersonIds: [],
  processedPhotoUrls: [],
  currentEditIndex: 0,
  backgroundType: 'color',
  selectedColor: '#C8B5FF',
  promptText: '',
  photoBackgrounds: [],
  editSessionStarted: false,
}

export const createEditSlice = (set: any, get: any, roomName: string) => ({
  ...defaultEditSliceState,
  
  initializeEditSession: (selectedPhotos: Photo[]) => {
    console.log('🎨 === EDIT SESSION INITIALIZATION DEBUG ===')
    console.log('🎨 Photos received:', selectedPhotos)
    console.log('🎨 Photos with details:', selectedPhotos.map((p, idx) => ({
      index: idx,
      hasPersonIds: !!p.personIds,
      personIdsCount: p.personIds ? p.personIds.length : 0,
      personIds: p.personIds,
      imgUrl: p.imgUrl
    })))
    
    // Photo 객체에서 URL과 personIds 추출
    const selectedPhotoUrls = selectedPhotos.map(photo => photo.imgUrl)
    const photoPersonIds = selectedPhotos.map(photo => photo.personIds)
    
    console.log('🎨 Extracted personIds arrays:', photoPersonIds)
    console.log('🎨 === END INITIALIZATION DEBUG ===')
    
    // Yjs에 편집 세션 초기화 상태 업데이트
    const { updateEditState } = require('./index')
    updateEditState(roomName, {
      selectedPhotoUrls,
      photoPersonIds,
      processedPhotoUrls: new Array(selectedPhotos.length).fill(''),
      currentEditIndex: 0,
      backgroundType: 'color',
      selectedColor: '#C8B5FF',
      promptText: '',
      photoBackgrounds: [],
      editSessionStarted: true,
    })
  },
  
  setBackgroundType: (type: BackgroundType) => {
    const { updateEditState } = require('./index')
    updateEditState(roomName, { backgroundType: type })
    
    // 타입 변경시 기본값으로 리셋
    if (type === 'color') {
      updateEditState(roomName, { selectedColor: '#C8B5FF', promptText: '' })
    } else {
      updateEditState(roomName, { promptText: '', selectedColor: '#C8B5FF' })
    }
  },
  
  setSelectedColor: (color: string) => {
    const { updateEditState } = require('./index')
    updateEditState(roomName, { selectedColor: color })
  },
  
  setPromptText: (text: string) => {
    const { updateEditState } = require('./index')
    updateEditState(roomName, { promptText: text })
  },
  
  saveAndProceedNext: () => {
    const state = get()
    const { currentEditIndex, selectedPhotoUrls, backgroundType, selectedColor, promptText, photoBackgrounds } = state
    
    // 현재 사진의 배경 설정 저장
    const backgroundValue = backgroundType === 'color' ? selectedColor : promptText
    const newBackground: PhotoBackground = {
      photoIndex: currentEditIndex,
      backgroundType,
      backgroundValue,
      completed: true
    }
    
    const updatedBackgrounds = [...photoBackgrounds]
    updatedBackgrounds[currentEditIndex] = newBackground
    
    console.log(`🎨 Saved background for photo ${currentEditIndex + 1}:`, newBackground)
    
    // 다음 사진으로 진행 (마지막 사진이 아닌 경우)
    if (currentEditIndex < selectedPhotoUrls.length - 1) {
      const nextIndex = currentEditIndex + 1
      
      const { updateEditState } = require('./index')
      updateEditState(roomName, {
        photoBackgrounds: updatedBackgrounds,
        currentEditIndex: nextIndex,
        // 다음 사진을 위해 기본값으로 리셋
        backgroundType: 'color',
        selectedColor: '#C8B5FF',
        promptText: ''
      })
      
      console.log(`🎨 Proceeded to photo ${nextIndex + 1}/${selectedPhotoUrls.length}`)
    } else {
      // 마지막 사진인 경우 배경만 저장
      const { updateEditState } = require('./index')
      updateEditState(roomName, { photoBackgrounds: updatedBackgrounds })
      
      console.log('🎨 All photos completed, ready to finish editing')
    }
  },
  
  completeEditing: () => {
    const state = get()
    console.log('🎉 Completing all photo editing:', state.photoBackgrounds)
    
    // END 상태로 전환하여 완료 모달 표시
    const { updatePhotoBoothState } = require('./index')
    updatePhotoBoothState(roomName, 'end')
  },
  
  resetEditSession: () => {
    console.log('🔄 Resetting edit session')
    const { updateEditState } = require('./index')
    updateEditState(roomName, {
      ...defaultEditSliceState,
      editSessionStarted: false
    })
  },
  
  isCurrentPhotoComplete: () => {
    const { backgroundType, selectedColor, promptText } = get()
    
    if (backgroundType === 'color') {
      return selectedColor !== ''
    } else {
      return promptText.trim() !== ''
    }
  },
  
  isAllPhotosComplete: () => {
    const { selectedPhotoUrls, photoBackgrounds } = get()
    return photoBackgrounds.length === selectedPhotoUrls.length &&
           photoBackgrounds.every(bg => bg.completed)
  },
})
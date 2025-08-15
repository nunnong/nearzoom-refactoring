// Shooting Slice - 촬영 및 캡쳐 상태 관리

export interface ShootingSliceState {
  isShooting: boolean           // 촬영 중 여부 (카운트다운 및 캡쳐)
  shootingTimer: number         // 촬영 타이머 (초)
  isFlashing: boolean           // 플래시 효과 진행 중 여부
  isCapturing: boolean          // 캡쳐 진행 중 여부
  isSaving: boolean            // 저장 중 여부
  capturedImages: string[]      // 캡쳐된 이미지들 (base64)
  currentShootingCut: number    // 현재 촬영 중인 컷
  timerInterval: NodeJS.Timeout | null  // 타이머 인터벌 ID
}

export interface ShootingSliceActions {
  startShooting: (seconds: number) => void
  stopShooting: () => void
  updateShootingTimer: (seconds: number) => void
  startCapture: () => void
  completeCapture: (imageData: string, personIds?: string[]) => Promise<void>
  clearCapturedImages: () => void
  cleanupTimer: () => void
}

export type ShootingSlice = ShootingSliceState & ShootingSliceActions

export const defaultShootingSliceState: ShootingSliceState = {
  isShooting: false,
  shootingTimer: 0,
  isFlashing: false,
  isCapturing: false,
  isSaving: false,
  capturedImages: [],
  currentShootingCut: 0,
  timerInterval: null,
}

export const createShootingSlice = (set: any, get: any, roomName: string) => ({
  ...defaultShootingSliceState,
  
  startShooting: (seconds: number) => {
    console.log(`📸 Starting shooting countdown: ${seconds} seconds`)
    
    // 기존 타이머가 있으면 먼저 정리
    const { timerInterval, isRoomLeader } = get()
    if (timerInterval) {
      clearInterval(timerInterval)
      set({ timerInterval: null })
    }
    
    // 방장만 타이머 제어 (다른 참가자들은 동기화만 받음)
    if (!isRoomLeader) {
      console.log('⚠️ Only room leader can start shooting timer')
      return
    }
    
    // Yjs에 초기 상태 업데이트 (모든 참가자에게 동기화)
    const { updateShootingState } = require('./index')
    updateShootingState(roomName, {
      isShooting: true,
      shootingTimer: seconds,
      isCapturing: false
    })
    
    // 방장만 1초마다 타이머 카운트다운 실행
    const interval = setInterval(() => {
      const currentState = get()
      const currentTimer = currentState.shootingTimer
      
      if (currentTimer > 1) {
        // 타이머 감소
        const newTimer = currentTimer - 1
        console.log(`⏰ Timer countdown: ${newTimer}`)
        updateShootingState(roomName, {
          shootingTimer: newTimer
        })
      } else {
        // 타이머가 0에 도달 - 플래시 효과 시작
        console.log('📸 Timer reached 0 - starting flash effect!')
        clearInterval(interval)
        set({ timerInterval: null })
        
        // 플래시 효과 시작
        updateShootingState(roomName, {
          isShooting: false,
          shootingTimer: 0,
          isFlashing: true
        })
        
        // 플래시 효과 후 실제 캡쳐 시작
        setTimeout(() => {
          console.log('✨ Flash complete - starting capture!')
          updateShootingState(roomName, {
            isFlashing: false,
            isCapturing: true
          })
        }, 300) // 300ms 플래시 효과
      }
    }, 1000)
    
    // 인터벌 ID 저장
    set({ timerInterval: interval })
  },
  
  stopShooting: () => {
    console.log('⏹️ Stopping shooting')
    
    // 타이머 정리
    const { timerInterval } = get()
    if (timerInterval) {
      clearInterval(timerInterval)
      set({ timerInterval: null })
    }
    
    // Yjs에 상태 업데이트
    const { updateShootingState } = require('./index')
    updateShootingState(roomName, {
      isShooting: false,
      shootingTimer: 0,
      isFlashing: false,
      isCapturing: false,
      isSaving: false
    })
  },
  
  updateShootingTimer: (seconds: number) => {
    // Yjs에 타이머 업데이트
    const { updateShootingTimer } = require('./index')
    updateShootingTimer(roomName, seconds)
  },
  
  startCapture: () => {
    console.log('📷 Starting image capture')
    // Yjs에 캡쳐 시작 상태 업데이트
    const { updateShootingState } = require('./index')
    updateShootingState(roomName, {
      isShooting: false,
      shootingTimer: 0,
      isCapturing: true
    })
  },


  completeCapture: async (imageData: string, personIds: string[] = []) => {
    const { capturedImages, isRoomLeader, timerInterval, currentCutIndex, cutCount, roomName } = get()
    
    console.log(`✅ Capture completed! Cut ${currentCutIndex + 1}/${cutCount}`)
    console.log(`👥 Person IDs (left to right):`, personIds)
    console.log(`📊 PersonIds debug:`, {
      count: personIds.length,
      isEmpty: personIds.length === 0,
      values: personIds
    })
    
    // 타이머 정리 (혹시 남아있다면)
    if (timerInterval) {
      clearInterval(timerInterval)
      set({ timerInterval: null })
    }
    
    // 저장 중 상태 시작
    const { updateShootingState } = require('./index')
    updateShootingState(roomName, { 
      isCapturing: false,
      isSaving: true
    })
    
    // 방장인 경우에만 이미지 처리 및 상태 진행 제어
    if (isRoomLeader) {
      try {
        console.log(`📡 Processing image... (Cut ${currentCutIndex + 1}/${cutCount})`)
        
        // base64 데이터를 blob으로 변환
        const response = await fetch(imageData)
        const blob = await response.blob()
        
        // 스마트 파일명 생성: {roomId}_{cutIndex}.png
        const filename = `${roomName}_${currentCutIndex}.png`
        
        // FormData 생성
        const formData = new FormData()
        formData.append('file', blob, filename)
        formData.append('type', 'group')
        
        console.log(`⬆️ Uploading image: ${filename}`)
        
        // 이미지 업로드 API 호출
        const uploadResponse = await fetch('https://image.nearzoom.store/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`)
        }
        
        const uploadResult = await uploadResponse.json()
        console.log('📤 Upload response:', uploadResult)
        
        if (uploadResult.success && uploadResult.data?.file_url) {
          console.log(`💾 Image uploaded successfully! URL: ${uploadResult.data.file_url}`)
          
          // Photo 객체 생성
          const photo = {
            imgUrl: uploadResult.data.file_url,
            personIds: personIds,
            cutIndex: currentCutIndex,
            roomId: roomName,
            timestamp: Date.now()
          }
          
          console.log('📸 Created Photo object with personIds:', {
            hasPersonIds: personIds && personIds.length > 0,
            personIdsCount: personIds.length,
            photo: photo
          })
          
          // selectSlice에 Photo 객체를 cutIndex 위치에 저장
          const state = get()
          if (state.setPhotoAtIndex) {
            state.setPhotoAtIndex(photo, currentCutIndex)
            console.log(`📸 Photo stored at index ${currentCutIndex}:`, photo)
          } else {
            console.error('❌ setPhotoAtIndex function not available in state')
          }
          
          // 기존 localStorage 저장도 유지 (backwards compatibility)
          const newImages = [...capturedImages, uploadResult.data.file_url]
          set({ capturedImages: newImages })
          
          // 저장 완료 - 모든 상태 해제
          updateShootingState(roomName, { 
            isCapturing: false,
            isSaving: false,
            isShooting: false,
            shootingTimer: 0
          })
          
          // 성공 시에만 컷 진행 처리 (handleCutProgress 로직을 인라인으로 이동)
          console.log(`📊 Cut progress check: ${currentCutIndex + 1}/${cutCount}`)
          
          if (currentCutIndex < cutCount - 1) {
            // 0, 1, 2컷 완료 → 다음 컷으로 이동
            console.log(`➡️ Moving to next cut: ${currentCutIndex + 1 + 1}/${cutCount}`)
            setTimeout(() => {
              const { updateCurrentCutIndex } = require('./index')
              updateCurrentCutIndex(roomName, currentCutIndex + 1)
            }, 1000) // 1초 후 다음 컷으로
          } else if (currentCutIndex === cutCount - 1) {
            // 3번째 인덱스 (4컷) 완료 - 인덱스를 cutCount로 증가시켜서 버튼이 "촬영 완료"로 변경되도록 함
            console.log(`🎉 All cuts completed (${currentCutIndex + 1}/${cutCount})! Incrementing to show completion button`)
            const { updateCurrentCutIndex } = require('./index')
            updateCurrentCutIndex(roomName, currentCutIndex + 1) // 3 → 4로 즉시 증가
          }
          
        } else {
          throw new Error('Upload response missing file_url')
        }
        
      } catch (error) {
        console.error('❌ Image upload error:', error)
        alert('사진 업로드에 실패했습니다. 다시 시도해주세요.')
        
        // 에러 시에도 일단 모든 상태 해제
        updateShootingState(roomName, { 
          isCapturing: false,
          isSaving: false,
          isShooting: false,
          shootingTimer: 0
        })
      }
      
    } else {
      // 비방장은 API 호출 없이 모든 상태 해제 (컷 진행에 관여하지 않음)
      updateShootingState(roomName, { 
        isCapturing: false,
        isSaving: false,
        isShooting: false,
        shootingTimer: 0
      })
      
      console.log('📷 Capture completed (Non-host - no API call, no cut progression)')
    }
  },
  
  clearCapturedImages: () => {
    const { isRoomLeader } = get()
    
    if (isRoomLeader) {
      console.log('🗑️ Clearing all captured images (Host only)')
      
      // localStorage에서 이미지 삭제
      const { clearPhotosFromStorage } = require('../../utils/photoStorage')
      clearPhotosFromStorage(roomName)
      
      // 로컬 상태 초기화
      set({ capturedImages: [] })
    } else {
      console.log('⚠️ Only host can clear captured images')
    }
  },
  
  // 타이머 정리 함수 (컴포넌트 cleanup 시 사용)
  cleanupTimer: () => {
    const { timerInterval } = get()
    if (timerInterval) {
      clearInterval(timerInterval)
      set({ timerInterval: null })
      console.log('🧹 Timer interval cleaned up')
    }
  },
})
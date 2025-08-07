// Shooting Slice - 촬영 및 캡쳐 상태 관리

export interface ShootingSliceState {
  isShooting: boolean           // 촬영 중 여부 (카운트다운 및 캡쳐)
  shootingTimer: number         // 촬영 타이머 (초)
  isCapturing: boolean          // 캡쳐 진행 중 여부
  capturedImages: string[]      // 캡쳐된 이미지들 (base64)
  currentShootingCut: number    // 현재 촬영 중인 컷
  timerInterval: NodeJS.Timeout | null  // 타이머 인터벌 ID
}

export interface ShootingSliceActions {
  startShooting: (seconds: number) => void
  stopShooting: () => void
  updateShootingTimer: (seconds: number) => void
  startCapture: () => void
  completeCapture: (imageData: string) => Promise<void>
  clearCapturedImages: () => void
  cleanupTimer: () => void
}

export type ShootingSlice = ShootingSliceState & ShootingSliceActions

export const defaultShootingSliceState: ShootingSliceState = {
  isShooting: false,
  shootingTimer: 0,
  isCapturing: false,
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
        // 타이머가 0에 도달 - 촬영 시작
        console.log('📸 Timer reached 0 - starting capture!')
        clearInterval(interval)
        set({ timerInterval: null })
        
        // 캡쳐 상태로 전환
        updateShootingState(roomName, {
          isShooting: false,
          shootingTimer: 0,
          isCapturing: true
        })
        
        // 약간의 딜레이 후 캡쳐 완료 처리 (PhotoCanvas에서 자동 캡쳐됨)
        setTimeout(() => {
          // PhotoCanvas의 useEffect가 isCapturing을 감지하여 자동 캡쳐됨
        }, 100)
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
      isCapturing: false
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

  handleCutProgress: () => {
    const { currentCutIndex, cutCount, roomName } = get()
    
    console.log(`📊 Cut progress check: ${currentCutIndex + 1}/${cutCount}`)
    
    if (currentCutIndex < cutCount - 1) {
      // 0, 1, 2컷 완료 → 다음 컷으로 이동
      console.log(`➡️ Moving to next cut: ${currentCutIndex + 1 + 1}/${cutCount}`)
      setTimeout(() => {
        const { updateCurrentCutIndex } = require('./index')
        updateCurrentCutIndex(roomName, currentCutIndex + 1)
      }, 1000) // 1초 후 다음 컷으로
    } else if (currentCutIndex === cutCount - 1) {
      // 3번째 인덱스 (4컷) 완료 - SELECTING 상태로 전환
      console.log(`🎉 All cuts completed (${currentCutIndex + 1}/${cutCount})! Moving to SELECTING state`)
      setTimeout(() => {
        const { updatePhotoBoothState } = require('./index')
        const { PhotoBoothState } = require('./stateSlice')
        updatePhotoBoothState(roomName, PhotoBoothState.SELECTING)
      }, 1500) // 1.5초 후 SELECTING으로
    }
  },
  
  completeCapture: async (imageData: string) => {
    const { capturedImages, isRoomLeader, timerInterval, currentCutIndex, cutCount, roomName, handleCutProgress } = get()
    
    console.log(`✅ Capture completed! Cut ${currentCutIndex + 1}/${cutCount}`)
    
    // 타이머 정리 (혹시 남아있다면)
    if (timerInterval) {
      clearInterval(timerInterval)
      set({ timerInterval: null })
    }
    
    // 방장인 경우에만 이미지 처리 및 상태 진행 제어
    if (isRoomLeader) {
      try {
        console.log(`📡 Processing image... (Cut ${currentCutIndex + 1}/${cutCount})`)
        
        // TODO: 실제 API 호출 (현재는 Mock 처리)
        /*
        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData,
            roomName,
            cutIndex: currentCutIndex
          })
        })
        
        const result = await response.json()
        */
        
        // Mock API 응답 (실제 API 구현 전까지 사용)
        const mockResult = {
          success: true,
          imageUrl: `mock-photo-${roomName}-cut${currentCutIndex + 1}.jpg`
        }
        
        if (mockResult.success) {
          console.log(`💾 Image processed successfully! URL: ${mockResult.imageUrl}`)
          
          // 성공 시: 로컬 상태에 URL 저장
          const newImages = [...capturedImages, mockResult.imageUrl]
          set({ capturedImages: newImages })
          
          // 캡쳐 상태 해제
          const { updateShootingState } = require('./index')
          updateShootingState(roomName, { 
            isCapturing: false,
            isShooting: false,
            shootingTimer: 0
          })
          
          // 성공 시에만 컷 진행 처리
          handleCutProgress()
          
        } else {
          console.error('❌ API returned failure:', mockResult)
          // API 실패 시: 재시도를 위해 현재 상태 유지
          alert('사진 업로드에 실패했습니다. 다시 시도해주세요.')
          
          // 실패 시에도 일단 캡쳐 상태는 해제 (재촬영 가능하게)
          const { updateShootingState } = require('./index')
          updateShootingState(roomName, { 
            isCapturing: false,
            isShooting: false,
            shootingTimer: 0
          })
        }
        
      } catch (error) {
        console.error('❌ Image processing network error:', error)
        // 네트워크 에러 등: 현재 상태 유지하여 재시도 가능하게
        alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
        
        // 에러 시에도 일단 캡쳐 상태는 해제
        const { updateShootingState } = require('./index')
        updateShootingState(roomName, { 
          isCapturing: false,
          isShooting: false,
          shootingTimer: 0
        })
      }
      
    } else {
      // 비방장은 API 호출 없이 캡쳐 상태만 해제 (컷 진행에 관여하지 않음)
      const { updateShootingState } = require('./index')
      updateShootingState(roomName, { 
        isCapturing: false,
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
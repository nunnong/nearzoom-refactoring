'use client'

import { useParticipants, useLocalParticipant } from '@livekit/components-react'
import ControlPanel from '@/components/page/groupcall/ControlPanel'
import FrameColorSelector from '@/components/page/groupcall/photo-select/FrameColorSelector'
import PhotoCutSelector from '@/components/page/groupcall/photo-select/PhotoCutSelector'
import PhotoPicker from '@/components/page/groupcall/photo-select/PhotoPicker'
import WebCam from '@/components/page/groupcall/photo-select/WebCam'
import { cn } from '@/lib/utils'
import { usePhotoBoothStore } from '../../providers/PhotoBoothProvider'
import { PhotoBoothState } from '../../stores/photoboothStore'

interface PhotoSelectComponentProps {
  className?: string
}

export default function PhotoSelectComponent({
  className,
}: PhotoSelectComponentProps) {
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()

  // Yjs store에서 상태 가져오기
  const cutCount = usePhotoBoothStore(state => state.cutCount)
  const selectedPhotos = usePhotoBoothStore(state => state.selectedPhotos)
  const frameColor = usePhotoBoothStore(state => state.frameColor)
  const capturedImages = usePhotoBoothStore(state => state.capturedImages)

  // Yjs store 액션들
  const setCutCount = usePhotoBoothStore(state => state.setCutCount)
  const setSelectedPhotos = usePhotoBoothStore(state => state.setSelectedPhotos)
  const setFrameColor = usePhotoBoothStore(state => state.setFrameColor)
  const setPhotoBoothState = usePhotoBoothStore(state => state.setPhotoBoothState)

  // 실제 촬영된 사진들 사용 (하드코딩된 사진 대신)
  const capturedPhotos =
    capturedImages.length > 0
      ? capturedImages
      : [
          // 개발/테스트용 fallback 이미지들
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=400&fit=crop',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=400&fit=crop',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
        ]

  const frameColors = [
    '#FFFFFF',
    '#000000',
    '#929292',
    '#73c0ef',
    '#293e85',
    '#2D3243',
  ]

  const handleComplete = () => {
    if (selectedPhotos.length === cutCount) {
      console.log('🎉 Photo selection completed:', {
        cutCount,
        selectedPhotos,
        frameColor,
      })

      // 선택 완료 후 WAITING 상태로 돌아가거나 새로운 완료 상태로 전환
      setPhotoBoothState(PhotoBoothState.WAITING)

      // 선택된 사진들과 설정들이 이미 Yjs에 저장되어 있음
      // 다른 참가자들도 실시간으로 확인 가능
    }
  }

  const isCompleteDisabled = selectedPhotos.length !== cutCount

  return (
    <div className={cn('flex flex-1 gap-4 bg-gray-100 px-8 py-6', className)}>
      {/* 왼쪽: 사진 선택 영역 */}
      <div className="flex-1 rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-gray-600">
            원하는 컷 수를 선택하고 사진을 골라주세요
          </p>
        </div>

        <div className="mx-auto max-w-2xl space-y-6">
          {/* 컷 수 선택 */}
          <PhotoCutSelector cutCount={cutCount} onChange={setCutCount} />

          {/* 사진 선택 */}
          <PhotoPicker
            photos={capturedPhotos}
            cutCount={cutCount}
            selected={selectedPhotos}
            onSelect={setSelectedPhotos}
          />

          {/* 프레임 색상 선택 */}
          <FrameColorSelector
            frameColor={frameColor}
            onFrameColorChange={setFrameColor}
            palette={frameColors}
          />

          {/* 완료 버튼 */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleComplete}
              disabled={isCompleteDisabled}
              className={`rounded-lg px-8 py-3 text-lg font-semibold transition-all ${
                isCompleteDisabled
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                  : 'bg-[#2D3243] text-white shadow-lg hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95'
              }`}
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>

      {/* 오른쪽: 사이드바 (참가자 웹캠) */}
      {/* <div className="flex w-80 flex-col gap-6">
        <WebCam
          participants={participants}
          localParticipant={localParticipant}
        />
        <ControlPanel
          localParticipant={localParticipant}
          showLeaveButton={true}
        />
      </div> */}
    </div>
  )
}

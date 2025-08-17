'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAuthStore } from '@/stores/authStore'
import RoomPage from '@/components/page/room/RoomPage'
import UploadPhotoModal from '@/components/UploadPhotoModal'
import { roomAPI, JoinRoomData, getErrorMessage } from '@/lib/api/room'

type PageState =
  | 'loading'
  | 'success'
  | 'error'
  | 'login_required'
  | 'photo_upload'

export default function RoomTestSocialPage() {
  const { roomId } = useParams()
  const router = useRouter()

  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [roomData, setRoomData] = useState<JoinRoomData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  // 인증 상태 확인
  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) return

    // 1. 로그인되지 않은 경우
    if (!isAuthenticated) {
      console.log('❌ 로그인되지 않음 - 로그인 페이지로 리다이렉트')

      const currentUrl = `/room/${roomId}`

      console.log('💾 저장할 리다이렉트 URL:', currentUrl)
      localStorage.setItem('redirectAfterLogin', currentUrl)
      router.push('/login')
      return
    }

    // 2. 로그인은 되었지만 user 정보가 아직 없으면 대기
    if (!user) {
      console.log('⏳ 사용자 정보 로딩 중...')
      return
    }

    // 3. 로그인된 상태이고 user 정보도 있으면 참조사진 모달 표시
    console.log('✅ 로그인됨 - 참조사진 모달 표시')
    setPageState('photo_upload')
    setShowPhotoModal(true)
  }, [authLoading, isAuthenticated, user, roomId, router])

  // 방 참가 로직
  const handleRoomJoin = async () => {
    if (!roomId || typeof roomId !== 'string') {
      setPageState('error')
      setErrorMessage('유효하지 않은 방 ID입니다.')
      return
    }

    try {
      setPageState('loading')

      // 방 참가 API 호출 (방장/참여자 구분 없이 동일)
      console.log(`방 참가 시도: ${roomId}`)
      const response = await roomAPI.joinRoom(roomId)
      console.log('방 참가 성공:', response)

      setRoomData(response)
      setPageState('success')
    } catch (error: any) {
      console.error('방 참가 실패:', error)
      const message = getErrorMessage(error)
      setErrorMessage(message)

      // 방을 찾을 수 없는 경우
      if (error.response?.status === 404) {
        setPageState('error')
      } else {
        setPageState('error')
      }
    }
  }

  // 참조 사진 모달 완료 후 처리
  const handlePhotoComplete = () => {
    console.log('✅ 참조 사진 모달 완료')
    setShowPhotoModal(false)

    // 방 참가 진행
    handleRoomJoin()
  }

  // 로딩 중
  if (pageState === 'loading' || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold text-gray-700">
            방에 입장하고 있습니다...
          </div>
          <div className="text-sm text-gray-500">잠시만 기다려주세요</div>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (pageState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-xl font-semibold text-red-600">
            방 입장 실패
          </div>
          <div className="mb-6 text-gray-700">{errorMessage}</div>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-500 px-6 py-3 text-white hover:bg-blue-600"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // 성공 상태 - RoomPage 컴포넌트 렌더링
  if (pageState === 'success' && roomData) {
    return <RoomPage roomName={roomId as string} />
  }

  // 참조 사진 업로드 모달 표시
  if (pageState === 'photo_upload') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-xl font-semibold text-gray-700">
            방에 입장하기 전에
          </div>
          <div className="text-gray-500">
            AI 사진 합성을 위한 참조 사진을 설정해주세요
          </div>
        </div>

        {/* 참조 사진 업로드 모달 */}
        <UploadPhotoModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onComplete={handlePhotoComplete}
        />
      </div>
    )
  }

  return null
}

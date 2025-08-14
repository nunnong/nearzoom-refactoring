'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import WaitingPage from '@/components/page/groupcall/WaitingPage'
import UploadSelfieModal from '@/components/page/myroom/UploadSelfieModal' // 🔥 추가
import { roomAPI, JoinRoomData, getErrorMessage } from '@/lib/api/room'

type PageState = 'loading' | 'success' | 'error' | 'login_required' | 'photo_required' // 🔥 추가

export default function RoomJoinPage() {
  const { roomId } = useParams()
  const router = useRouter()

  const searchParams = useSearchParams()
  const isHost = searchParams?.get('isHost') === 'true'
  const skipJoin = searchParams?.get('skipJoin') === 'true'
  
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore() // 🔥 user 추가
  const { roomData: storedRoomData, clearRoomData } = useRoomStore()
  
  const [pageState, setPageState] = useState<PageState>('loading')
  const [roomData, setRoomData] = useState<JoinRoomData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showPhotoModal, setShowPhotoModal] = useState(false) // 🔥 추가
  
  // 실시간 갱신을 위한 상태
  const [lastParticipantCount, setLastParticipantCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 🔥 수정: 인증 및 참조사진 상태 확인
  useEffect(() => {
    if (authLoading) return

    // 1. 로그인되지 않은 경우
    if (!isAuthenticated) {
      console.log('❌ 로그인되지 않음 - 로그인 페이지로 리다이렉트')
      const currentUrl = `/room/${roomId}${isHost ? '?isHost=true&skipJoin=true' : ''}`
      localStorage.setItem('redirectAfterLogin', currentUrl)
      router.push('/login')
      return
    }

    // 2. 로그인되어 있지만 참조사진이 없는 경우
    if (isAuthenticated && user && !user.faceImageUrl) {
      console.log('❌ 참조사진 없음 - 참조사진 모달 표시')
      setPageState('photo_required')
      setShowPhotoModal(true)
      return
    }

    // 3. 방장이고 skipJoin=true인 경우 (방금 생성한 방) - 바로 입장
    if (isAuthenticated && user && user.faceImageUrl && isHost && skipJoin) {
      console.log('✅ 방장 - 바로 입장')
      loadHostData()
      return
    }

    // 4. 일반 참가자이거나 방장이지만 URL로 재접속한 경우 - 참조사진 확인 모달
    if (isAuthenticated && user && user.faceImageUrl && (!isHost || !skipJoin)) {
      console.log('📸 참조사진 확인 모달 표시')
      setPageState('photo_required')
      setShowPhotoModal(true)
      return
    }

  }, [authLoading, isAuthenticated, user, roomId, isHost, skipJoin, router])

  // 🔥 참조사진 모달 완료 후 처리
  const handlePhotoModalClose = () => {
    setShowPhotoModal(false)
    
    // 참조사진 처리 완료 후 방 입장 로직 실행
    if (roomId && typeof roomId === 'string') {
      if (skipJoin && isHost) {
        console.log('방장으로 접속 - Zustand store에서 데이터 로드')
        loadHostData()
      } else {
        console.log('참가자로 접속 - joinRoom API 호출')
        joinRoom(roomId)
      }
    }
  }

  // 방 정보 갱신 함수
  const refreshRoomData = async () => {
    if (!roomId || !isAuthenticated || pageState !== 'success') return
    
    try {
      setIsRefreshing(true)
      console.log('🔄 방 정보 실시간 갱신 중...', roomId)
      
      let numericRoomId: number | null = null
      if (typeof roomId === 'string') {
        numericRoomId = parseInt(roomId, 10)
      } else if (Array.isArray(roomId) && typeof roomId[0] === 'string') {
        numericRoomId = parseInt(roomId[0], 10)
      } else if (typeof roomId === 'number') {
        numericRoomId = roomId
      }
      if (numericRoomId === null || isNaN(numericRoomId)) {
        throw new Error('유효하지 않은 방 ID입니다')
      }
      
      const updatedRoomInfo = await roomAPI.getRoomInfo(numericRoomId)
      console.log('✅ 방 정보 갱신 성공:', updatedRoomInfo)
      
      const updatedRoomData: JoinRoomData = {
        ...roomData!,
        participantName: roomData?.participantName || updatedRoomInfo.participants[0]?.name || 'Unknown',
        createdAt: updatedRoomInfo.createdAt || roomData?.createdAt || new Date().toISOString(),
      }
      
      setRoomData(updatedRoomData)
      
      const newParticipantCount = updatedRoomInfo.participants?.length || 0
      if (newParticipantCount !== lastParticipantCount) {
        console.log('👥 참가자 수 변경 감지:', lastParticipantCount, '->', newParticipantCount)
        setLastParticipantCount(newParticipantCount)
        
        if (newParticipantCount > lastParticipantCount && lastParticipantCount > 0) {
          console.log('🎉 새로운 참가자가 입장했습니다!')
        }
      }
      
    } catch (error) {
      console.error('❌ 방 정보 갱신 실패:', error)
      
      const errorMsg = getErrorMessage(error)
      if (errorMsg.includes('로그인') || errorMsg.includes('인증')) {
        console.log('🔴 인증 에러 발생 - 로그인 페이지로 리다이렉트')
        const currentUrl = `/room/${roomId}`
        localStorage.setItem('redirectAfterLogin', currentUrl)
        router.push('/login')
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // 주기적 갱신 (10초마다)
  useEffect(() => {
    if (pageState !== 'success' || !isAuthenticated || !roomId) return

    const interval = setInterval(() => {
      console.log('⏰ 주기적 방 정보 갱신 (10초)')
      refreshRoomData()
    }, 10000)

    return () => clearInterval(interval)
  }, [pageState, isAuthenticated, roomId, lastParticipantCount])

  // 브라우저 포커스 시 갱신
  useEffect(() => {
    const handleFocus = () => {
      if (pageState === 'success' && isAuthenticated && roomId) {
        console.log('🔄 브라우저 포커스 - 방 정보 갱신')
        refreshRoomData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [pageState, isAuthenticated, roomId])

  // 가시성 변경 시 갱신 (탭 전환)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pageState === 'success' && isAuthenticated && roomId) {
        console.log('👁️ 탭 활성화 - 방 정보 갱신')
        setTimeout(() => refreshRoomData(), 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pageState, isAuthenticated, roomId])

  // 방 참가 함수
  const joinRoom = async (id: string) => {
    try {
      console.log(`방 ${id}에 참가 시도 중... (방장: ${isHost})`)

      const result = await roomAPI.joinRoom(id)

      console.log('방 참가 성공:', result)
      setRoomData(result)
      setPageState('success')
      
      setTimeout(() => refreshRoomData(), 2000)
      
    } catch (error) {
      console.error('방 참가 실패:', error)

      const errorMsg = getErrorMessage(error)
      setErrorMessage(errorMsg)

      if (errorMsg.includes('로그인') || errorMsg.includes('인증')) {
        console.log('🔴 인증 에러 발생 - 로그인 페이지로 리다이렉트')
        const currentUrl = `/room/${roomId}`
        localStorage.setItem('redirectAfterLogin', currentUrl)
        router.push('/login')
      } else {
        setPageState('error')
      }
    }
  }

  // 방장 데이터 로드 함수
  const loadHostData = () => {
    try {
      if (storedRoomData) {
        console.log('Zustand에서 방장 데이터 로드 성공:', storedRoomData)
        setRoomData(storedRoomData)
        setPageState('success')
        
        setTimeout(() => refreshRoomData(), 1000)
        
      } else {
        console.log('Zustand에 방장 데이터 없음')
        setErrorMessage('방 정보를 찾을 수 없습니다. 다시 시도해주세요.')
        setPageState('error')
      }
    } catch (error) {
      console.error('방장 데이터 로드 실패:', error)
      setErrorMessage('방 정보 로드 중 오류가 발생했습니다.')
      setPageState('error')
    }
  }

  const handleRetry = () => {
    if (roomId && typeof roomId === 'string') {
      setPageState('loading')
      setErrorMessage('')

      if (skipJoin && isHost) {
        loadHostData()
      } else {
        joinRoom(roomId)
      }
    }
  }

  const handleGoHome = () => {
    clearRoomData()
    router.push('/')
  }

  const handleShowLogin = () => {
    console.log('로그인 페이지로 이동')
    const currentUrl = `/room/${roomId}${isHost ? '?isHost=true&skipJoin=true' : ''}`
    localStorage.setItem('redirectAfterLogin', currentUrl)
    router.push('/login')
  }

  // 인증 로딩 중일 때
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-gray-600">인증 상태 확인 중...</p>
        </div>
      </div>
    )
  }

  // 🔥 참조사진 필요 상태
  if (pageState === 'photo_required') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-gray-600">참조사진 확인 중...</p>
        </div>
        
        {/* 🔥 UploadSelfieModal 사용 */}
        <UploadSelfieModal
          isOpen={showPhotoModal}
          onClose={handlePhotoModalClose}
          onImageUpdated={handlePhotoModalClose}
        />
      </div>
    )
  }

  // 로딩 상태
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-gray-600">
            {isHost ? '방 정보를 불러오는 중...' : '방에 참가하는 중...'}
          </p>
          <p className="text-sm text-gray-400">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  // 로그인 필요
  if (pageState === 'login_required') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">🔐</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-800">
            로그인이 필요합니다
          </h2>
          <p className="mb-6 text-gray-600">
            이어줌 서비스를 이용하려면 로그인해야 합니다.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleShowLogin}
              className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              로그인하기
            </button>
            <button
              onClick={handleGoHome}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (pageState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">❌</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-800">
            방 참가 실패
          </h2>
          <p className="mb-6 text-gray-600">{errorMessage}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              다시 시도
            </button>
            <button
              onClick={handleGoHome}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 성공 시 WaitingPage 렌더링
  if (pageState === 'success' && roomData) {
    return (
      <div className="relative">
        {/* 실시간 갱신 상태 표시 */}
        {isRefreshing && (
          <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              방 정보 업데이트 중...
            </div>
          </div>
        )}
        
        <WaitingPage
          roomData={roomData}
          isHost={isHost}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>예상치 못한 오류가 발생했습니다.</p>
    </div>
  )
}
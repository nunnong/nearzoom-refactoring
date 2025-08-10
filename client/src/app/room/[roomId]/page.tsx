'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import WaitingPage from '@/components/page/groupcall/WaitingPage'
import { roomAPI, JoinRoomData, getErrorMessage } from '@/lib/api/room'

type PageState = 'loading' | 'success' | 'error' | 'login_required'

export default function RoomJoinPage() {
  const { roomId } = useParams()
  const router = useRouter()

  const searchParams = useSearchParams()
  const isHost = searchParams?.get('isHost') === 'true'
  const skipJoin = searchParams?.get('skipJoin') === 'true'

  const [pageState, setPageState] = useState<PageState>('loading')
  const [roomData, setRoomData] = useState<JoinRoomData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // 방 참가 함수
  const joinRoom = async (id: string) => {
    try {
      console.log(`방 ${id}에 참가 시도 중... (방장: ${isHost})`)

      const result = await roomAPI.joinRoom(id)

      console.log('방 참가 성공:', result)
      setRoomData(result)
      setPageState('success')
    } catch (error) {
      console.error('방 참가 실패:', error)

      const errorMsg = getErrorMessage(error)
      setErrorMessage(errorMsg)

      if (errorMsg.includes('로그인') || errorMsg.includes('인증')) {
        setPageState('login_required')
      } else {
        setPageState('error')
      }
    }
  }

  // 방장 데이터 로드 함수
  const loadHostData = () => {
    try {
      // sessionStorage에서 roomData 가져오기
      const storedRoomData = sessionStorage.getItem('roomData')

      if (storedRoomData) {
        const parsedData = JSON.parse(storedRoomData)
        console.log('방장 데이터 로드 성공:', parsedData)
        setRoomData(parsedData)
        setPageState('success')

        // 사용 후 삭제 (보안 + 새로고침 시 재사용 방지)
        sessionStorage.removeItem('roomData')
      } else {
        // sessionStorage에 데이터가 없으면 에러 처리
        console.log('방장 데이터 없음')
        setErrorMessage('방 정보를 찾을 수 없습니다. 다시 시도해주세요.')
        setPageState('error')
      }
    } catch (error) {
      console.error('방장 데이터 로드 실패:', error)
      setErrorMessage('방 정보 로드 중 오류가 발생했습니다.')
      setPageState('error')
    }
  }

  useEffect(() => {
    if (roomId && typeof roomId === 'string') {
      if (/^\d+$/.test(roomId)) {
        if (skipJoin && isHost) {
          // 방장: API 호출 없이 sessionStorage에서 데이터 로드
          console.log('방장으로 접속 - sessionStorage에서 데이터 로드')
          loadHostData()
        } else {
          // 참가자: joinRoom API 호출
          console.log('참가자로 접속 - joinRoom API 호출')
          joinRoom(roomId)
        }
      } else {
        setErrorMessage('유효하지 않은 방 ID입니다.')
        setPageState('error')
      }
    } else {
      setErrorMessage('방 ID가 없습니다.')
      setPageState('error')
    }
  }, [roomId, skipJoin, isHost])

  const handleRetry = () => {
    if (roomId && typeof roomId === 'string') {
      setPageState('loading')
      setErrorMessage('')

      if (skipJoin && isHost) {
        // 방장: sessionStorage에서 데이터 로드
        loadHostData()
      } else {
        // 참가자: joinRoom API 호출
        joinRoom(roomId)
      }
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleShowLogin = () => {
    console.log('로그인 모달 열기')
    alert('로그인이 필요합니다. (로그인 모달 구현 예정)')
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
      <WaitingPage
        roomData={roomData}
        isHost={isHost} // ← 수정된 부분: false → isHost
      />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>예상치 못한 오류가 발생했습니다.</p>
    </div>
  )
}

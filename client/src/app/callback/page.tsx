'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import { API_BASE_URL } from '@/constants/api'

type PageState = 'loading' | 'success' | 'error'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleLoginSuccess, fetchUserInfo } = useAuth()

  const [state, setState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [processed, setProcessed] = useState(false)

  // 리다이렉트 목적지 계산 함수
  const getRedirectAfterLogin = () => {
    const returnUrl = searchParams.get('returnUrl')
    // 콜백까지 오기 전에 localStorage에 저장한 값
    const storedRedirect = typeof window !== 'undefined'
      ? localStorage.getItem('redirectAfterLogin')
      : null

    if (returnUrl) {
      return decodeURIComponent(returnUrl)
    } else if (storedRedirect) {
      return storedRedirect
    }
    return null
  }

  useEffect(() => {
    if (processed) return
    setProcessed(true)

    const processLoginCallback = async () => {
      try {
        setState('loading')

        // 에러 파라미터 확인
        const error = searchParams.get('error')
        if (error) {
          throw new Error(`OAuth2 인증 실패: ${error}`)
        }

        // refresh token으로 access token 요청
        const tokenResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!tokenResponse.ok) {
          throw new Error('Access token 요청 실패')
        }

        const tokenData = await tokenResponse.json()
        const accessToken = tokenData.data?.accessToken
        if (!accessToken) {
          console.error('토큰 응답 구조:', tokenData)
          throw new Error('Access token이 응답에 없습니다')
        }

        // 토큰 저장
        handleLoginSuccess(accessToken)

        // 사용자 정보 불러오기
        await fetchUserInfo()

        setState('success')

        // 참조 사진 여부 확인
        const userInfo = await fetch(`${API_BASE_URL}/user/userInfo`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        // 리다이렉트 목적지 읽기
        const redirectDest = getRedirectAfterLogin()

        if (userInfo.ok) {
          const userData = await userInfo.json()
          const hasReferencePhoto = userData.data?.faceImageUrl

          setTimeout(() => {
            if (!hasReferencePhoto) {
              // 참조사진 없으면 업로드 페이지로, 원래 URL을 returnUrl 파라미터로 전달
              if (redirectDest) {
                router.replace(`/upload-photo?returnUrl=${encodeURIComponent(redirectDest)}`)
              } else {
                router.replace('/upload-photo')
              }
            } else {
              // 참조사진 있으면 바로 원래 페이지로, 없으면 홈
              if (redirectDest) {
                router.replace(redirectDest)
              } else {
                router.replace('/')
              }
            }

            // localStorage 정리
            localStorage.removeItem('redirectAfterLogin')
            localStorage.removeItem('actionAfterLogin')
          }, 500)

        } else {
          // 사용자 정보 조회 실패 → fallback
          setTimeout(() => {
            if (redirectDest) {
              router.replace(redirectDest)
            } else {
              router.replace('/')
            }
            localStorage.removeItem('redirectAfterLogin')
            localStorage.removeItem('actionAfterLogin')
          }, 500)
        }

      } catch (error: any) {
        console.error('OAuth2 로그인 콜백 처리 중 오류:', error)
        setState('error')

        let friendlyMessage = '로그인 중 문제가 발생했습니다.'
        if (error.message?.includes('OAuth2 인증 실패')) {
          friendlyMessage = 'OAuth2 인증에 실패했습니다. 다시 시도해주세요.'
        } else if (error.message?.includes('전달되지 않았습니다')) {
          friendlyMessage = '인증 정보가 올바르지 않습니다.'
        } else if (error.status === 401) {
          friendlyMessage = '인증이 만료되었습니다. 다시 로그인해주세요.'
        } else if (error.status >= 500) {
          friendlyMessage = '서버에 일시적인 문제가 발생했습니다.'
        } else if (error.message?.includes('Network')) {
          friendlyMessage = '네트워크 연결을 확인해주세요.'
        }
        setErrorMessage(friendlyMessage)

        // 실패 시 저장 데이터 제거
        localStorage.removeItem('redirectAfterLogin')
        localStorage.removeItem('actionAfterLogin')

        setTimeout(() => {
          router.replace('/')
        }, 3000)
      }
    }

    processLoginCallback()
  }, [])

  // 로딩 UI
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 처리 중...</h2>
          <p className="text-gray-600">잠시만 기다려 주세요.</p>
        </div>
      </div>
    )
  }

  // 성공 UI
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 성공!</h2>
          <p className="text-gray-600">이동 준비 중...</p>
        </div>
      </div>
    )
  }

  // 에러 UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 실패</h2>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <p className="text-sm text-gray-500">잠시 후 자동으로 이동합니다.</p>
      </div>
    </div>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth'  
import { API_BASE_URL } from '@/constants/api'

type PageState = 'loading' | 'success' | 'error'

function CallbackContent() {
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleLoginSuccess, fetchUserInfo } = useAuth()
  
  const [state, setState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (processed) {
      return
    }
    
    setProcessed(true)
    const processLoginCallback = async () => {
      try {
        setState('loading')

        // OAuth2 인증 실패 체크
        const error = searchParams.get('error')
        if (error) {
          throw new Error(`OAuth2 인증 실패: ${error}`)
        }

        
        // refresh token으로 access token 요청
        const tokenResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // 쿠키 포함
        })

        if (!tokenResponse.ok) {
          throw new Error('Access token 요청 실패')
        }

        const tokenData = await tokenResponse.json()
        
        // ApiResponse 구조에서 데이터 추출
        const accessToken = tokenData.data?.accessToken
        if (!accessToken) {
          console.error('토큰 응답 구조:', tokenData)
          throw new Error('Access token이 응답에 없습니다')
        }

        // Zustand 스토어에 토큰 저장 (localStorage도 자동으로 저장됨)
        handleLoginSuccess(accessToken)

        // 사용자 정보 가져오기 (토큰 검증 포함)
        await fetchUserInfo()

        // 성공 상태로 변경
        setState('success')
        
        // 🔥 추가: 저장된 리다이렉트 정보 확인
        const redirectUrl = localStorage.getItem('redirectAfterLogin')
        const actionAfterLogin = localStorage.getItem('actionAfterLogin')
        
        // 사용자 정보를 가져온 후 참조 사진이 있는지 확인
        const userInfo = await fetch(`${API_BASE_URL}/user/userInfo`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        if (userInfo.ok) {
          const userData = await userInfo.json()
          const hasReferencePhoto = userData.data?.faceImageUrl
          
          // 🔥 수정: 리다이렉트 로직 개선
          setTimeout(() => {
            // 저장된 정보 정리
            localStorage.removeItem('redirectAfterLogin')
            localStorage.removeItem('actionAfterLogin')
            
            if (!hasReferencePhoto) {
              // 참조 사진이 없으면 업로드 페이지로
              if (redirectUrl) {
                // 업로드 완료 후 원래 페이지로 가기 위해 다시 저장
                localStorage.setItem('redirectAfterPhotoUpload', redirectUrl)
              }
              if (actionAfterLogin) {
                localStorage.setItem('actionAfterPhotoUpload', actionAfterLogin)
              }
              router.replace('/upload-photo')
            } else if (redirectUrl) {
              // 참조 사진이 있고 리다이렉트 URL이 있으면 해당 페이지로
              console.log('✅ 로그인 완료 - 저장된 URL로 리다이렉트:', redirectUrl)
              router.replace(redirectUrl)
            } else if (actionAfterLogin === 'createRoom') {
              // 방 생성 액션이 있으면 메인 페이지로 (방 생성은 메인에서 처리)
              console.log('✅ 로그인 완료 - 방 생성을 위해 메인으로')
              router.replace('/?action=createRoom')
            } else {
              // 기본적으로 메인 페이지로
              router.replace('/')
            }
          }, 2000)
        } else {
          // 사용자 정보를 가져오지 못한 경우
          setTimeout(() => {
            // 🔥 추가: 리다이렉트 정보가 있으면 해당 페이지로
            localStorage.removeItem('redirectAfterLogin')
            localStorage.removeItem('actionAfterLogin')
            
            if (redirectUrl) {
              router.replace(redirectUrl)
            } else {
              router.replace('/')
            }
          }, 3000)
        }
        
      } catch (error: any) {
        console.error('OAuth2 로그인 콜백 처리 중 오류:', error)
        setState('error')
        
        // 사용자 친화적인 에러 메시지 설정
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
        
        // 🔥 수정: 에러 시에도 저장된 정보 정리
        localStorage.removeItem('redirectAfterLogin')
        localStorage.removeItem('actionAfterLogin')
        
        // 3초 후 메인 페이지로 이동 (에러 시에도 메인으로)
        setTimeout(() => {
          router.replace('/')
        }, 3000)
      }
    }

    processLoginCallback()
  }, [])

  // 로딩 상태
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

  // 성공 상태
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
          <p className="text-gray-600">잠시 후 요청하신 페이지로 이동합니다.</p>
        </div>
      </div>
    )
  }

  // 에러 상태
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

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  )
}
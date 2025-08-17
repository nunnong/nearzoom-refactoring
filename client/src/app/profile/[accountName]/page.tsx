// src/app/profile/[accountName]/page.tsx - TypeScript 에러 수정된 버전

'use client'

import React, { useState, useEffect } from 'react'
import type { JSX } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import UserProfile from '@/components/page/profile/UserProfile'

// 동적 프로필 페이지 컴포넌트
const ProfilePage: React.FC = (): JSX.Element => {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuthStore()
  
  const [accountName, setAccountName] = useState<string | null>(null)
  const [isMyProfile, setIsMyProfile] = useState(false)
  const [profileCheckDone, setProfileCheckDone] = useState(false)

  // URL에서 accountName 추출 및 디코딩
  useEffect(() => {
    if (params?.accountName) {
      const decodedAccountName = decodeURIComponent(params.accountName as string)
      setAccountName(decodedAccountName)
      
      console.log('🔍 동적 라우팅 - accountName 추출:', {
        original: params.accountName,
        decoded: decodedAccountName
      })
    }
  }, [params])

  // 본인 프로필인지 확인
  useEffect(() => {
    if (!accountName || authLoading) {
      setProfileCheckDone(false)
      return
    }

    // 인증된 사용자만 서비스 이용 가능 - 인증 체크 필수
    if (!isAuthenticated || !currentUser) {
      console.log('❌ 인증되지 않은 사용자 - 서비스 이용 불가')
      setProfileCheckDone(false)
      return
    }

    const currentUserEmail = currentUser.email || ''
    const currentUserAccountName = (currentUser as any)?.accountName || currentUserEmail.split('@')[0] || currentUserEmail
    
    // 이메일 또는 계정명이 일치하면 내 프로필
    const isMyProfileCheck = currentUserEmail === accountName || 
                            currentUserAccountName === accountName ||
                            currentUserEmail.split('@')[0] === accountName
    
    console.log('🔍 본인 프로필 확인:', {
      accountName,
      currentUserEmail,
      currentUserAccountName,
      emailPrefix: currentUserEmail.split('@')[0],
      isMyProfile: isMyProfileCheck
    })

    if (isMyProfileCheck) {
      console.log('✅ 본인 프로필 감지 - /my로 리다이렉트')
      router.replace('/my')
      return
    }

    setIsMyProfile(false)
    setProfileCheckDone(true)
  }, [accountName, isAuthenticated, currentUser, authLoading, router])

  // 로딩 상태 - 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // accountName이 아직 없으면 로딩
  if (!accountName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 프로필 확인이 완료되지 않았으면 로딩
  if (!profileCheckDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로필 정보 확인 중...</p>
        </div>
      </div>
    )
  }

  // 본인 프로필인 경우는 이미 /my로 리다이렉트됨
  if (isMyProfile) {
    return <></>
  }

  // 다른 사용자 프로필 표시
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <UserProfile
            params={{ accountName }}
            postsPerPage={12}
            enableAutoLoad={true}
            className="max-w-4xl mx-auto"
          />
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
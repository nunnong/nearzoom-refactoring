// src/utils/profileNavigation.ts - 통합 프로필 라우팅 유틸리티

/**
 * 🔥 사용 예시:
 *
 * // 1. 게시물에서 사용자 프로필 클릭 시
 * handleUserProfileClick('john_doe', router, currentUser)
 *
 * // 2. 현재 사용자가 'john_doe'인 경우
 * // → /my 페이지로 이동
 *
 * // 3. 현재 사용자가 'jane_smith'인 경우
 * // → /user/profile?accountName=john_doe 페이지로 이동
 *
 * // 4. React Hook 사용
 * const { navigateToProfile } = useProfileNavigation(currentUser)
 * navigateToProfile('john_doe', router)
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// 🔥 사용자 정보 타입 (다양한 형태 지원)
interface User {
  id?: string | number
  userId?: string | number
  accountName?: string
  email?: string
  name?: string
}

// 🔥 메인 프로필 클릭 핸들러 함수
export const handleUserProfileClick = (
  targetAccountName: string | null | undefined,
  router: AppRouterInstance,
  currentUser?: User | null,
  options?: {
    debug?: boolean
    fallbackToExplore?: boolean
  }
) => {
  const { debug = false, fallbackToExplore = false } = options || {}

  if (debug) {
    console.log('🔍 사용자 프로필 클릭:', {
      targetAccountName,
      currentUser: currentUser?.accountName || currentUser?.email,
      currentUserFull: currentUser,
    })
  }

  // targetAccountName 유효성 검사
  if (!targetAccountName || targetAccountName.trim() === '') {
    console.error('❌ targetAccountName이 없거나 비어있습니다')
    if (fallbackToExplore) {
      router.push('/explore')
    }
    return
  }

  const cleanAccountName = targetAccountName.trim()

  if (debug) {
    console.log('🔍 정리된 계정명:', cleanAccountName)
  }

  // 현재 사용자인지 확인
  if (currentUser) {
    const currentUserAccountName = currentUser.accountName

    // 본인 프로필이면 /my로 이동 (accountName만으로 비교)
    if (currentUserAccountName && currentUserAccountName === cleanAccountName) {
      if (debug) {
        console.log('✅ 본인 프로필 클릭 - /my로 이동', {
          currentUserAccountName,
          targetAccountName: cleanAccountName,
          currentUser: currentUser,
        })
      }

      // 강제로 /my로 이동
      router.push('/my')
      return
    }
  }

  // 다른 사용자 프로필이면 /[accountName] 경로 사용
  const profileUrl = `/${cleanAccountName}`

  if (debug) {
    console.log('🔗 다른 사용자 프로필로 이동:', {
      targetAccountName: cleanAccountName,
      profileUrl,
    })
  }

  router.push(profileUrl)
}

// 🔥 React Hook으로 래핑된 버전
export const useProfileNavigation = (currentUser?: User | null) => {
  return {
    navigateToProfile: (accountName: string, router: AppRouterInstance) => {
      handleUserProfileClick(accountName, router, currentUser, { debug: true })
    },
  }
}

// 🔥 간단한 헬퍼 함수들
export const isOwnProfile = (
  targetAccountName: string,
  currentUser?: User | null
): boolean => {
  if (!currentUser || !targetAccountName) return false

  const currentUserAccountName = currentUser.accountName

  return currentUserAccountName === targetAccountName
}

export const getProfileUrl = (
  accountName: string,
  currentUser?: User | null
): string => {
  if (isOwnProfile(accountName, currentUser)) {
    return '/my'
  }
  return `/${accountName}`
}

// 🔥 타입 가드 함수들
export const hasValidAccountName = (
  user: any
): user is { accountName: string } => {
  return (
    user &&
    typeof user.accountName === 'string' &&
    user.accountName.trim() !== ''
  )
}

export const extractAccountName = (user: any): string | null => {
  if (hasValidAccountName(user)) {
    return user.accountName
  }

  if (user?.email && typeof user.email === 'string') {
    const emailPart = user.email.split('@')[0]
    return emailPart || user.email
  }

  return null
}

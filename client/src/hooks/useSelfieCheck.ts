'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkUserSelfie } from '@/utils/selfieCheck'
import { useAuthStore } from '@/stores/authStore'

interface UseSelfieCheckOptions {
  redirectTo?: string
  requireSelfie?: boolean
}

export const useSelfieCheck = (options: UseSelfieCheckOptions = {}) => {
  const { redirectTo = '/upload-selfie', requireSelfie = true } = options
  const [hasSelfie, setHasSelfie] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const checkSelfie = async () => {
      try {
        // 먼저 로그인 상태 확인
        const userLoggedIn = isAuthenticated
        if (!userLoggedIn) {
          // 로그인하지 않은 경우 체크하지 않고 넘어감
          setHasSelfie(true) // 로그인하지 않은 경우 셀피 체크를 우회
          setIsChecking(false)
          return
        }

        const selfieExists = checkUserSelfie()
        setHasSelfie(selfieExists)

        if (requireSelfie && !selfieExists) {
          // 현재 페이지를 returnUrl로 설정하여 업로드 후 돌아올 수 있도록 함
          const currentPath = window.location.pathname
          const returnUrl = encodeURIComponent(currentPath)
          router.push(`${redirectTo}?returnUrl=${returnUrl}`)
        }
      } catch (error) {
        console.error('Error checking selfie:', error)
        setHasSelfie(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkSelfie()
  }, [redirectTo, requireSelfie, router])

  return {
    hasSelfie,
    isChecking,
    recheckSelfie: () => {
      setIsChecking(true)
      const selfieExists = checkUserSelfie()
      setHasSelfie(selfieExists)
      setIsChecking(false)
    }
  }
}
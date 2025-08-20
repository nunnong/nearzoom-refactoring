import { useCallback, useState } from 'react'
import { shareLink, ShareData } from '@/utils/shareUtils'

export interface UseShareResult {
  share: (data: ShareData) => Promise<void>
  isSharing: boolean
  lastResult: 'shared' | 'copied' | 'error' | null
  lastMessage: string | null
}

/**
 * 링크 공유를 위한 React Hook
 * @returns share 함수와 상태 정보
 */
export const useShare = (): UseShareResult => {
  const [isSharing, setIsSharing] = useState(false)
  const [lastResult, setLastResult] = useState<'shared' | 'copied' | 'error' | null>(null)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const share = useCallback(async (data: ShareData) => {
    setIsSharing(true)
    setLastResult(null)
    setLastMessage(null)

    try {
      const result = await shareLink(data)
      
      if (result === 'shared') {
        setLastResult('shared')
        setLastMessage('링크가 공유되었습니다!')
      } else if (result === 'copied') {
        setLastResult('copied')
        setLastMessage('링크가 클립보드에 복사되었습니다!')
      } else {
        setLastResult('error')
        setLastMessage(result)
      }
    } catch (error) {
      setLastResult('error')
      setLastMessage(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsSharing(false)
    }
  }, [])

  return {
    share,
    isSharing,
    lastResult,
    lastMessage
  }
}

/**
 * 성공 메시지를 자동으로 지우는 useShare Hook
 * @param autoHideDelay 메시지를 자동으로 숨길 시간 (ms), 기본값: 3000
 */
export const useShareWithAutoHide = (autoHideDelay: number = 3000): UseShareResult => {
  const shareResult = useShare()

  // 성공 시 일정 시간 후 메시지 자동 제거
  const shareWithAutoHide = useCallback(async (data: ShareData) => {
    await shareResult.share(data)
    
    if (shareResult.lastResult === 'shared' || shareResult.lastResult === 'copied') {
      setTimeout(() => {
        shareResult.lastMessage && setLastMessage(null)
        shareResult.lastResult && setLastResult(null)
      }, autoHideDelay)
    }
  }, [shareResult, autoHideDelay])

  return {
    ...shareResult,
    share: shareWithAutoHide
  }
}
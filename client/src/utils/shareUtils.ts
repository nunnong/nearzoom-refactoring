/**
 * 링크 공유를 위한 유틸리티 함수들
 */

export interface ShareData {
  title?: string
  text?: string
  url: string
}

/**
 * Web Share API를 사용하여 링크를 공유하거나 클립보드에 복사
 * @param shareData 공유할 데이터
 * @returns 성공 시 'shared' 또는 'copied', 실패 시 에러 메시지
 */
export const shareLink = async (shareData: ShareData): Promise<'shared' | 'copied' | string> => {
  try {
    // Web Share API가 지원되는 경우
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData)
      return 'shared'
    }
    
    // Web Share API가 지원되지 않는 경우 클립보드에 복사
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url)
      return 'copied'
    }
    
    // 클립보드 API도 지원되지 않는 경우 fallback
    const textArea = document.createElement('textarea')
    textArea.value = shareData.url
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return 'copied'
    
  } catch (error) {
    if (error instanceof Error) {
      // 사용자가 공유를 취소한 경우
      if (error.name === 'AbortError') {
        return '공유가 취소되었습니다'
      }
      return `공유 실패: ${error.message}`
    }
    return '알 수 없는 오류가 발생했습니다'
  }
}

/**
 * 특정 이미지에 대한 공유 링크 생성
 * @param photoId 사진 ID
 * @param baseUrl 기본 URL (기본값: 현재 origin)
 * @returns 공유용 URL
 */
export const generatePhotoShareUrl = (photoId: string, baseUrl?: string): string => {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/photo/${photoId}`
}

/**
 * 방 공유 링크 생성
 * @param roomName 방 이름
 * @param baseUrl 기본 URL (기본값: 현재 origin)
 * @returns 방 공유용 URL
 */
export const generateRoomShareUrl = (roomName: string, baseUrl?: string): string => {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/room/${encodeURIComponent(roomName)}`
}

/**
 * 프로필 공유 링크 생성
 * @param accountName 계정명
 * @param baseUrl 기본 URL (기본값: 현재 origin)
 * @returns 프로필 공유용 URL
 */
export const generateProfileShareUrl = (accountName: string, baseUrl?: string): string => {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/user/profile?accountName=${encodeURIComponent(accountName)}`
}
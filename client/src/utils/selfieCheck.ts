/**
 * 사용자의 셀피 이미지 업로드 상태를 체크하는 유틸리티 함수들
 */

export const checkUserSelfie = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // localStorage에서 사용자의 셀피 이미지 확인
  const selfieData = localStorage.getItem('userSelfie')
  
  // TODO: 실제로는 서버에서 사용자의 이미지 업로드 상태를 확인해야 함
  // const userId = getUserId()
  // const response = await checkUserImageStatus(userId)
  // return response.hasImage
  
  return !!selfieData
}

export const getUserSelfie = (): string | null => {
  if (typeof window === 'undefined') return null
  
  return localStorage.getItem('userSelfie')
}

export const clearUserSelfie = (): void => {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('userSelfie')
}
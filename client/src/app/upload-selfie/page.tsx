'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import UploadSelfieModal from '@/components/page/myroom/UploadSelfieModal'

export default function UploadSelfiePage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // 페이지 로드 시 모달 열기
    setIsOpen(true)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    // 모달이 닫히면 이전 페이지로 돌아가기
    router.back()
  }

  const handleImageUpdated = () => {
    // 이미지 업데이트 후 myroom으로 이동
    router.push('/myroom')
  }

  return (
    <div>
      <UploadSelfieModal
        isOpen={isOpen}
        onClose={handleClose}
        onImageUpdated={handleImageUpdated}
      />
    </div>
  )
}
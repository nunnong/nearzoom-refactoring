'use client'

import React, { useEffect } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getImagesFromLocal,
  updateImageInLocal,
  deleteImageFromLocal,
  initializeTestImages,
} from '@/utils/localStorage'

import ImageArchive from './ImageArchive'
import SearchBox from './SearchBox'
import SideList from './SideList'

interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

interface UserProfile {
  profileImage?: string
  email?: string
  name?: string
}

interface DashboardProps {
  images?: ImageItem[]
  userProfile?: UserProfile
}

const Dashboard: React.FC<DashboardProps> = ({ images = [], userProfile }) => {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [imageList, setImageList] = useState<ImageItem[]>([])

  // localStorage에서 이미지 데이터 로드
  useEffect(() => {
    // 첫 로드 시 테스트 데이터 초기화
    initializeTestImages(images)

    // localStorage에서 데이터 로드
    const savedImages = getImagesFromLocal()
    console.log('📸 Loaded images from localStorage:', savedImages)
    setImageList(savedImages)
  }, [images])

  // 페이지 로드 시 localStorage 데이터 새로고침
  useEffect(() => {
    const handleStorageChange = () => {
      const savedImages = getImagesFromLocal()
      setImageList(savedImages)
    }

    // 다른 탭에서 localStorage 변경 시 동기화
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleUploadSelfie = (): void => {
    setActiveModal('upload')
  }

  const handleSaved = (): void => {
    setActiveModal('saved')
  }

  const handleAccount = (): void => {
    setActiveModal('account')
  }

  const closeModal = (): void => {
    setActiveModal(null)
  }

  const toggleSidebar = (): void => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleLike = (imageId: string): void => {
    const targetImage = imageList.find(img => img.id === imageId)
    const newIsLiked = !targetImage?.isLiked

    console.log(
      '❤️ Toggling like for image:',
      imageId,
      'Current state:',
      targetImage?.isLiked,
      '→ New state:',
      newIsLiked
    )

    // localStorage 업데이트
    updateImageInLocal(imageId, { isLiked: newIsLiked })

    // 로컬 상태 업데이트
    setImageList(prevImages =>
      prevImages.map(img =>
        img.id === imageId ? { ...img, isLiked: newIsLiked } : img
      )
    )
  }

  const handleShareInstagram = (imageId: string): void => {
    console.log('Share to Instagram:', imageId)
    // TODO: 인스타그램 공유 API 연동
  }

  const handleShareKakao = (imageId: string): void => {
    console.log('Share to KakaoTalk:', imageId)
    // TODO: 카카오톡 공유 API 연동
  }

  const handleDelete = (imageId: string): void => {
    console.log('Deleting image:', imageId)

    // localStorage에서 삭제
    deleteImageFromLocal(imageId)

    // 로컬 상태 업데이트
    setImageList(prevImages => prevImages.filter(img => img.id !== imageId))
  }

  const handleEdit = (imageId: string): void => {
    const imageToEdit = imageList.find(img => img.id === imageId)
    console.log(
      'Edit requested for image:',
      imageId,
      'Image data:',
      imageToEdit
    )

    if (imageToEdit && !imageToEdit.isEdited) {
      // drawing 페이지로 라우팅 (이미지 ID와 src, returnUrl을 쿼리 파라미터로 전달)
      const encodedSrc = encodeURIComponent(imageToEdit.src)
      const currentPath = window.location.pathname
      const encodedReturnUrl = encodeURIComponent(currentPath)
      router.push(
        `/drawing?id=${imageId}&src=${encodedSrc}&returnUrl=${encodedReturnUrl}`
      )
    } else if (imageToEdit?.isEdited) {
      console.log('Cannot edit: Image is already edited')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SideList
        isOpen={isSidebarOpen}
        userProfile={userProfile}
        onUploadSelfie={handleUploadSelfie}
        onSaved={handleSaved}
        onAccount={handleAccount}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div
        className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}
      >
        <header className="border-b bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                NearZoom Dashboard
              </h1>
            </div>
            <button
              onClick={toggleSidebar}
              className="hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 lg:block"
              aria-label="Toggle sidebar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        </header>

        <main className="p-8">
          <div className="mb-8 flex flex-col items-center">
            <h2 className="mb-8 text-xl font-semibold text-gray-800">
              SearchBox & ImageArchive 테스트
            </h2>
            <SearchBox />
          </div>
          <ImageArchive
            images={imageList}
            onLike={handleLike}
            onShareInstagram={handleShareInstagram}
            onShareKakao={handleShareKakao}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </main>
      </div>

      {activeModal === 'upload' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Upload Selfie</h3>
            <p className="mb-6 text-gray-600">
              셀피 업로드 기능이 여기에 구현됩니다.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={closeModal}
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'saved' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Saved Items</h3>
            <p className="mb-6 text-gray-600">
              저장된 항목들이 여기에 표시됩니다.
            </p>
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Account Settings</h3>
            <p className="mb-6 text-gray-600">
              계정 설정 페이지가 여기에 구현됩니다.
            </p>
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              >
                설정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

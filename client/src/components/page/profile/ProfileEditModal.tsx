'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  currentDescription: string
  profileImage?: string
  onSave: (data: { name: string; description: string }) => void
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentDescription,
  profileImage,
  onSave
}) => {
  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription)
  const [isLoading, setSaving] = useState(false)

  // 모달이 열릴 때마다 현재 값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setDescription(currentDescription)
    }
  }, [isOpen, currentName, currentDescription])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // 스크롤 방지
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleSave = async () => {
    if (!name.trim()) {
      alert('계정명을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      // 실제로는 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000)) // Mock API delay
      
      onSave({
        name: name.trim(),
        description: description.trim()
      })
      
      onClose()
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      alert('프로필 업데이트에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // 변경사항이 있으면 확인
    if (name !== currentName || description !== currentDescription) {
      if (window.confirm('변경사항이 저장되지 않습니다. 정말 닫으시겠습니까?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">프로필 편집</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 모달 컨텐츠 */}
        <div className="p-6 space-y-6">
          {/* 프로필 사진 (읽기 전용) */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={profileImage || '/api/placeholder/100/100'}
                alt="프로필 사진"
                className="w-24 h-24 rounded-full mx-auto border-4 border-gray-200"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 rounded-full flex items-center justify-center">
                {/* 프로필 사진은 수정 불가 표시 */}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              프로필 사진은 소셜 로그인 계정의 사진이 사용됩니다
            </p>
          </div>

          {/* 계정명 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 mr-2" />
              계정명
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="계정명을 입력하세요"
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                피드에 표시될 이름입니다
              </span>
              <span className="text-xs text-gray-400">
                {name.length}/20
              </span>
            </div>
          </div>

          {/* 피드 소개 입력 */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              피드 소개
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="피드에 대한 간단한 소개를 작성해보세요"
              maxLength={100}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                피드 상단에 표시됩니다
              </span>
              <span className="text-xs text-gray-400">
                {description.length}/100
              </span>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                저장 중...
              </div>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditModal
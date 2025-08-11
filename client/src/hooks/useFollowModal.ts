import { useState } from 'react';

export interface UseFollowModalReturn {
  isOpen: boolean;
  modalType: 'followers' | 'following';
  targetUserId: string;
  openFollowerModal: (userId: string) => void;
  openFollowingModal: (userId: string) => void;
  closeModal: () => void;
}

export const useFollowModal = (): UseFollowModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');
  const [targetUserId, setTargetUserId] = useState<string>('');

  const openFollowerModal = (userId: string) => {
    setTargetUserId(userId);
    setModalType('followers');
    setIsOpen(true);
  };

  const openFollowingModal = (userId: string) => {
    setTargetUserId(userId);
    setModalType('following');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    modalType,
    targetUserId,
    openFollowerModal,
    openFollowingModal,
    closeModal,
  };
};
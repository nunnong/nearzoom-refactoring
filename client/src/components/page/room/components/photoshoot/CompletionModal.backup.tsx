import { Dialog, Transition } from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Fragment } from 'react'

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompletionModal({ isOpen, onClose }: CompletionModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 배경 오버레이 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-30"
          leave="ease-in duration-150"
          leaveFrom="opacity-30"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#2D3243] bg-opacity-30" />
        </Transition.Child>
        
        {/* 모달 본체 */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8 flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <CheckCircleIcon className="h-14 w-14 text-[#C9D76D]" />
                <Dialog.Title
                  as="h3"
                  className="text-xl font-bold text-[#2D3243] mt-2"
                >
                  촬영 완료!
                </Dialog.Title>
                <p className="text-sm text-[#2D3243] opacity-80 text-center">
                  사진촬영이 완료되었습니다.<br />
                  다음 단계에서는 프레임, 배경 선택 과정이 이어집니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-3 rounded-lg bg-[#2D3243] text-[#F7DEFD] font-semibold py-2 transition hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95"
              >
                다음 단계로 이동
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
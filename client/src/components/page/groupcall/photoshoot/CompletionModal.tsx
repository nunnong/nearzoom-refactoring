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
        {/* 배경 오버레이 - 더 투명하게 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
        </Transition.Child>
        
        {/* 모달 본체 */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <Dialog.Panel className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 p-8 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircleIcon className="h-12 w-12 text-green-600" />
                </div>
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold text-gray-800"
                >
                  촬영 완료!
                </Dialog.Title>
                <p className="text-sm text-gray-600 text-center leading-relaxed">
                  사진촬영이 완료되었습니다.<br />
                  다음 단계에서는 프레임, 배경 선택 과정이 이어집니다.
                </p>
              </div>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#2d3243]/80 text-white font-semibold py-3 px-6 transition-all hover:bg-[#2d3243] hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#C4C8DA]/50"
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
import Image from "next/image"

export default function DecorativePadlocks() {
  return (
    <>
      {/* 왼쪽 상단 근처 */}
      <div className="absolute -top-14 left-8 transform rotate-12 z-10">
        <Image
          src="/image 84.png"
          alt="Decorative padlock"
          width={110}
          height={110}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>
      
      {/* 오른쪽 중간 높이 */}
      <div className="absolute top-6 right-3 transform -rotate-8 z-10">
        <Image
          src="/image 85.png"
          alt="Decorative padlock"
          width={95}
          height={95}
          className="hover:animate-bounce active:animate-pulse transition-transform duration-300"
        />
      </div>
      
      {/* 중앙 약간 왼쪽 */}
      <div className="absolute top-20 left-1/3 transform rotate-15 z-10">
        <Image
          src="/image 87.png"
          alt="Decorative padlock"
          width={105}
          height={105}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>

      {/* 왼쪽 하단 */}
      <div className="absolute -bottom-10 left-16 transform -rotate-22 z-10">
        <Image
          src="/image 88.png"
          alt="Decorative padlock"
          width={125}
          height={125}
          className="hover:animate-bounce active:animate-pulse transition-transform duration-300"
        />
      </div>
      
      {/* 오른쪽 하단 약간 안쪽 */}
      <div className="absolute bottom-4 right-1/4 transform rotate-25 z-10">
        <Image
          src="/image 86.png"
          alt="Decorative padlock"
          width={115}
          height={115}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>
    </>
  )
}
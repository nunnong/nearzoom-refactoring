import Image from "next/image"

export default function DecorativePadlocks() {
  return (
    <>
      <div className="absolute -top-8 left-1/4 transform -translate-x-1/2 z-10">
        <Image
          src="/image 84.png"
          alt="Decorative padlock"
          width={120}
          height={120}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>
      
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
        <Image
          src="/image 85.png"
          alt="Decorative padlock"
          width={120}
          height={120}
          className="hover:animate-pulse active:animate-pulse transition-transform duration-300"
        />
      </div>
      
      <div className="absolute -top-10 right-1/4 transform translate-x-1/2 z-10">
        <Image
          src="/image 87.png"
          alt="Decorative padlock"
          width={120}
          height={120}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>

      <div className="absolute -bottom-8 left-1/3 transform -translate-x-1/2 z-10">
        <Image
          src="/image 86.png"
          alt="Decorative padlock"
          width={120}
          height={120}
          className="hover:animate-pulse active:animate-pulse transition-transform duration-300"
        />
      </div>
      
      <div className="absolute -bottom-6 right-1/3 transform translate-x-1/2 z-10">
        <Image
          src="/image 88.png"
          alt="Decorative padlock"
          width={120}
          height={120}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>
    </>
  )
}
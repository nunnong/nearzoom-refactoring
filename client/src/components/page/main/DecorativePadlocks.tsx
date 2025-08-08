import Image from "next/image"

export default function DecorativePadlocks() {
  return (
    <>
      <div className="absolute -top-25 left-1/8 transform -translate-x-1/2 z-10">
        <Image
          src="/image 84.png"
          alt="Decorative padlock"
          width={180}
          height={180}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>
      
      <div className="absolute -top-7 right-1/5 transform -translate-x-1/2 z-10">
        <Image
          src="/image 85.png"
          alt="Decorative padlock"
          width={180}
          height={180}
          className="hover:animate-bounce active:animate-pulse transition-transform duration-300"
        />
      </div>
      
      <div className="absolute -top-25 right-1/8 transform translate-x-1/2 z-10">
        <Image
          src="/image 87.png"
          alt="Decorative padlock"
          width={180}
          height={180}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>

      <div className="absolute -bottom-25 left-1/4 transform -translate-x-1/2 z-10">
        <Image
          src="/image 88.png"
          alt="Decorative padlock"
          width={240}
          height={240}
          className="hover:animate-bounce active:animate-pulse transition-transform duration-300"
        />
      </div>
      
      <div className="absolute -bottom-6 right-1/4 transform translate-x-1/2 z-10">
        <Image
          src="/image 86.png"
          alt="Decorative padlock"
          width={180}
          height={180}
          className="hover:animate-bounce active:animate-bounce transition-transform duration-300"
        />
      </div>
    </>
  )
}
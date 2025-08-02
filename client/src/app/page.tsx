import Dashboard from '@/components/page/myroom/Dashboard'

export default function Home() {
  const testImages = [
    { 
      id: '1', 
      src: '/test.jpg', 
      alt: '테스트 이미지 1', 
      isEdited: false,
      hashtags: ['2024.01.15', '민수', '영희']
    },
    { 
      id: '2', 
      src: '/test2.jpg', 
      alt: '테스트 이미지 2', 
      isEdited: true,
      hashtags: ['2024.01.20', '철수']
    },
    { 
      id: '3', 
      src: '/test3.jpg', 
      alt: '테스트 이미지 3', 
      isEdited: false,
      hashtags: ['2024.02.01', '엄마', '아빠', '지현']
    },
    { 
      id: '4', 
      src: '/test4.jpg', 
      alt: '테스트 이미지 4', 
      isEdited: false,
      hashtags: ['2024.02.14', '수진']
    },
    { 
      id: '5', 
      src: '/test5.jpg', 
      alt: '테스트 이미지 5', 
      isEdited: true,
      hashtags: ['2024.02.28', '현우', '소영', '재민']
    },
    { 
      id: '6', 
      src: '/test6.jpg', 
      alt: '테스트 이미지 6', 
      isEdited: false,
      hashtags: ['2024.03.10', '은지', '태희']
    },
    { 
      id: '7', 
      src: '/test7.jpg', 
      alt: '테스트 이미지 7', 
      isEdited: false,
      hashtags: ['2024.03.22', '동현', '미나', '준호', '서연']
    },
    { 
      id: '8', 
      src: '/test8.png', 
      alt: '테스트 이미지 8', 
      isEdited: false,
      hashtags: ['2024.04.01', '용훈']
    },
  ]

  return <Dashboard images={testImages} />
}

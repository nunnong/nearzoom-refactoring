'use client'

import React, { useState, ChangeEvent } from 'react'

interface SearchBoxProps {
  onSearch?: (value: string) => void
  placeholder?: string
}

const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  placeholder = '# 태그를 통해 사진을 검색해 보세요 # 김싸피 # 250107',
}) => {
  const [searchValue, setSearchValue] = useState<string>('')

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      onSearch?.(searchValue)
    }
  }

  return (
    <div className="flex h-12 w-[630px] flex-shrink-0 items-center justify-center border-[5px] border-[#C4C8DA] bg-white px-0 py-2">
      <input
        type="text"
        value={searchValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-4 outline-none"
      />
    </div>
  )
}

export default SearchBox

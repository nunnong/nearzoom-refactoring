import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * className을 병합하는 유틸리티 함수
 * Tailwind CSS 클래스의 충돌을 방지합니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 문자열을 kebab-case로 변환
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 문자열을 camelCase로 변환
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
}
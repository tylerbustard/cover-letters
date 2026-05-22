import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const clamp = (value: number, min = 0, max = 255) => Math.min(Math.max(value, min), max)

export const hexToRgb = (hex: string) => {
  const sanitized = hex.replace('#', '')
  if (sanitized.length !== 6) {
    return { r: 0, g: 0, b: 0 }
  }
  const r = parseInt(sanitized.slice(0, 2), 16)
  const g = parseInt(sanitized.slice(2, 4), 16)
  const b = parseInt(sanitized.slice(4, 6), 16)
  return { r, g, b }
}

export const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (value: number) => clamp(Math.round(value)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const mixHex = (color: string, target: string, amount: number) => {
  const { r, g, b } = hexToRgb(color)
  const targetRgb = hexToRgb(target)
  const mix = (channel: number, targetChannel: number) => channel + (targetChannel - channel) * amount
  return rgbToHex(mix(r, targetRgb.r), mix(g, targetRgb.g), mix(b, targetRgb.b))
}

export const lighten = (color: string, amount: number) => mixHex(color, '#ffffff', amount)
export const darken = (color: string, amount: number) => mixHex(color, '#000000', amount)

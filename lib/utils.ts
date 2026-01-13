import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates a filename to a maximum length, adding ellipsis in the middle
 * @param filename The filename to truncate
 * @param maxLength Maximum length of the truncated filename (default: 30)
 * @returns Truncated filename with ellipsis in the middle if needed
 */
export function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) {
    return filename
  }
  
  // Split filename into name and extension
  const lastDotIndex = filename.lastIndexOf('.')
  let name = filename
  let extension = ''
  
  if (lastDotIndex > 0) {
    name = filename.substring(0, lastDotIndex)
    extension = filename.substring(lastDotIndex)
  }
  
  // Calculate available space for name (accounting for extension length)
  const availableSpace = maxLength - extension.length
  
  if (availableSpace <= 3) {
    // Not enough space, just truncate the whole thing
    return filename.substring(0, maxLength - 3) + '...'
  }
  
  // Truncate name and add extension
  const halfLength = Math.floor((availableSpace - 3) / 2)
  return (
    name.substring(0, halfLength) + 
    '...' + 
    name.substring(name.length - (availableSpace - halfLength - 3)) + 
    extension
  )
}

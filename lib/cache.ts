import { revalidatePath } from 'next/cache'

export function revalidatePaths(paths: string[]) {
  paths.forEach(path => revalidatePath(path))
}

import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Category } from '../../types/api'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/marketplace/categories'),
    staleTime: 5 * 60_000,
  })
}

/** Tree -> flat list with indented labels, for <select>s. */
export function flattenCategories(tree: Category[], depth = 0): { uuid: string; slug: string; label: string }[] {
  return tree.flatMap((c) => [
    { uuid: c.uuid, slug: c.slug, label: `${'  '.repeat(depth * 2)}${c.name}` },
    ...flattenCategories(c.children, depth + 1),
  ])
}

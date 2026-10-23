export function mergeById<T extends { id: string }>(current: T[] = [], incoming: T[] = []): T[] {
  const map = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) {
    map.set(item.id, { ...map.get(item.id), ...item })
  }
  return Array.from(map.values())
}

export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id)
  if (index === -1) {
    return [item, ...list]
  }
  const next = [...list]
  next[index] = { ...next[index], ...item }
  return next
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id)
}

export function applyRemoteVote<T extends { upvotes: number; upvoted?: boolean }>(
  item: T,
  isUpvoted: boolean,
): T {
  if (item.upvoted === isUpvoted) {
    return item
  }
  return {
    ...item,
    upvoted: isUpvoted,
    upvotes: Math.max(item.upvotes + (isUpvoted ? 1 : -1), 0),
  }
}

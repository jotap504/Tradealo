export function encodeCursor(data: { createdAt: Date; id: string; typeRank?: number }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string; typeRank?: number } {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as {
    createdAt: string
    id: string
    typeRank?: number
  }
  return {
    createdAt: new Date(decoded.createdAt),
    id: decoded.id,
    typeRank: decoded.typeRank,
  }
}

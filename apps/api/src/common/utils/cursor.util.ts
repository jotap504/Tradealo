export function encodeCursor(data: { createdAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as {
    createdAt: string
    id: string
  }
  return { createdAt: new Date(decoded.createdAt), id: decoded.id }
}

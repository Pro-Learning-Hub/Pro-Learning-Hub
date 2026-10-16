import { io, type Socket } from 'socket.io-client'

const baseUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_ORIGIN || ''

let socket: Socket | null = null
let handshakeToken: string | null = null

export function setSocketAuthToken(token?: string | null): void {
  handshakeToken = token ?? null
}

export function connectSocket(token?: string | null): Promise<Socket> {
  if (token) {
    handshakeToken = token
  }

  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket)
      return
    }

    socket = io(baseUrl || window.location.origin, {
      auth: handshakeToken ? { token: handshakeToken } : undefined,
      withCredentials: true,
      transports: ['websocket'],
      path: '/socket.io',
    })

    socket.on('connect', () => resolve(socket!))
    socket.on('connect_error', (err) => reject(err))
  })
}

export function disconnectSocket(): void {
  handshakeToken = null
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}

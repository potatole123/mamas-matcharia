import { API_BASE_URL, Fetch } from '../Fetch'

export const MIN_MULTIPLAYER_PLAYERS = 2
export const MAX_MULTIPLAYER_PLAYERS = 4

export type MultiplayerGame = {
  gameId: string
  creatorId: string
  playerIds: string[]
  results: unknown[]
  session: string
  groupCode: string
  ranking: string[]
  npcSeed: number
  startedAt: string | null
  createdAt: string
  updatedAt: string
}

export type MultiplayerGameResponse = {
  game: MultiplayerGame
}

export type MultiplayerRoom = {
  game: MultiplayerGame
  playerCount: number
  minPlayers: number
  maxPlayers: number
  canStart: boolean
}

type GameplaySessionResponse = {
  session: {
    activeGame: MultiplayerGame | null
    activeGameModel: string | null
  } | null
}

export async function createMultiplayerGame(token: string) {
  return Fetch<MultiplayerGameResponse>('/api/game/multiplayer', {
    method: 'POST',
    token,
    body: {},
  })
}

export async function joinMultiplayerGame(joinCode: string, token: string) {
  return Fetch<MultiplayerGameResponse>('/api/game/multiplayer/join', {
    method: 'POST',
    token,
    body: { joinCode },
  })
}

export async function leaveMultiplayerGame(token: string) {
  return Fetch<null>('/api/game/multiplayer/current/player', {
    method: 'DELETE',
    token,
  })
}

export async function endMultiplayerGame(token: string) {
  return Fetch<null>('/api/game/multiplayer/current', {
    method: 'DELETE',
    token,
  })
}

export function releaseMultiplayerRoomOnPageExit(token: string, isCreator: boolean) {
  const path = isCreator
    ? '/api/game/multiplayer/current'
    : '/api/game/multiplayer/current/player'

  void fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    keepalive: true,
  }).catch(() => undefined)
}

export async function startMultiplayerGame(token: string) {
  return Fetch<MultiplayerGameResponse>('/api/game/multiplayer/current/start', {
    method: 'POST',
    token,
    body: {},
  })
}

export function toMultiplayerRoom(game: MultiplayerGame): MultiplayerRoom {
  const playerCount = game.playerIds.length

  return {
    game,
    playerCount,
    minPlayers: MIN_MULTIPLAYER_PLAYERS,
    maxPlayers: MAX_MULTIPLAYER_PLAYERS,
    canStart:
      playerCount >= MIN_MULTIPLAYER_PLAYERS &&
      playerCount <= MAX_MULTIPLAYER_PLAYERS,
  }
}

export async function getCurrentMultiplayerRoom(token: string) {
  const { session } = await Fetch<GameplaySessionResponse>('/api/session', { token })

  if (session?.activeGameModel !== 'MultiplayerGameState') {
    return null
  }

  return session.activeGame ? toMultiplayerRoom(session.activeGame) : null
}

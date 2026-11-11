export interface SeatPoint {
  angle: number
  x: number
  y: number
}

const DEG = Math.PI / 180

/** Opponents spread around the top arc of the oval, leaving the bottom to the local player. */
export function opponentSeats(count: number): SeatPoint[] {
  if (count <= 0) return []
  const point = (angle: number): SeatPoint => ({
    angle,
    x: 50 + 41 * Math.cos(angle * DEG),
    y: 46 + 36 * Math.sin(angle * DEG),
  })
  if (count === 1) return [point(270)]
  const start = 162
  const end = 378
  const step = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, index) => point(start + step * index))
}

/** The whole lobby sits around the full oval, with the local player at the bottom. */
export function lobbySeats(count: number): SeatPoint[] {
  const total = Math.max(count, 1)
  return Array.from({ length: count }, (_, index) => {
    const angle = 90 + (360 / total) * index
    return {
      angle,
      x: 50 + 39 * Math.cos(angle * DEG),
      y: 49 + 35 * Math.sin(angle * DEG),
    }
  })
}

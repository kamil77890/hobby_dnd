// app/api/db/encounters/route.js
import { prisma } from '@/lib/prisma'

export async function GET() {
  const encounters = await prisma.encounter.findMany({
    include: {
      players: { include: { hero: true } },
      monsters: { include: { monster: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return new Response(JSON.stringify(encounters), { status: 200 })
}

export async function POST(req) {
  const data = await req.json()
  const encounter = await prisma.encounter.create({ 
    data: {
      ...data,
      players: data.players ? {
        create: data.players.map(p => ({
          heroId: p.heroId,
          hp: p.hp,
          maxHp: p.maxHp,
          ac: p.ac,
          initiative: p.initiative
        }))
      } : undefined,
      monsters: data.monsters ? {
        create: data.monsters.map(m => ({
          monsterId: m.monsterId,
          hp: m.hp,
          maxHp: m.maxHp,
          ac: m.ac,
          initiative: m.initiative
        }))
      } : undefined
    },
    include: {
      players: { include: { hero: true } },
      monsters: { include: { monster: true } }
    }
  })
  return new Response(JSON.stringify(encounter), { status: 201 })
}
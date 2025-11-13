import { prisma } from '@/lib/prisma'

export async function GET() {
  const battles = await prisma.battle.findMany({
    orderBy: { occurredAt: 'desc' }
  })
  return new Response(JSON.stringify(battles), { status: 200 })
}

export async function POST(req) {
  const data = await req.json()
  const battle = await prisma.battle.create({ data })
  return new Response(JSON.stringify(battle), { status: 201 })
}

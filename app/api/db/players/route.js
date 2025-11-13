import { prisma } from '@/lib/prisma'

export async function GET() {
  const players = await prisma.hero.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return new Response(JSON.stringify(players), { status: 200 })
}

export async function POST(req) {
  const data = await req.json()
  const player = await prisma.hero.create({ data })
  return new Response(JSON.stringify(player), { status: 201 })
}

export async function PUT(req) {
  const { id, ...data } = await req.json()
  const player = await prisma.hero.update({
    where: { id },
    data
  })
  return new Response(JSON.stringify(player), { status: 200 })
}

export async function DELETE(req) {
  const { id } = await req.json()
  await prisma.hero.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
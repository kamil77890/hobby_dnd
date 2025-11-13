// app/api/db/monsters/route.js
import { prisma } from '@/lib/prisma'

export async function GET() {
  const monsters = await prisma.monster.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return new Response(JSON.stringify(monsters), { status: 200 })
}

export async function POST(req) {
  const data = await req.json()
  const monster = await prisma.monster.create({ data })
  return new Response(JSON.stringify(monster), { status: 201 })
}

export async function PUT(req) {
  const { id, ...data } = await req.json()
  const monster = await prisma.monster.update({
    where: { id },
    data
  })
  return new Response(JSON.stringify(monster), { status: 200 })
}

export async function DELETE(req) {
  const { id } = await req.json()
  await prisma.monster.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
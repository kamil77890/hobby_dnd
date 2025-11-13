import { prisma } from '@/lib/prisma'

export async function GET() {
  const stories = await prisma.story.findMany({
    include: { hero: true },
    orderBy: { createdAt: 'desc' }
  })
  return new Response(JSON.stringify(stories), { status: 200 })
}

export async function POST(req) {
  const data = await req.json()
  const story = await prisma.story.create({ data })
  return new Response(JSON.stringify(story), { status: 201 })
}

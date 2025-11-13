import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const dailyLogs = await prisma.dailyLog.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return new Response(JSON.stringify(dailyLogs), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const data = await req.json()
    const dailyLog = await prisma.dailyLog.create({ 
      data: {
        content: data.content,
        type: data.type || 'note'
      }
    })
    return new Response(JSON.stringify(dailyLog), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
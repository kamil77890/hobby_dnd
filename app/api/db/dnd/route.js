import { prisma } from '@/lib/prisma'

export async function POST(req) {
  const { type, data } = await req.json();

  try {
    switch(type) {
      case 'player':
        const player = await prisma.player.create({ data });
        return new Response(JSON.stringify(player), { status: 201 });
      case 'monster':
        const monster = await prisma.monster.create({ data });
        return new Response(JSON.stringify(monster), { status: 201 });
      case 'encounter':
        const encounter = await prisma.encounter.create({ data });
        return new Response(JSON.stringify(encounter), { status: 201 });
      default:
        return new Response("Invalid type", { status: 400 });
    }
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

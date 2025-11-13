import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 30

function isModelMessageLike(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(item =>
    item && typeof item.role === 'string' &&
    ['system', 'user', 'assistant', 'tool'].includes(item.role)
  )
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const input = (body && body.data !== undefined) ? body.data : body

    let messages
    if (isModelMessageLike(input)) {
      messages = input.map(m => {
        let content = ''
        if (typeof m.content === 'string') content = m.content
        else if (m.content?.text) content = String(m.content.text)
        else content = JSON.stringify(m.content)
        return { role: m.role, content }
      })
    } else {
      messages = [
        {
          role: 'system',
          content: `
You are an ancient bard and battle historian. 
Your duty is to transform combat data into a brief, yet vivid chronicle. 
Write as if engraving the events into the annals of history — epic, emotional, and rich in tone. 
Include actual numbers and statistics (damage dealt, number of enemies, total hits, etc.) 
but weave them naturally into the narrative. 
The result must be a short story — **no more than 4 sentences**. 
Never mention JSON or data; speak as if you witnessed the clash yourself.`
        },
        {
          role: 'user',
          content: `
Turn the following battle data into a short, dramatic chronicle with real numbers included:

${JSON.stringify(input, null, 2)}

Describe it as a brief legend of valor and fury in up to 4 sentences.`
        }
      ]
    }

    const result = await generateText({
      model: google('models/gemini-2.0-flash'),
      messages,
    })

    const summary =
      result?.text ??
      result?.output_text ??
      ((result?.output?.[0]?.content && result.output[0].content.map(c => c.text || c).join('\n')) ?? null) ??
      JSON.stringify(result)

    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('AI API Error:', err)
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const runtime = 'nodejs'; // <- ważne: wymusza serwerowy runtime Node

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || 'AIzaSyC81slEQ-WxyPfP0vLQYw2okh6gQC_PNio');

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const text = formData.get('text') || '';

    let imageData = null;
    if (file) {
      const buffer = await file.arrayBuffer();
      imageData = {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: file.type,
        },
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      You are an expert in analyzing Dungeons & Dragons character sheets.
      Your task is to extract all structured information you can find from the provided image or text description.

      Always return a single valid JSON object with the fields:
      {
        "name": "...",
        "className": "...",
        "hp": NUMBER,
        "maxHp": NUMBER,
        "ac": NUMBER,
        "initiative": NUMBER,
        "lore": "...",
        "extras": [
          { "key": "lowercase_with_underscores", "value": "..." }
        ]
      }

      - Put any additional info you find into "extras" as { key, value } entries (keys lowercase_with_underscores).
      - Include attributes like race, level, stats (strength, dexterity, ...), skills, spells, weapons, inventory, proficiencies, subclass, alignment etc.
      - Do not duplicate main fields inside extras.
      - Make numbers numeric when possible.
      - If a value is uncertain, omit it or include best-effort in extras; do not invent exact numbers.
      - Return ONLY valid JSON — no commentary, no extra text.
      ${text ? `\nAlso analyze this text description:\n${text}\n` : ''}
    `;

    const contents = [];
    if (imageData) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }, imageData],
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const responseText = response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extractedData = JSON.parse(jsonMatch[0]);

      const cleanedData = {
        name: extractedData.name || 'New Hero',
        className: (extractedData.className || 'fighter').toString().toLowerCase(),
        hp: Number(extractedData.hp) || 20,
        maxHp: Number(extractedData.maxHp) || Number(extractedData.hp) || 20,
        ac: Number(extractedData.ac) || 10,
        initiative: Number(extractedData.initiative) || 10,
        lore: extractedData.lore || '',
        extras: Array.isArray(extractedData.extras)
          ? extractedData.extras.map(e => ({ key: (e.key||'').toString().toLowerCase(), value: e.value ?? '' }))
          : []
      };

      return NextResponse.json(cleanedData);
    } else {
      throw new Error('No valid JSON found in AI response');
    }
  } catch (error) {
    console.error('Error in player extraction:', error);
    return NextResponse.json({ error: 'Failed to extract player data', details: error.message }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };

import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND.replace('/api/v1', '')}/health`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Backend unreachable' },
      { status: 502 }
    );
  }
}

// app/api/check-room/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { roomId } = await request.json();

  // Call your Spring Boot backend here
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL as string;

  const res = await fetch(`${backendUrl}/api/room/${roomId}`);

  if (res.status === 302 || res.status === 200) {
    const data = await res.json();
    return NextResponse.json({ room: data }, { status: 200 });
  }

  // Try to create the room
  const createRes = await fetch(`${backendUrl}/api/room/create-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId }),
  });

  if (createRes.status === 201) {
    const newRoom = await createRes.json();
    return NextResponse.json({ room: newRoom }, { status: 200 });
  }

  return NextResponse.json({ message: 'Room not found and could not be created' }, { status: 400 });
}

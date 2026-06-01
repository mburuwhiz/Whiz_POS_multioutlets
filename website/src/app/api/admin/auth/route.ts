import { NextResponse } from 'next/server';
import { setAdminSessionCookie, clearAdminSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Secure environment credential checking
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Issuing a fake JWT for session tracking (In a real app, sign a true JWT here)
            const mockToken = Buffer.from(JSON.stringify({ email, role: 'admin', exp: Date.now() + 86400000 })).toString('base64');
            setAdminSessionCookie(mockToken);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    } catch (e: any) {
        return NextResponse.json({ error: 'Authentication processing error' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        clearAdminSessionCookie();
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
}

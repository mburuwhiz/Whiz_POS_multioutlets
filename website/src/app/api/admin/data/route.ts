import { NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { getAdminSessionCookie } from '@/lib/auth/session';

export async function GET(request: Request) {
    try {
        const sessionToken = getAdminSessionCookie();

        // Ensure the requester is an authenticated admin via secure httpOnly cookie
        if (!sessionToken) {
            return NextResponse.json({ error: 'Unauthorized: No active admin session' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');

        if (!table) return NextResponse.json({ error: 'Missing table param' }, { status: 400 });

        // Super minimal validation for authorized table names
        const allowedTables = ['transactions', 'products', 'users', 'expenses', 'salaries', 'credit_customers', 'suppliers'];
        if (!allowedTables.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

        const client = getTursoClient();

        try {
            const rs = await client.execute(`SELECT * FROM ${table}`);
            const results = rs.rows.map(row => {
                const item: any = {};
                for (const col of rs.columns) {
                    item[col] = row[col];
                }
                return item;
            });
            return NextResponse.json({ [table]: results }, { status: 200 });
        } catch (e) {
             console.error(`Error fetching table ${table}`, e);
             return NextResponse.json({ [table]: [] }, { status: 200 });
        }

    } catch (e: any) {
        return NextResponse.json({ error: 'Internal API Error' }, { status: 500 });
    }
}

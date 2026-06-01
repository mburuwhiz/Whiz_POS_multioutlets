import { cookies } from 'next/headers';

export const setAdminSessionCookie = (token: string) => {
    cookies().set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24
    });
};

export const getAdminSessionCookie = () => {
    return cookies().get('admin_session')?.value;
};

export const setBusinessSessionCookie = (token: string) => {
    cookies().set('business_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24
    });
};

export const getBusinessSessionCookie = () => {
    return cookies().get('business_session')?.value;
};

export const clearAdminSessionCookie = () => {
    cookies().delete('admin_session');
};

export const clearBusinessSessionCookie = () => {
    cookies().delete('business_session');
};

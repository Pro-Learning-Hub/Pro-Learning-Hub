import { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';

export function cookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAccessTokenCookie(res: Response, token: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, cookieOptions());
}

export function clearAccessTokenCookie(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...cookieOptions(), maxAge: 0 });
}

export function formatAuthUser(user: {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  pictureThumbnail: string | null;
  pictureUrl: string | null;
  username?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    pictureThumbnail: user.pictureThumbnail,
    pictureUrl: user.pictureUrl,
    username: user.username ?? undefined,
  };
}

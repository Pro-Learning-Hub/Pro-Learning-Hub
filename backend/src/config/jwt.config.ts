import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (): JwtModuleOptions => {
  const secret = process.env.TOKEN_SECRET_KEY;
  if (!secret) throw new Error('TOKEN_SECRET_KEY environment variable is not set');
  return {
    secret,
    signOptions: { expiresIn: '7d' },
  };
};

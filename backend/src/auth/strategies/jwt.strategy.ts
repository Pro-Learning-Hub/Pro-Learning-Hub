import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../cookie';
import { RequestUser } from '../../common/decorators/current-user.decorator';

function cookieOrBearer(req: Request): string | null {
  const cookieToken = req?.cookies?.[ACCESS_TOKEN_COOKIE];
  if (cookieToken) {
    return cookieToken;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.TOKEN_SECRET_KEY;
    if (!secret) {
      throw new InternalServerErrorException('TOKEN_SECRET_KEY environment variable is not set');
    }
    super({
      jwtFromRequest: cookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { userId?: string; courseId?: string; role?: string }): Promise<RequestUser> {
    if (!payload.userId) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.userId,
      courseId: payload.courseId,
      role: payload.role ?? 'student',
    };
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = {
  userId: string;
  courseId?: string;
  role: string;
};

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);

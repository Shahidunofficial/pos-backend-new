import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: '324253235DEWFSFSFS', // Hardcoded for development
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      name: payload.name
    };
  }
}

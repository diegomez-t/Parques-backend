import { Strategy as JwtStrategy, ExtractJwt, type StrategyOptions } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import type { PassportStatic } from 'passport';
import argon2 from 'argon2';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'parques-jwt-secret';

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

export default function configurePassport(passport: PassportStatic): void {
  // Stratégie JWT
  passport.use(
    new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
      try {
        const user = await User.findById(jwtPayload.id);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  // Stratégie locale (email/password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email }).select('+passwordHash');
          
          if (!user) {
            return done(null, false, { message: 'Email non trouvé' });
          }

          if (!user.passwordHash) {
            return done(null, false, { message: 'Compte OAuth uniquement' });
          }

          const isValid = await argon2.verify(user.passwordHash, password);
          if (!isValid) {
            return done(null, false, { message: 'Mot de passe incorrect' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}


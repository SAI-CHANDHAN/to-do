const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

const configurePassport = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return passport;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('Google account did not return an email address'));
          }

          const googleId = profile.id;
          const name = profile.displayName || email.split('@')[0];
          const avatar = profile?.photos?.[0]?.value || null;

          let user = await User.findOne({ $or: [{ googleId }, { email }] });

          if (!user) {
            user = await User.create({
              name,
              email,
              googleId,
              avatar,
              password: null
            });
          } else {
            user.googleId = user.googleId || googleId;
            user.avatar = avatar || user.avatar;
            user.name = user.name || name;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return passport;
};

module.exports = configurePassport;
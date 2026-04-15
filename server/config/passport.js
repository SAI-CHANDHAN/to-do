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
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
        skipUserProfile: true
      },
      async (accessToken, _refreshToken, _profile, done) => {
        try {
          const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (!profileResponse.ok) {
            const body = await profileResponse.text();
            return done(new Error(`Google userinfo request failed: ${profileResponse.status} ${body}`), null);
          }

          const profile = await profileResponse.json();

          const email = profile.email;
          if (!email) {
            return done(new Error('Google account did not return an email address'));
          }

          const googleId = profile.sub;
          const name = profile.name || email.split('@')[0];
          const avatar = profile.picture || null;

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
const isProd = process.env.NODE_ENV === 'production';

const buildCookieOptions = maxAge => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  partitioned: isProd,
  path: '/',
  maxAge
});

const setAuthCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  res.cookie('accessToken', accessToken, buildCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, buildCookieOptions(7 * 24 * 60 * 60 * 1000));

  if (csrfToken) {
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      partitioned: isProd,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
};

const clearAuthCookies = res => {
  const baseOptions = {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    partitioned: isProd,
    path: '/'
  };

  res.clearCookie('accessToken', { ...baseOptions, httpOnly: true });
  res.clearCookie('refreshToken', { ...baseOptions, httpOnly: true });
  res.clearCookie('csrfToken', { ...baseOptions, httpOnly: false });
};

module.exports = {
  setAuthCookies,
  clearAuthCookies
};
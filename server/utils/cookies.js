
// Force HTTP cookie settings if HTTP_ELB env is set (for AWS ELB HTTP deployments)
const isProd = process.env.NODE_ENV === 'production';
const isHttpElb = process.env.HTTP_ELB === 'true';

const buildCookieOptions = maxAge => ({
  httpOnly: true,
  secure: isHttpElb ? false : isProd,
  sameSite: isHttpElb ? 'lax' : (isProd ? 'none' : 'lax'),
  partitioned: isProd && !isHttpElb,
  path: '/',
  maxAge
});

const setAuthCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  res.cookie('accessToken', accessToken, buildCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, buildCookieOptions(7 * 24 * 60 * 60 * 1000));

  if (csrfToken) {
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      secure: isHttpElb ? false : isProd,
      sameSite: isHttpElb ? 'lax' : (isProd ? 'none' : 'lax'),
      partitioned: isProd && !isHttpElb,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
};

const clearAuthCookies = res => {
  const isHttpElb = process.env.HTTP_ELB === 'true';
  const baseOptions = {
    secure: isHttpElb ? false : isProd,
    sameSite: isHttpElb ? 'lax' : (isProd ? 'none' : 'lax'),
    partitioned: isProd && !isHttpElb,
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
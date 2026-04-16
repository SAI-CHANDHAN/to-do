const authReducer = (state, action) => {
  const hasValidUser = user => Boolean(user && (user.id || user._id || user.email));

  switch (action.type) {
    case 'AUTH_INIT':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        error: null
      };
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: hasValidUser(action.payload),
        loading: false,
        user: action.payload,
        error: null
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: hasValidUser(action.payload),
        loading: false,
        user: action.payload,
        error: null
      };
    case 'AUTH_ERROR':
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: action.payload
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export default authReducer;
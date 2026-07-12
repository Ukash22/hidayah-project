// S4: the access token lives in memory only — never in localStorage — so XSS
// cannot read it. It is re-obtained on page load via the httpOnly refresh
// cookie (see AuthContext bootstrap).
//
// Exception: parent→child impersonation stores the CHILD access token in
// localStorage('access') because impersonation survives a full page
// navigation. When that key exists it overrides the in-memory token.

let accessToken = null;

export const setAccess = (token) => { accessToken = token; };

export const getAccess = () =>
    localStorage.getItem('access') || accessToken;

export const clearAccess = () => {
    accessToken = null;
    localStorage.removeItem('access');
    localStorage.removeItem('refresh'); // legacy key from pre-S4 sessions
};

export const isImpersonating = () => !!localStorage.getItem('access');

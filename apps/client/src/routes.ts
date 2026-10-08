export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  registerCode: "/register/code",
  registerPassword: "/register/password",
  registerPhoto: "/register/photo",
  registerName: "/register/name",
  reset: "/reset",
  profile: "/profile",
  profileUser: "/users/:publicId",
  friends: "/friends",
  settings: "/settings"
} as const;

export const userProfilePath = (publicId: string): string => `/users/${encodeURIComponent(publicId)}`;

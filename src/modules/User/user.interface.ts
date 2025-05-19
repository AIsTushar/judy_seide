import { USER_ROLE } from './user.constants';

export type TuserRole = keyof typeof USER_ROLE;

// Role type matching Prisma's Role enum
export type TRole = 'ADMIN' | 'USER';

// Type for keys of USER_ROLE
export type TUserRole = keyof typeof USER_ROLE;

// Interface for User (based on User model)
export interface IUser {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
  password: string;
  role: TRole;
}

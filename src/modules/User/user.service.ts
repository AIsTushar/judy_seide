import config from '../../config';
import AppError from '../../errors/AppError';
import { prisma } from '../../prisma/client';
import bcrypt from 'bcrypt';

const getAllUsers = async (id: string) => {
  const result = await prisma.user.findMany({
    where: {
      NOT: {
        id,
      },
    },
    select: {
      name: true,
      email: true,
      contact: true,
      imageUrl: true,
      address: true,
    },
  });
  return result;
};

const getUser = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      name: true,
      email: true,
      contact: true,
      imageUrl: true,
      address: true,
    },
  });
  return result;
};

const changePassword = async (id: string, newPassword: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.salt_round),
  );
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      password: hashedPassword,
    },
  });
  return true;
};

const updateUser = async (id: string, data: any) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data,
  });
  return result;
};

export const UserServices = {
  getUser,
  changePassword,
  updateUser,
  getAllUsers,
};

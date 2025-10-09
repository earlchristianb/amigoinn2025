import { Prisma } from '@prisma/client'

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      async softDelete<T>(this: T, where: any): Promise<any> {
        const context = Prisma.getExtensionContext(this);
        return (context as any).update({
          where,
          data: {
            deletedAt: new Date(),
          },
        });
      },
    },
  },
  query: {
    $allModels: {
      async delete({ args, query }: any) {
        // Convert delete to update with deletedAt
        return (query as any)({
          ...args,
          data: {
            deletedAt: new Date(),
          },
        });
      },
      async deleteMany({ args, query }: any) {
        // Convert deleteMany to updateMany with deletedAt
        return (query as any)({
          ...args,
          data: {
            deletedAt: new Date(),
          },
        });
      },
      async findMany({ args, query }: any) {
        // Add deletedAt filter if not explicitly set
        return (query as any)({
          ...args,
          where: {
            ...(args.where || {}),
            deletedAt: args.where?.deletedAt !== undefined ? args.where.deletedAt : null,
          },
        });
      },
      async findFirst({ args, query }: any) {
        // Add deletedAt filter if not explicitly set
        return (query as any)({
          ...args,
          where: {
            ...(args.where || {}),
            deletedAt: args.where?.deletedAt !== undefined ? args.where.deletedAt : null,
          },
        });
      },
      async findUnique({ args, query }: any) {
        // Add deletedAt filter
        return (query as any)({
          ...args,
          where: {
            ...(args.where || {}),
            deletedAt: null,
          },
        });
      },
    },
  },
})

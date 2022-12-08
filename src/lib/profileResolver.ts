import * as TypeGraphQL from "type-graphql";
import { GraphQLResolveInfo } from "graphql";
import { PrismaClient } from "@prisma/client";
import { User } from "../typegraphql";

@TypeGraphQL.Resolver(() => User)
export default class ProfileResolver {
  @TypeGraphQL.Query(() => User, {
    nullable: false,
  })
  async profile(
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Info() info: GraphQLResolveInfo
  ): Promise<User | null> {
    return (ctx.prisma as PrismaClient).user.findUnique({
      where: {
        id: Number(ctx.user.id),
      },
    });
  }
}

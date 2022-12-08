import * as TypeGraphQL from "type-graphql";
import { User } from "./typegraphql";
import { GraphQLResolveInfo } from "graphql";
import { getPrismaFromContext } from "./typegraphql/helpers";
import { PrismaClient } from "@prisma/client";

@TypeGraphQL.Resolver(() => User)
export default class ProfileResolver {
  @TypeGraphQL.Query(() => User, {
    nullable: false,
  })
  async profile(
    @TypeGraphQL.Ctx() ctx: any,
    @TypeGraphQL.Info() info: GraphQLResolveInfo
  ): Promise<User | null> {
    console.log("TurboLog ~ file: profileResolver.ts:16 ~ ProfileResolver ~ ctx", ctx.user);
    return (getPrismaFromContext(ctx) as PrismaClient).user.findUnique({
      where: {
        id: Number(ctx.user.id),
      },
    });
  }
}

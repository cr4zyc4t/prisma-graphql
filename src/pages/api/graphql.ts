import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { GraphQLError } from "graphql";
import { Authorized } from "type-graphql";
import { NextRequest, NextResponse } from "next/server";
import ProfileResolver from "../../lib/profileResolver";
import prisma from "../../lib/prisma";
import { resolvers } from "../../typegraphql";
import { createYoga } from "graphql-yoga";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    // Disable body parsing (required for file uploads)
    bodyParser: false,
  },
};

export default async function graphql(req: NextRequest, res: NextResponse) {
  // const modelEnhanceMap: ModelsEnhanceMap = {
  //   Post: {
  //     // class: [Authorized("xxx")],
  //     fields: {
  //       viewCount: [Authorized("xxx")],
  //     },
  //   },
  // };

  // const resolversEnhanceMap: ResolversEnhanceMap = {
  //   Post: {
  //     _all: [Authorized("ADMIN")],
  //   },
  // };

  // applyResolversEnhanceMap(resolversEnhanceMap);
  // applyModelsEnhanceMap(modelEnhanceMap);

  const schema = await buildSchema({
    resolvers: [...resolvers, ProfileResolver],
    authChecker: ({ root, args, context, info }, role) => {
      const roles: string[] = Array.isArray(role) ? role : [role];
      if (roles.includes(context.user.role)) {
        return true;
      }
      return false;
    },
  });

  return createYoga<{
    req: NextApiRequest;
    res: NextApiResponse;
  }>({
    // Needed to be defined explicitly because our endpoint lives at a different path other than `/graphql`
    graphqlEndpoint: "/api/graphql",
    schema,
    graphiql: true,
    context({ req, res }) {
      const [id, role] = (req.headers.authorization || "").split(
        "_"
      ) as string[];
      let user: any;
      if (id && role) {
        user = { id, role };
      } else {
        // throwing a `GraphQLError` here allows us to specify an HTTP status code,
        // standard `Error`s will have a 500 status code by default
        throw new GraphQLError("User is not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });
      }
      return {
        user,
        prisma,
      };
    },
  })(req, res);
}

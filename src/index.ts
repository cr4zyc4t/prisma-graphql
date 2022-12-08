import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import express from "express";
import { buildSchema } from "type-graphql";
import {
  applyModelsEnhanceMap,
  applyResolversEnhanceMap,
  ModelsEnhanceMap,
  resolvers,
  ResolversEnhanceMap,
} from "./typegraphql";
import { GraphQLError } from "graphql";
import { Authorized } from "type-graphql";
import ProfileResolver from "./profileResolver";
import { createYoga } from "graphql-yoga";

async function main() {
  const prismaClient = new PrismaClient();

  const modelEnhanceMap: ModelsEnhanceMap = {
    Post: {
      // class: [Authorized("xxx")],
      fields: {
        viewCount: [Authorized("xxx")],
      },
    },
  };

  const resolversEnhanceMap: ResolversEnhanceMap = {
    Post: {
      _all: [Authorized("ADMIN")],
    },
  };

  applyResolversEnhanceMap(resolversEnhanceMap);
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
    // emitSchemaFile: {
    //   path: __dirname + "/schema.gql",
    //   commentDescriptions: true,
    //   sortedSchema: false, // by default the printed schema is sorted alphabetically
    // },
  });

  const app = express();

  app.use(express.json());

  app.use(
    "/graphql",
    createYoga({
      schema,
      context: async ({ request }) => {
        const [id, role] = (request.headers.get("authorization") || "").split(
          "_"
        ) as string[];
        let user: any;
        if (role) {
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
          prisma: prismaClient,
        };
      },
    })
  );

  app.listen(8081, () => {
    console.log(
      "Running a GraphQL API server at http://localhost:8081/graphql"
    );
  });
}
main();

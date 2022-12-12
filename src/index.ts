import "reflect-metadata";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { PrismaClient } from "@prisma/client";
import express from "express";
import { buildSchema } from "type-graphql";
import http from "http";
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

interface MyContext {
  user: {
    id: string;
    role: string;
  };
  prisma: PrismaClient;
}

async function main() {
  const prismaClient = new PrismaClient();

  const modelEnhanceMap: ModelsEnhanceMap = {
    Post: {
      fields: {
        viewCount: [Authorized("ADMIN2")],
      },
    },
  };

  const resolversEnhanceMap: ResolversEnhanceMap = {
    Post: {
      _all: [Authorized("ADMIN")],
    },
  };

  applyResolversEnhanceMap(resolversEnhanceMap);
  applyModelsEnhanceMap(modelEnhanceMap);

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

  // Our httpServer handles incoming requests to our Express app.
  // Below, we tell Apollo Server to "drain" this httpServer,
  // enabling our servers to shut down gracefully.
  const httpServer = http.createServer(app);

  const server = new ApolloServer<MyContext>({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  app.use(express.json());

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const [id, role] = (req.headers.authorization || "").split(
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

  app.use((error) => {
    console.log("🚀 ~ file: index.ts:108 ~ main ~ error", error);
  });

  httpServer.listen(8081, () => {
    console.log(
      "Running a GraphQL API server at http://localhost:8081/graphql"
    );
  });
}
main();

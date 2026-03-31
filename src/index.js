// Import the framework and instantiate it
import fastifyEnv from "@fastify/env";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import database from "./database.js";
import middlewares from "./middlewares.js";
import routes from "./routes.js";

const fastify = Fastify({
  logger: true,
});

await fastify.register(fastifyEnv, {
  confKey: "config",
  schema: {
    type: "object",
    required: ["JWT_SECRET", "DATABASE_URL"],
    properties: {
      JWT_SECRET: { type: "string" },
      DATABASE_URL: { type: "string" },
    },
  },
  dotenv: true,
});

fastify.register(jwt, {
  secret: fastify.config.JWT_SECRET,
});
fastify.register(database);
fastify.register(middlewares);
fastify.register(routes);

// Run the server!
fastify.listen({ port: 3000 });

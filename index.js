import fastifyEnv from "@fastify/env";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import database from "./database.js";
import middlewares from "./middlewares.js";
import routes from "./routes.js";

const fastify = Fastify({ logger: true });

await fastify.register(fastifyEnv, {
  schema: {
    type: "object",
    required: ["PORT", "DATABASE_URL", "JWT_SECRET"],
    properties: {
      PORT: { type: "integer" },
      DATABASE_URL: { type: "string" },
      JWT_SECRET: { type: "string" },
    },
  },
  dotenv: true,
});

fastify.register(jwt, { secret: fastify.config.JWT_SECRET });
fastify.register(database);
fastify.register(middlewares);
fastify.register(routes);

try {
  await fastify.listen({ port: fastify.config.PORT });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

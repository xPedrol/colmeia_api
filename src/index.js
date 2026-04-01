// Import the framework and instantiate it
import fastifyEnv from "@fastify/env";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import database from "./database.js";
import middlewares from "./middlewares.js";
import routes from "./routes.js";
import { config } from "./envConfig.js";

const fastify = Fastify({
  logger: true,
});

await fastify.register(fastifyEnv, config);

fastify.register(jwt, {
  secret: fastify.config.JWT_SECRET,
});
fastify.register(database);
fastify.register(middlewares);
fastify.register(routes);

// Run the server!
fastify.listen({ port: 3000 });

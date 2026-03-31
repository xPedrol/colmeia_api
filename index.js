// Import the framework and instantiate it
import dotenv from "dotenv";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import database from "./database.js";
import middlewares from "./middlewares.js";
import routes from "./routes.js";

dotenv.config();

const fastify = Fastify({
  logger: true,
});
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || "",
});
fastify.register(database);
fastify.register(middlewares);
fastify.register(routes);

if (!process.env.PORT) {
  console.error("PORT is not set in the environment variables.");
  process.exit(1);
}

// Run the server!
try {
  await fastify.listen({
    port: Number(process.env.PORT),
    host: process.env.HOST || "0.0.0.0",
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

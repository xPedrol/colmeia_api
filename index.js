// Import the framework and instantiate it
import Fastify from "fastify";
import middlewares from "./middlewares.js";
import routes from "./routes.js";
const fastify = Fastify({
  logger: false,
});

fastify.register(middlewares);
fastify.register(routes);

// Run the server!
try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

import fastifyPlugin from "fastify-plugin";
import fastifyPostgress from "@fastify/postgres";

/**
 * @param {FastifyInstance} fastify
 * @param {Object} options
 */
async function dbConnector(fastify, options) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in the environment variables.");
    process.exit(1);
  }
  fastify.register(fastifyPostgress, {
    connectionString: process.env.DATABASE_URL,
  });
}

export default fastifyPlugin(dbConnector);

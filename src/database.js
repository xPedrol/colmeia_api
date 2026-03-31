import fastifyPlugin from "fastify-plugin";
import fastifyPostgress from "@fastify/postgres";

/**
 * @param {FastifyInstance} fastify
 * @param {Object} options
 */
async function dbConnector(fastify, options) {
  fastify.register(fastifyPostgress, {
    connectionString: fastify.config.DATABASE_URL,
  });
}

export default fastifyPlugin(dbConnector);

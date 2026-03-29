import fp from "fastify-plugin";
async function middlewares(fastify) {
  console.log("Registering middlewares...");
  fastify.addHook("preHandler", async (request, reply) => {
    console.log("preHandler hook called");
  });
}

export default fp(middlewares);

import fp from "fastify-plugin";
async function middlewares(fastify) {
  fastify.addHook("preHandler", async (request, reply) => {
    if (request.routeOptions.url?.startsWith("/auth")) return;
    if (
      request.method === "GET" &&
      request.routeOptions.url === "/apiaries/:id/image"
    )
      return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Token inválido ou ausente" });
    }
  });
}

export default fp(middlewares);

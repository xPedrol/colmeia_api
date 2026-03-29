export default async function routes(fastify) {
  fastify.get("/", async function handler(request, reply) {
    return { hello: "world" };
  });

  // APIARIOS
  fastify.post("/apiarios", async function handler(request, reply) {
    console.log(request.body);
  });
}

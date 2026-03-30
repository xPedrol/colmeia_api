import ApiaryRepository from "./repositories/apiary.js";
import ExpenseCategoryRepository from "./repositories/expenseCategory.js";
import ExpenseRepository from "./repositories/expense.js";
import UserRepository from "./repositories/user.js";
import VisitRepository from "./repositories/visit.js";

export default async function routes(fastify) {
  const userRepo = new UserRepository(fastify.pg);
  const apiaryRepo = new ApiaryRepository(fastify.pg);
  const visitRepo = new VisitRepository(fastify.pg);
  const expenseCategoryRepo = new ExpenseCategoryRepository(fastify.pg);
  const expenseRepo = new ExpenseRepository(fastify.pg);

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  fastify.post("/auth/register", async (request, reply) => {
    const { name, email, password } = request.body;
    const existing = await userRepo.getUserByEmail(email);
    if (existing) return reply.code(409).send({ error: "Email já cadastrado" });
    const user = await userRepo.createUser(name, email, password);
    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return reply.code(201).send({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body;
    const user = await userRepo.getUserByEmailAndPassword(email, password);
    if (!user) return reply.code(401).send({ error: "Credenciais inválidas" });
    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return reply.send({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });

  // ─── USERS ─────────────────────────────────────────────────────────────────

  fastify.get("/users/:id", async (request, reply) => {
    const user = await userRepo.getUserById(request.params.id);
    if (!user) return reply.code(404).send({ error: "Usuário não encontrado" });
    return user;
  });

  fastify.put("/users/:id", async (request, reply) => {
    const { name, email, password } = request.body;
    const user = await userRepo.updateUser(
      request.params.id,
      name,
      email,
      password,
    );
    if (!user) return reply.code(404).send({ error: "Usuário não encontrado" });
    return user;
  });

  fastify.delete("/users/:id", async (request, reply) => {
    const deleted = await userRepo.deleteUser(request.params.id);
    if (!deleted)
      return reply.code(404).send({ error: "Usuário não encontrado" });
    return reply.code(204).send();
  });

  // ─── APIARIES ──────────────────────────────────────────────────────────────

  fastify.get("/apiaries", async (request, reply) => {
    return apiaryRepo.getAll(request.user.id);
  });

  fastify.get("/apiaries/:id", async (request, reply) => {
    const apiary = await apiaryRepo.getById(request.params.id, request.user.id);
    if (!apiary)
      return reply.code(404).send({ error: "Apiário não encontrado" });
    return apiary;
  });

  fastify.post("/apiaries", async (request, reply) => {
    const apiary = await apiaryRepo.create({
      ...request.body,
      user_id: request.user.id,
    });
    return reply.code(201).send(apiary);
  });

  fastify.put("/apiaries/:id", async (request, reply) => {
    const apiary = await apiaryRepo.update(
      request.params.id,
      request.user.id,
      request.body,
    );
    if (!apiary)
      return reply.code(404).send({ error: "Apiário não encontrado" });
    return apiary;
  });

  fastify.delete("/apiaries/:id", async (request, reply) => {
    const deleted = await apiaryRepo.delete(request.params.id, request.user.id);
    if (!deleted)
      return reply.code(404).send({ error: "Apiário não encontrado" });
    return reply.code(204).send();
  });

  // ─── VISITS ────────────────────────────────────────────────────────────────

  fastify.get("/visits", async (request, reply) => {
    const { apiary_id } = request.query;
    if (apiary_id) return visitRepo.getByApiary(apiary_id, request.user.id);
    return visitRepo.getAll(request.user.id);
  });

  fastify.get("/visits/:id", async (request, reply) => {
    const visit = await visitRepo.getById(request.params.id, request.user.id);
    if (!visit) return reply.code(404).send({ error: "Visita não encontrada" });
    return visit;
  });

  fastify.post("/visits", async (request, reply) => {
    const visit = await visitRepo.create({
      ...request.body,
      user_id: request.user.id,
    });
    return reply.code(201).send(visit);
  });

  fastify.put("/visits/:id", async (request, reply) => {
    const visit = await visitRepo.update(
      request.params.id,
      request.user.id,
      request.body,
    );
    if (!visit) return reply.code(404).send({ error: "Visita não encontrada" });
    return visit;
  });

  fastify.delete("/visits/:id", async (request, reply) => {
    const deleted = await visitRepo.delete(request.params.id, request.user.id);
    if (!deleted)
      return reply.code(404).send({ error: "Visita não encontrada" });
    return reply.code(204).send();
  });

  // ─── EXPENSE CATEGORIES ────────────────────────────────────────────────────

  fastify.get("/expense-categories", async (request, reply) => {
    return expenseCategoryRepo.getAll(request.user.id);
  });

  fastify.get("/expense-categories/:id", async (request, reply) => {
    const cat = await expenseCategoryRepo.getById(
      request.params.id,
      request.user.id,
    );
    if (!cat)
      return reply.code(404).send({ error: "Categoria não encontrada" });
    return cat;
  });

  fastify.post("/expense-categories", async (request, reply) => {
    const cat = await expenseCategoryRepo.create({
      ...request.body,
      user_id: request.user.id,
    });
    return reply.code(201).send(cat);
  });

  fastify.put("/expense-categories/:id", async (request, reply) => {
    const cat = await expenseCategoryRepo.update(
      request.params.id,
      request.user.id,
      request.body,
    );
    if (!cat)
      return reply.code(404).send({ error: "Categoria não encontrada" });
    return cat;
  });

  fastify.delete("/expense-categories/:id", async (request, reply) => {
    const deleted = await expenseCategoryRepo.delete(
      request.params.id,
      request.user.id,
    );
    if (!deleted)
      return reply.code(404).send({ error: "Categoria não encontrada" });
    return reply.code(204).send();
  });

  // ─── EXPENSES ──────────────────────────────────────────────────────────────

  fastify.get("/expenses", async (request, reply) => {
    return expenseRepo.getAll(request.user.id);
  });

  fastify.get("/expenses/:id", async (request, reply) => {
    const expense = await expenseRepo.getById(
      request.params.id,
      request.user.id,
    );
    if (!expense)
      return reply.code(404).send({ error: "Gasto não encontrado" });
    return expense;
  });

  fastify.post("/expenses", async (request, reply) => {
    const expense = await expenseRepo.create({
      ...request.body,
      user_id: request.user.id,
    });
    return reply.code(201).send(expense);
  });

  fastify.put("/expenses/:id", async (request, reply) => {
    const expense = await expenseRepo.update(
      request.params.id,
      request.user.id,
      request.body,
    );
    if (!expense)
      return reply.code(404).send({ error: "Gasto não encontrado" });
    return expense;
  });

  fastify.delete("/expenses/:id", async (request, reply) => {
    const deleted = await expenseRepo.delete(
      request.params.id,
      request.user.id,
    );
    if (!deleted)
      return reply.code(404).send({ error: "Gasto não encontrado" });
    return reply.code(204).send();
  });
}

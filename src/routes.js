import ApiaryRepository from "./repositories/apiary.js";
import ExpenseCategoryRepository from "./repositories/expenseCategory.js";
import ExpenseRepository from "./repositories/expense.js";
import SaleRepository from "./repositories/sale.js";
import UserRepository from "./repositories/user.js";
import VisitRepository from "./repositories/visit.js";
import { comparePassword, hashPassword } from "./utils/bcrypt.js";
import DashboardRepository from "./repositories/dashboard.js";
import MailService from "./services/mail.js";
import { NewsScrapper } from "./services/newsScrapper.js";
import {
  compareResetCode,
  generateResetCode,
  getResetCodeExpiryDate,
  hashResetCode,
  isResetCodeExpired,
  MAX_RESET_CODE_ATTEMPTS,
} from "./utils/passwordResetCode.js";

export default async function routes(fastify) {
  const getYearFromBody = (request) => {
    console.log("Request body:", request?.body?.year || request?.query?.year);
    const parsedYear = Number.parseInt(
      request?.body?.year || request?.query?.year,
      10,
    );
    if (Number.isInteger(parsedYear) && parsedYear > 0) {
      return parsedYear;
    }
    return new Date().getFullYear();
  };

  const mailService = new MailService({
    host: fastify.config.SMTP_HOST,
    port: fastify.config.SMTP_PORT,
    user: fastify.config.SMTP_USER,
    pass: fastify.config.SMTP_PASS,
    from: fastify.config.SMTP_FROM,
  });

  const userRepo = new UserRepository(fastify.pg, mailService);
  const apiaryRepo = new ApiaryRepository(fastify.pg);
  const visitRepo = new VisitRepository(fastify.pg);
  const expenseCategoryRepo = new ExpenseCategoryRepository(fastify.pg);
  const expenseRepo = new ExpenseRepository(fastify.pg);
  const saleRepo = new SaleRepository(fastify.pg);
  const dashboardRepo = new DashboardRepository(fastify.pg);
  const newsScrapper = new NewsScrapper(
    "https://globorural.globo.com/ultimas-noticias/",
    "https://revistacultivar.com.br/noticias?categoria=apicultura",
    "https://ecoa.org.br/tag/apicultura/",
  );

  fastify.get("/", async (request, reply) => {
    return { message: "Colmeia API is running!" };
  });

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  fastify.get("/dashboard/summary", async (request, reply) => {
    const year = getYearFromBody(request);
    const summary = await dashboardRepo.getSummary(request.user.id, year);
    return reply.code(201).send(summary);
  });

  fastify.get("/dashboard/monthly-summary", async (request, reply) => {
    const year = getYearFromBody(request);
    const summary = await dashboardRepo.getMonthlySummary(
      request.user.id,
      year,
    );
    return reply.code(201).send(summary);
  });

  fastify.get("/dashboard/monthly-visits", async (request, reply) => {
    const year = getYearFromBody(request);
    const summary = await dashboardRepo.getMonthlyVisits(request.user.id, year);
    return reply.code(201).send(summary);
  });

  fastify.get("/dashboard/sales-summary", async (request, reply) => {
    const year = getYearFromBody(request);
    const summary = await dashboardRepo.getSalesSummary(request.user.id, year);
    return reply.code(201).send(summary);
  });

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  fastify.post("/auth/register", async (request, reply) => {
    const { name, email, password } = request.body;
    const existing = await userRepo.getUserByEmail(email);
    if (existing) return reply.code(409).send({ error: "Email já cadastrado" });
    const hashedPassword = await hashPassword(password);
    const user = await userRepo.createUser(name, email, hashedPassword);
    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return reply.code(201).send({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body;
    const user = await userRepo.getUserByEmail(email);
    if (!user) return reply.code(401).send({ error: "Credenciais inválidas" });
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid)
      return reply.code(401).send({ error: "Credenciais inválidas" });

    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return reply.send({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });

  fastify.post("/auth/request-password-reset", async (request, reply) => {
    const { email } = request.body;
    const user = await userRepo.getUserByEmail(email);
    if (!user)
      return reply
        .code(404)
        .send({ error: "Usuário com esse email não encontrado" });
    const code = generateResetCode();
    const codeHash = await hashResetCode(code);
    const expiresAt = getResetCodeExpiryDate();

    await userRepo.setPasswordResetCode(email, codeHash, expiresAt);

    await userRepo.sendResetPasswordEmail(email, code);
    return reply.send({ message: "Email de redefinição enviado" });
  });

  fastify.post("/auth/reset-password", async (request, reply) => {
    const { email, code, newPassword } = request.body;
    const user = await userRepo.getUserByEmail(email);
    if (!user)
      return reply
        .code(404)
        .send({ error: "Usuário com esse email não encontrado" });

    const resetCodeHash = user.reset_code_hash;
    const resetCodeExpiresAt = user.reset_code_expires_at;
    const resetCodeAttempts = user.reset_code_attempts ?? 0;

    if (!resetCodeHash || !resetCodeExpiresAt) {
      return reply.code(400).send({ error: "Código inválido ou expirado" });
    }

    if (resetCodeAttempts >= MAX_RESET_CODE_ATTEMPTS) {
      return reply.code(429).send({
        error: "Limite de tentativas excedido. Solicite um novo código.",
      });
    }

    if (isResetCodeExpired(resetCodeExpiresAt)) {
      await userRepo.clearPasswordResetCode(email);
      return reply.code(400).send({ error: "Código inválido ou expirado" });
    }

    const isCodeValid = await compareResetCode(code, resetCodeHash);
    if (!isCodeValid) {
      await userRepo.incrementResetCodeAttempts(email);
      return reply.code(400).send({ error: "Código inválido ou expirado" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepo.resetPassword(email, hashedPassword);
    await userRepo.clearPasswordResetCode(email);

    return reply.send({ message: "Senha redefinida com sucesso" });
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
    const year = getYearFromBody(request);
    return apiaryRepo.getAll(request.user.id, year);
  });

  fastify.get("/apiaries/:id", async (request, reply) => {
    const year = getYearFromBody(request);
    const apiary = await apiaryRepo.getById(
      request.params.id,
      request.user.id,
      year,
    );
    if (!apiary)
      return reply.code(404).send({ error: "Apiário não encontrado" });
    return apiary;
  });

  fastify.post("/apiaries", async (request, reply) => {
    const {
      name,
      location,
      swarm,
      honey_super,
      beeType,
      image_link,
      apiaryStrength,
      floweringStrength,
    } = request.body;

    const apiary = await apiaryRepo.create({
      name,
      location,
      swarm,
      honey_super,
      beeType,
      image_link,
      apiaryStrength,
      floweringStrength,
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
    const year = getYearFromBody(request);
    const { apiary_id } = request.query;
    if (apiary_id)
      return visitRepo.getByApiary(apiary_id, request.user.id, year);
    return visitRepo.getAll(request.user.id, year);
  });

  fastify.get("/visits/:id", async (request, reply) => {
    const year = getYearFromBody(request);
    const visit = await visitRepo.getById(
      request.params.id,
      request.user.id,
      year,
    );
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
    const year = getYearFromBody(request);
    return expenseRepo.getAll(request.user.id, year);
  });

  fastify.get("/expenses/:id", async (request, reply) => {
    const year = getYearFromBody(request);
    const expense = await expenseRepo.getById(
      request.params.id,
      request.user.id,
      year,
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

  // ─── SALES ───────────────────────────────────────────────────────────────

  fastify.get("/sales", async (request, reply) => {
    const year = getYearFromBody(request);
    return saleRepo.getAll(request.user.id, year);
  });

  fastify.get("/sales/:id", async (request, reply) => {
    const year = getYearFromBody(request);
    const sale = await saleRepo.getById(
      request.params.id,
      request.user.id,
      year,
    );
    if (!sale) return reply.code(404).send({ error: "Venda não encontrada" });
    return sale;
  });

  fastify.post("/sales", async (request, reply) => {
    const sale = await saleRepo.create({
      ...request.body,
      user_id: request.user.id,
    });
    return reply.code(201).send(sale);
  });

  fastify.put("/sales/:id", async (request, reply) => {
    const sale = await saleRepo.update(
      request.params.id,
      request.user.id,
      request.body,
    );
    if (!sale) return reply.code(404).send({ error: "Venda não encontrada" });
    return sale;
  });

  fastify.delete("/sales/:id", async (request, reply) => {
    const deleted = await saleRepo.delete(request.params.id, request.user.id);
    if (!deleted)
      return reply.code(404).send({ error: "Venda não encontrada" });
    return reply.code(204).send();
  });

  // ─── NEWS ──────────────────────────────────────────────────────────────────

  fastify.get("/news", async (request, reply) => {
    const news = await newsScrapper.getNews();
    return reply.send(news);
  });
}

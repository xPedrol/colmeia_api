export const config = {
  confKey: "config",
  schema: {
    type: "object",
    required: [
      "JWT_SECRET",
      "DATABASE_URL",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
    ],
    properties: {
      JWT_SECRET: { type: "string" },
      DATABASE_URL: { type: "string" },
      SMTP_HOST: { type: "string" },
      SMTP_PORT: { type: "number" },
      SMTP_USER: { type: "string" },
      SMTP_PASS: { type: "string" },
      SMTP_FROM: { type: "string" },
    },
  },
  dotenv: true,
};

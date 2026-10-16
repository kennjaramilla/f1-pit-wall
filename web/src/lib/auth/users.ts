import type { Role } from "./permissions";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

// Seeded demo accounts. Passwords are bcrypt hashes; the plaintext is shown on the login page on purpose.
export const DEMO_USERS: DemoUser[] = [
  {
    id: "u-viewer",
    email: "viewer@pitwall.dev",
    name: "Vera Viewer",
    role: "Viewer",
    passwordHash: "$2b$10$1GQxcICYLX6gM4Qm/U5bwuRSrFfEteXWS1p5nxbSZiHnnMepX66gS",
  },
  {
    id: "u-strategist",
    email: "strategist@pitwall.dev",
    name: "Sam Strategist",
    role: "Strategist",
    passwordHash: "$2b$10$fSus89spMhzvB.k1fQY4eOajql/cqsXmlHNm5crOMnvm41Wal8.Km",
  },
  {
    id: "u-admin",
    email: "admin@pitwall.dev",
    name: "Alex Admin",
    role: "Admin",
    passwordHash: "$2b$10$Ec7jWtDuubQSaH7ALxHcDe3GvTlD7u9KrWopqogdaANTLut4RrhVO",
  },
];

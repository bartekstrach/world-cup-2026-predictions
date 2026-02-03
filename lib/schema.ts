import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .references(() => competitions.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 3 }).notNull(), // FIFA code: BRA, POL
    group: varchar("group", { length: 1 }), // A-L for group stage, null for knockouts
    flagUrl: varchar("flag_url", { length: 255 }),
  },
  (table) => ({
    uniqueCode: unique().on(table.competitionId, table.code),
  })
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .references(() => competitions.id)
      .notNull(),
    homeTeamId: integer("home_team_id")
      .references(() => teams.id)
      .notNull(),
    awayTeamId: integer("away_team_id")
      .references(() => teams.id)
      .notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    stage: varchar("stage", { length: 50 }).notNull(), // group, round_16, quarter, semi, final
    matchDate: timestamp("match_date").notNull(),
    status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, live, finished
    matchNumber: integer("match_number").notNull(),
  },
  (table) => ({
    uniqueMatch: unique().on(table.competitionId, table.matchNumber),
  })
);

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id")
      .references(() => participants.id)
      .notNull(),
    matchId: integer("match_id")
      .references(() => matches.id)
      .notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    points: integer("points").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniquePrediction: unique().on(table.participantId, table.matchId),
  })
);

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

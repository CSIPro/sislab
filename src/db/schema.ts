import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export type QuantityItem = {
	name: string;
	amount: number;
	unit: string;
	basis: "team" | "group";
};

export type WasteItem = {
	name: string;
	container: string;
	treatment: string;
};

export type ExerciseMaterials = {
	reagents: QuantityItem[];
	equipment: QuantityItem[];
	waste: WasteItem[];
};

export type RequestMaterials = {
	reagents: (QuantityItem & { totalAmount: number })[];
	equipment: (QuantityItem & { totalAmount: number })[];
	waste: WasteItem[];
	omittedReagents: string[];
	addedReagents: QuantityItem[];
	addedEquipment: QuantityItem[];
	addedWaste: WasteItem[];
};

export const role = pgEnum("user_role", ["professor", "staff", "admin"]);
export const requestStatus = pgEnum("request_status", [
	"open",
	"reviewed",
	"fulfilled",
	"cancelled",
]);

export const users = pgTable(
	"users",
	{
		id: uuid().defaultRandom().primaryKey(),
		clerkId: text("clerk_id").unique(),
		email: text().notNull(),
		passwordHash: text("password_hash"),
		name: text().notNull(),
		surname: text().notNull(),
		active: boolean().notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
	],
);

export const userRoles = pgTable(
	"user_roles",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		role: role().notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.role] })],
);

export const periods = pgTable(
	"periods",
	{
		code: text().primaryKey(),
		startsOn: date("starts_on"),
		endsOn: date("ends_on"),
	},
	(table) => [
		check(
			"periods_date_pair",
			sql`(
    (${table.startsOn} IS NULL AND ${table.endsOn} IS NULL) OR
    (${table.startsOn} IS NOT NULL AND ${table.endsOn} >= ${table.startsOn})
  )`,
		),
	],
);

export const labs = pgTable("labs", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull().unique(),
	active: boolean().notNull().default(true),
});

export const careers = pgTable("careers", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull().unique(),
	active: boolean().notNull().default(true),
});

export const subjects = pgTable("subjects", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull().unique(),
	active: boolean().notNull().default(true),
});

// Active lab-slot overlap is enforced by the exclusion constraint in the SQL migration.
export const groups = pgTable(
	"groups",
	{
		id: uuid().defaultRandom().primaryKey(),
		professorId: uuid("professor_id")
			.notNull()
			.references(() => users.id),
		periodCode: text("period_code")
			.notNull()
			.references(() => periods.code),
		number: integer().notNull(),
		labId: uuid("lab_id")
			.notNull()
			.references(() => labs.id),
		labName: text("lab_name").notNull(),
		careerId: uuid("career_id")
			.notNull()
			.references(() => careers.id),
		careerName: text("career_name").notNull(),
		subjectId: uuid("subject_id")
			.notNull()
			.references(() => subjects.id),
		subjectName: text("subject_name").notNull(),
		students: integer().notNull(),
		teams: integer().notNull(),
		weekday: integer().notNull(),
		startTime: time("start_time").notNull(),
		endTime: time("end_time").notNull(),
		active: boolean().notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("groups_professor_period_number_unique").on(
			table.professorId,
			table.periodCode,
			table.number,
		),
		index("groups_lab_period_weekday_idx").on(
			table.labId,
			table.periodCode,
			table.weekday,
		),
		check("groups_number_positive", sql`${table.number} > 0`),
		check(
			"groups_students_teams_valid",
			sql`
    ${table.students} BETWEEN 1 AND 60 AND
    ${table.teams} BETWEEN 1 AND ${table.students}
  `,
		),
		check("groups_weekday_valid", sql`${table.weekday} BETWEEN 0 AND 6`),
		check("groups_time_order", sql`${table.startTime} < ${table.endTime}`),
	],
);

export const labExercises = pgTable("lab_exercises", {
	id: uuid().defaultRandom().primaryKey(),
	number: text().notNull(),
	name: text().notNull(),
	materials: jsonb().$type<ExerciseMaterials>().notNull(),
	active: boolean().notNull().default(true),
});

export const preparationRequests = pgTable(
	"preparation_requests",
	{
		id: uuid().defaultRandom().primaryKey(),
		groupId: uuid("group_id")
			.notNull()
			.references(() => groups.id),
		professorId: uuid("professor_id")
			.notNull()
			.references(() => users.id),
		exerciseId: uuid("exercise_id")
			.notNull()
			.references(() => labExercises.id),
		sessionDate: date("session_date").notNull(),
		labId: uuid("lab_id")
			.notNull()
			.references(() => labs.id),
		labName: text("lab_name").notNull(),
		startTime: time("start_time").notNull(),
		endTime: time("end_time").notNull(),
		materials: jsonb().$type<RequestMaterials>().notNull(),
		professorNote: text("professor_note"),
		staffNote: text("staff_note"),
		status: requestStatus().notNull().default("open"),
		lateReason: text("late_reason"),
		lateAcceptedBy: uuid("late_accepted_by").references(() => users.id),
		lateAcceptedAt: timestamp("late_accepted_at", { withTimezone: true }),
		scheduleNeedsConfirmation: boolean("schedule_needs_confirmation")
			.notNull()
			.default(false),
		scheduleConfirmedBy: uuid("schedule_confirmed_by").references(
			() => users.id,
		),
		scheduleConfirmedAt: timestamp("schedule_confirmed_at", {
			withTimezone: true,
		}),
		reviewedBy: uuid("reviewed_by").references(() => users.id),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		fulfilledBy: uuid("fulfilled_by").references(() => users.id),
		fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
		cancelledBy: uuid("cancelled_by").references(() => users.id),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("requests_active_group_date_unique")
			.on(table.groupId, table.sessionDate)
			.where(sql.raw('"status" <> \'cancelled\'')),
		index("requests_session_date_idx").on(table.sessionDate),
		check("requests_time_order", sql`${table.startTime} < ${table.endTime}`),
		check(
			"requests_late_acceptance_valid",
			sql`
    ${table.lateAcceptedAt} IS NULL OR
    (${table.lateReason} IS NOT NULL AND ${table.lateAcceptedBy} IS NOT NULL)
  `,
		),
	],
);

export const settings = pgTable(
	"settings",
	{
		id: integer().primaryKey().default(1),
		minNoticeDays: integer("min_notice_days").notNull().default(7),
	},
	(table) => [
		check("settings_single_row", sql`${table.id} = 1`),
		check("settings_notice_nonnegative", sql`${table.minNoticeDays} >= 0`),
	],
);

CREATE TABLE "account_balance_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"monthly_balance_id" integer NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_monthly_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"period" date NOT NULL,
	"opening_balance" numeric(14, 2) NOT NULL,
	"income_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expense_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cash_movement_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"adjustments_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"calculated_balance" numeric(14, 2) NOT NULL,
	"closing_balance" numeric(14, 2) NOT NULL,
	"reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_monthly_balances_account_id_period_unique" UNIQUE("account_id","period"),
	CONSTRAINT "account_monthly_balances_user_id_account_id_id_unique" UNIQUE("user_id","account_id","id"),
	CONSTRAINT "account_monthly_balances_period_check" CHECK (EXTRACT(DAY FROM "account_monthly_balances"."period"::date) = 1)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"currency" text NOT NULL,
	"opening_balance" numeric(14, 2) NOT NULL,
	"opening_date" date NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "accounts_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "accounts_kind_check" CHECK ("accounts"."kind" IN ('cash', 'bank'))
);
--> statement-breakpoint
CREATE TABLE "cash_movement_subtypes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movement_subtypes_user_id_type_id_name_unique" UNIQUE("user_id","type_id","name"),
	CONSTRAINT "cash_movement_subtypes_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "cash_movement_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movement_types_user_id_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "cash_movement_types_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"comment" text,
	"initiator_account_id" integer,
	"receiver_account_id" integer,
	"movement_subtype_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movements_amount_check" CHECK ("cash_movements"."amount" > 0),
	CONSTRAINT "cash_movements_account_check" CHECK ("cash_movements"."initiator_account_id" IS NOT NULL OR "cash_movements"."receiver_account_id" IS NOT NULL),
	CONSTRAINT "cash_movements_distinct_accounts_check" CHECK ("cash_movements"."initiator_account_id" IS NULL
        OR "cash_movements"."receiver_account_id" IS NULL
        OR "cash_movements"."initiator_account_id" <> "cash_movements"."receiver_account_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_id_kind_name_unique" UNIQUE("user_id","kind","name"),
	CONSTRAINT "categories_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "categories_kind_check" CHECK ("categories"."kind" IN ('expense', 'income'))
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"applies_to" text NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"field_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_field_definitions_user_id_applies_to_field_key_unique" UNIQUE("user_id","applies_to","field_key"),
	CONSTRAINT "custom_fields_applies_to_check" CHECK ("custom_field_definitions"."applies_to" IN ('expense', 'income')),
	CONSTRAINT "custom_fields_type_check" CHECK ("custom_field_definitions"."field_type" IN ('string', 'date', 'number', 'boolean'))
);
--> statement-breakpoint
CREATE TABLE "expense_purposes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_purposes_user_id_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "expense_purposes_user_id_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"purpose_id" integer,
	"subscription_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"comment" text,
	"custom_fields" jsonb,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"comment" text,
	"custom_fields" jsonb,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incomes_amount_check" CHECK ("incomes"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"purpose_id" integer,
	"name" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"frequency" text NOT NULL,
	"involved_party" text,
	"comment" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "subscriptions_amount_check" CHECK ("subscriptions"."amount" > 0),
	CONSTRAINT "subscriptions_frequency_check" CHECK ("subscriptions"."frequency" IN ('daily', 'weekly', 'monthly', 'yearly'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "account_balance_adjustments" ADD CONSTRAINT "account_balance_adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balance_adjustments" ADD CONSTRAINT "account_balance_adjustments_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balance_adjustments" ADD CONSTRAINT "account_balance_adjustments_monthly_balance_fk" FOREIGN KEY ("user_id","account_id","monthly_balance_id") REFERENCES "public"."account_monthly_balances"("user_id","account_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_monthly_balances" ADD CONSTRAINT "account_monthly_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_monthly_balances" ADD CONSTRAINT "account_monthly_balances_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movement_subtypes" ADD CONSTRAINT "cash_movement_subtypes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movement_subtypes" ADD CONSTRAINT "cash_movement_subtypes_type_fk" FOREIGN KEY ("user_id","type_id") REFERENCES "public"."cash_movement_types"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movement_types" ADD CONSTRAINT "cash_movement_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_initiator_account_fk" FOREIGN KEY ("user_id","initiator_account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_receiver_account_fk" FOREIGN KEY ("user_id","receiver_account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_subtype_fk" FOREIGN KEY ("user_id","movement_subtype_id") REFERENCES "public"."cash_movement_subtypes"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_purposes" ADD CONSTRAINT "expense_purposes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."categories"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_purpose_fk" FOREIGN KEY ("user_id","purpose_id") REFERENCES "public"."expense_purposes"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_subscription_fk" FOREIGN KEY ("user_id","subscription_id") REFERENCES "public"."subscriptions"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_category_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."categories"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_fk" FOREIGN KEY ("user_id","category_id") REFERENCES "public"."categories"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_purpose_fk" FOREIGN KEY ("user_id","purpose_id") REFERENCES "public"."expense_purposes"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_balance_adjustments_account_date_idx" ON "account_balance_adjustments" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "account_monthly_balances_user_period_idx" ON "account_monthly_balances" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "accounts_user_deleted_idx" ON "accounts" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE INDEX "cash_movements_user_date_idx" ON "cash_movements" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "cash_movements_initiator_idx" ON "cash_movements" USING btree ("initiator_account_id","date");--> statement-breakpoint
CREATE INDEX "cash_movements_receiver_idx" ON "cash_movements" USING btree ("receiver_account_id","date");--> statement-breakpoint
CREATE INDEX "expenses_user_date_idx" ON "expenses" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "expenses_account_date_idx" ON "expenses" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expenses_subscription_idx" ON "expenses" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "incomes_user_date_idx" ON "incomes" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "incomes_account_date_idx" ON "incomes" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "incomes_category_idx" ON "incomes" USING btree ("category_id");
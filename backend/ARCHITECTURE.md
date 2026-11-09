# Smart Lotus Backend Architecture

## 1. Product boundary

The backend is a modular monolith for three product surfaces:

- **Student**: lessons, placement, quiz attempts, progress, classrooms and assignments.
- **Teacher**: classroom rosters, assignments, assignment projects and progress views.
- **Admin**: user/role management, content governance, platform metrics and configuration.

The frontend can be split into separate deployables later. The backend keeps one deployable unit
until the domain boundaries and traffic justify a service split.

## 2. Package structure

```text
backend/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── mvnw
├── README.md
├── ARCHITECTURE.md
└── src/
    └── main/
        ├── java/vn/smartlotus/backend/
        │   ├── SmartLotusApplication.java
        │   ├── identity/
        │   │   ├── domain/              # User, role and identity rules
        │   │   ├── application/         # Use cases for current user/profile
        │   │   ├── infrastructure/      # JPA repositories and adapters
        │   │   └── interfaces/rest/     # Profile and identity HTTP API
        │   ├── learning/
        │   │   ├── domain/              # Lesson and attempt aggregates
        │   │   ├── application/         # Learning use cases
        │   │   ├── infrastructure/
        │   │   └── interfaces/rest/
        │   ├── classroom/
        │   │   ├── domain/              # Classroom aggregate
        │   │   ├── application/         # Create, join, invite and roster use cases
        │   │   ├── infrastructure/
        │   │   └── interfaces/rest/
        │   ├── assignment/
        │   │   ├── domain/              # Assignment and submission aggregates
        │   │   ├── application/
        │   │   ├── infrastructure/
        │   │   └── interfaces/rest/
        │   ├── dashboard/
        │   │   └── interfaces/rest/     # Read model for student/teacher screens
        │   └── shared/
        │       ├── api/                  # Error and health contracts
        │       ├── config/               # Security, CORS and app configuration
        │       └── security/             # Current-user abstraction
        └── resources/
            ├── application.yml
            ├── application-prod.yml
            └── db/migration/
                ├── V1__create_core_schema.sql
                └── V2__normalize_identity_and_roles.sql
```

## 3. Dependency rule

```text
interfaces/rest -> application -> domain
                         |
                         └-> infrastructure (through repository ports)
```

- Controllers only translate HTTP requests to application commands and responses.
- Domain objects do not import Spring MVC, HTTP or database classes.
- Application services own transactions and authorization decisions for a use case.
- Infrastructure implements persistence and external integrations.
- Shared code must stay generic; it must not contain classroom or assignment business rules.

## 4. Identity and roles

`users` remains the compatibility account table. The normalized model is:

```text
users (account)
  ├── user_profiles       common personal data
  ├── user_roles          student | teacher | admin
  ├── student_profiles    placement, points, streak and class data
  ├── teacher_profiles    school, subject and verification data
  └── admin_profiles      admin level and audit-related data
```

A user may have more than one role, but only one primary role. The database migration backfills
these tables from the legacy `users` row. Classroom ownership is protected by a PostgreSQL trigger
requiring the `teacher` role.

## 5. Main aggregates

- **User**: account identity, role assignment and profile ownership.
- **Lesson**: published learning content.
- **QuizAttempt**: immutable result linked to one student and optional lesson.
- **Classroom**: teacher-owned class with membership and invitation boundaries.
- **Assignment**: teacher-owned work assigned to one classroom.
- **AssignmentSubmission**: one student result per assignment.

Do not update another aggregate by reaching into its JPA object graph. Use an application command or
domain event when a cross-context action is needed.

## 6. Database rules

- Flyway is the only schema migration mechanism for the Spring backend.
- Never edit an applied migration. Add `V3__...sql`, `V4__...sql`, etc.
- PostgreSQL is the source of truth for constraints, unique keys, role integrity and indexes.
- JSONB is reserved for variable educational content (`questions`, `answers`, `placement`).
- All timestamps are UTC `TIMESTAMPTZ`.
- Production uses `ddl-auto=validate`; Hibernate never creates or changes tables.

The current schema is not six tables. It has 11 core tables from V1, five normalized
identity/profile tables from V2, and the audit table from V3. The six names are bounded contexts,
which group related tables and business rules. V3 adds query-path indexes for user progress,
classroom rosters, assignments and audit history; it also adds a BRIN index for append-heavy audit
timestamps.

## 7. API conventions

- Keep the existing frontend contract under `/api/...` during migration.
- Use `201 Created` for successful creation, `400` for validation, `401` for missing identity, `403`
  for role/ownership violations, and `404` for missing resources.
- Do not expose JPA entities directly from new endpoints. Map to response records.
- Use `Authorization: Bearer <Supabase JWT>` in production. Local mode is only for development.

## 8. Delivery order

1. Identity and normalized role model.
2. Classroom membership, join code and invitations.
3. Assignment submission and scoring.
4. Admin user/content management.
5. AI and media adapters.
6. Read-model optimization and audit events.

This order keeps the three interfaces usable while the old Next.js API is replaced incrementally.

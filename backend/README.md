# Smart Lotus Backend

Spring Boot 3 + Java 21 + PostgreSQL backend for the three Smart Lotus interfaces. The application
is a modular monolith organized by DDD bounded contexts:

See [ARCHITECTURE.md](ARCHITECTURE.md) for the package tree, role model, database ownership and
rules for adding new modules.

- `identity`: current user, profile, placement
- `learning`: lessons and quiz attempts
- `dashboard`: progress view used by the student and teacher interfaces
- `classroom`: teacher classrooms and ownership rules
- `assignment`: teacher assignment creation and listing
- `shared`: security, API errors and cross-cutting configuration

## Run locally

Requirements for local mode: Java 21, Maven 3.9+, Docker. Docker mode needs Docker only.

```bash
docker compose up --build
```

The API starts at `http://localhost:8080` and Flyway creates the schema automatically. Local mode is
enabled by default and uses the identity from `SMARTLOTUS_USER_*`. It is intended only for
development. For production, set `SECURITY_ENABLED=true` and configure `SUPABASE_ISSUER_URI`.

To run outside Docker:

```bash
docker compose up -d postgres
./mvnw spring-boot:run
```

Maven is installed user-local at `~/.local/share/apache-maven-3.9.11` on the current machine. The
repository wrapper uses it automatically when available. New team members can use
`docker compose up --build` without installing Maven.

Integration tests use Testcontainers and require Docker. On Docker daemons that require API version
1.40 or newer, run them with:

```bash
./mvnw -Pintegration -Dapi.version=1.40 test
```

## Verify

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/lessons
curl http://localhost:8080/api/dashboard
```

## Frontend integration

The existing Next.js and Vite clients currently call relative `/api/...` URLs. Point their dev proxy
or deployment reverse proxy at this service, or expose the backend under the same origin. The first
implemented contract is:

- `GET /api/health`
- `GET /api/lessons`
- `GET /api/dashboard?role=student`
- `POST /api/attempts`
- `PUT /api/profile`
- `PATCH /api/profile`
- `GET /api/classrooms`
- `POST /api/classrooms`
- `GET /api/assignments`
- `POST /api/assignments`

The database migration mirrors the existing Drizzle schema in
`src/main/resources/db/migration/V1__create_core_schema.sql`; new schema changes must be added as
new Flyway migrations.

## Demo accounts

The development-only accounts are stored in `demo-accounts.sql` and do not create production
passwords. Local mode selects the active identity through environment variables:

```bash
SMARTLOTUS_USER_ID=00000000-0000-0000-0000-000000000001 \
SMARTLOTUS_USER_EMAIL=admin.demo@smartlotus.local \
SMARTLOTUS_USER_NAME='Quản trị viên demo' \
SMARTLOTUS_USER_ROLE=admin \
./mvnw spring-boot:run
```

Available demo identities:

| Role    | User ID                                | Email                           |
| ------- | -------------------------------------- | ------------------------------- |
| Admin   | `00000000-0000-0000-0000-000000000001` | `admin.demo@smartlotus.local`   |
| Teacher | `00000000-0000-0000-0000-000000000002` | `teacher.demo@smartlotus.local` |
| Student | `00000000-0000-0000-0000-000000000003` | `student.demo@smartlotus.local` |

Set `SECURITY_ENABLED=true` and configure the Supabase JWT issuer before production deployment.

# Daily Expense & Budget Logger - Spring Boot Server Application

This folder contains the complete, layered backend REST API for the **Daily Expense & Budget Logger** platform, developed using Java 17, Spring Boot 3, Spring Security, JWT, and PostgreSQL.

---

## 📂 Project Directory Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/expense/logger/
│   │   │   ├── config/       # Beans configurations (cors, security patterns)
│   │   │   ├── controller/   # REST Controllers endpoints mapping
│   │   │   ├── dto/          # Data Transfer Objects encapsulation
│   │   │   ├── exception/    # Custom Exception Handlers mapping
│   │   │   ├── model/        # JPA Entities representing database schemas
│   │   │   ├── repository/   # Spring Data JPA Repository database triggers
│   │   │   ├── security/     # JWT Token verification filters & providers
│   │   │   └── service/      # Business logic implementation classes
│   │   └── resources/
│   │       ├── application-dev.properties   # Core development settings
│   │       └── schema.sql                   # Database setup queries script
│   └── test/                 # Test suites (security integration, core features)
├── pom.xml                   # Maven dependencies configurations
└── mvnw                      # Maven wrapper execution script
```

---

## 🛠️ Scripts & Commands

From the `backend` directory:

1. **Start Spring Boot Dev Server**:
   ```bash
   ./mvnw spring-boot:run
   ```
2. **Execute Full Test Suite**:
   ```bash
   ./mvnw clean test
   ```
3. **Build Target Package**:
   ```bash
   ./mvnw clean package
   ```

---

## 🔑 Local Environment Configuration

Make sure you create a local PostgreSQL database instance named `expense_logger` and configure your credentials inside `.env` or application property overrides.

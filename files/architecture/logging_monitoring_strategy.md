# Logging & Monitoring Strategy (logging_monitoring_strategy.md)

## 🎯 Objectives
The primary objective of the **Logging & Monitoring Strategy** is to define how application events, exceptions, transaction histories, and performance metrics are logged and monitored. This ensures issues can be detected, diagnosed, and resolved quickly in both development and high-availability production environments.

## 🔍 Scope
- **In-Scope**:
  - SLF4J / Logback configuration structures.
  - Log severity standards and their precise application.
  - Correlation IDs and Mapped Diagnostic Context (MDC) tracing.
  - Structured JSON logging for production.
  - Sensitive data masking policy (credentials, tokens, headers).
  - Centralized logging aggregation preparation.
  - Application health check monitoring via Spring Boot Actuator.
- **Out-of-Scope**:
  - Host server operating system log rotation mechanics.
  - Cloud provider log shipper (e.g., FluentBit, Logstash) deployment scripting.

---

## 🚦 Log Severity Standards

To keep logs clean and searchable, developers must adhere to the following severity levels:

| Level | Severity | Target Scenario | Output Contents | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **ERROR** | High | System crashes, database failures, third-party API timeout/disconnects, unhandled exceptions. | Exception type, full stack trace, request path, correlation ID. | Immediate alert generation (Slack/PagerDuty/Email). |
| **WARN** | Medium | Failed authentication attempts, request validation failures, slow SQL queries, circuit breaker trips. | Trigger parameters, exception messages (no stack traces). | Batch review weekly or system dashboard tracking. |
| **INFO** | Low | Application startup events, key business transaction completions (e.g. "User registered", "Expense created"). | Transaction context (ID, timestamp, correlation ID). | Retained for audit trails and usage metrics. |
| **DEBUG** | None | Verbose internal states, HTTP filter chain hops, SQL bindings. | Developer diagnostics, internal variable state. | Active in Local/Dev environment only. Disabled in Prod. |

---

## 🧬 Tracing & Structured Logging

### 1. Correlation IDs (MDC Tracing)
Every inbound API request must be tracked across the codebase using a unique Correlation ID:
- **Generation**: A Spring Boot Servlet Filter (`LoggingFilter`) intercepts all incoming HTTP requests. If the request does not contain a correlation ID header (`X-Correlation-ID`), the filter generates a new `UUID`.
- **Propagation (MDC)**: The Correlation ID is stored in SLF4J's **MDC (Mapped Diagnostic Context)**. Since MDC uses thread-local variables, every log line printed by that execution thread automatically inherits the correlation ID.
- **Response Header**: The `LoggingFilter` appends the Correlation ID to the outbound HTTP response header (`X-Correlation-ID`) so clients can reference it when reporting errors.
- **Client Propagation**: When the frontend (Axios client) encounters an error, the UI displays the Correlation ID, helping developers trace the exact log sequence.

### 2. Request Tracing
The `LoggingFilter` records request performance details:
- **Request Entrance**: Logs HTTP Method, Path, and Client IP.
- **Request Exit**: Logs execution duration (ms) and HTTP status code.
- **Formatting**:
  ```text
  [MDC: correlation_id=abc-123-xyz] Incoming Request: GET /api/v1/expenses
  [MDC: correlation_id=abc-123-xyz] Outgoing Response: 200 OK | Duration: 45ms
  ```

### 3. Structured Logging (JSON Production Format)
Standard plain-text console logs are difficult to parse in log aggregators.
- **Format**: In production, the Logback configuration (using `Logstash Logback Encoder`) outputs logs as a structured JSON object on stdout (standard output).
- **Schema**:
  ```json
  {
    "@timestamp": "2026-06-24T12:05:00.123Z",
    "level": "INFO",
    "logger_name": "com.logger.filter.LoggingFilter",
    "thread_name": "http-nio-8080-exec-1",
    "message": "Outgoing Response: 200 OK | Duration: 45ms",
    "correlation_id": "abc-123-xyz",
    "user_id": "45",
    "duration_ms": 45
  }
  ```

---

## 🔒 Sensitive Data Masking Policy

To comply with security and privacy regulations (GDPR/PCI), logs must never contain Personally Identifiable Information (PII) or sensitive tokens.

### Masking Rules
1. **Passwords & PINs**: Cleartext passwords must never be printed. Auth DTOs must exclude passwords in their `toString()` methods or use custom Logback replacement patterns.
2. **JWT Tokens**: Access and Refresh tokens must be masked. Loggers must strip token strings from logs.
3. **Authorization Headers & Cookies**: The `Authorization` header (`Bearer ...`) and `Cookie` headers containing session tokens must be completely excluded from HTTP request tracing logs.
4. **Implementation**: Utilize Logback's `SecurePatternLayout` or custom SLF4J converter properties to match and replace sensitive keys (e.g. `password`, `token`, `bearer`) with `[MASKED]`.

---

## 🚀 Centralized Logging Preparation

To support multi-node scaling:
- **Stdout Streaming**: Containerized applications will stream JSON formatted logs directly to `stdout`.
- **Log Aggregators**: Log shippers (such as FluentBit or Datadog Agent) will tail the container stdout, gather logs, and push them to centralized log indexing services (ELK Stack, Grafana Loki, or Google Cloud Logging).
- **Search Optimization**: Log aggregation indices will be structured to search by `correlation_id`, `user_id`, or `level` for rapid issue identification.

---

## 💎 Advantages
- **Fast Troubleshooting**: Structured stack traces pinpoint the exact line numbers and exception details of errors.
- **Traceable Activity**: Audit logs track user creations, updates, and soft deletes, providing an audit trail.
- **Automated Health Checks**: System monitoring tools check actuator endpoints regularly to detect outages automatically.

## ⚠️ Risks & Mitigations
1. **Risk**: PII (Personally Identifiable Information) leaking into log files (such as passwords, credit card numbers).
   - *Mitigation*: Enforce strict logging rules. Log statements must never print raw DTOs containing passwords or personal data. Use custom toString mappings that exclude sensitive fields.
2. **Risk**: Disk space exhaustion from excessive logging (e.g., leaving log levels set to DEBUG in production).
   - *Mitigation*: Set default logging levels to INFO in production. Configure Logback's size-based and time-based log rotation (e.g., rotate logs daily, retaining a maximum of 10GB).

## 🚀 Future Scalability Notes
- **Distributed Tracing (Sleuth/Zipkin)**: In later enterprise phases, distribute trace and span IDs across all microservice requests, letting teams trace individual user requests as they propagate across separate servers.

## 🛠️ Best Practices
- **Log with context**: Include context parameters (like `user_id` or `expense_id`) in log messages to make tracing issues easier.
- **Write descriptive logs**: Log messages should clearly explain what happened (e.g., "Failed to retrieve expense: record not found" rather than "Error occurred").
- **Never catch exceptions without logging them**: Ensure caught exceptions are logged with their stack traces rather than swallowed.

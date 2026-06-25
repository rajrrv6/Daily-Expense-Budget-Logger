# Gemini Integration & Prompting Governance (GEMINI.md)

## 🎯 Objectives
The primary objective of the **Gemini Integration Governance** document is to standardize how the Gemini LLM is used throughout development—both as a coding assistant and as an integrated API (e.g., for future analytics, natural language search, or auto-categorization). It ensures high efficiency, security compliance, and prevents prompt injection vulnerabilities.

## 🔍 Scope
- **In-Scope**:
  - Directives for LLM prompting style and code validation.
  - Guidelines for interacting with Gemini APIs in backend services.
  - Safe parsing rules for LLM outputs (JSON validation, sanitization).
  - Rate limiting and API key management policies.
- **Out-of-Scope**:
  - The configuration of developer personal IDE accounts.

## 🏗️ Design Decisions
1. **JSON-Schema validation for all LLM calls**:
   - *Rationale*: LLM outputs are inherently non-deterministic. Every backend application call to the Gemini API must request outputs structured in JSON schemas (e.g., using Gemini's Structured Outputs feature) and validate the responses using JSON-schema parsers before execution.
2. **System-prompt isolation**:
   - *Rationale*: To prevent prompt injection, the system prompts must be hardcoded inside the application code and isolated from user inputs. User-provided queries must only populate structured input parameters.

---

## 💻 Developer & AI Agent Guidelines

### 1. Developer Prompting Standards
When using Gemini for writing, debugging, or reviewing code, developers (and agents) must use structured prompts:
- **Role Assignment**: Assign a specific role (e.g., "Act as a Senior Spring Security Specialist").
- **Constraint Boundaries**: Provide explicit "DO NOT" clauses (e.g., "DO NOT write deprecated Spring Security classes like WebSecurityConfigurerAdapter").
- **Verification Criteria**: Ask the model to provide unit test instructions or validation steps alongside code snippets.

### 2. Backend Integration Guidelines (Future Steps)
For future integrations (e.g. AI expense forecasting):
- Use the official Google GenAI SDK.
- Configure request timeouts strictly (maximum 5 seconds) to prevent API hangs from blocking server worker threads.
- Implement an exponential backoff retry mechanism using Spring Retry to handle rate-limiting (HTTP 429) errors gracefully.

---

## 💎 Advantages
- **Predictable Behavior**: Strict schema constraints ensure that the application handles LLM responses without parsing errors.
- **Security Compliance**: System prompt isolation protects the backend from malicious user prompts that try to extract system instructions.
- **Optimized Performance**: Strict timeouts and retries prevent the application from hanging.

## ⚠️ Risks & Mitigations
1. **Risk**: Prompt injection leading to leakage of backend data.
   - *Mitigation*: Never pass raw files, system environment variables, or database structures directly into prompt templates. Sanitize all user inputs before they are passed into the LLM context.
2. **Risk**: High API costs from excessive calls.
   - *Mitigation*: Implement caching (Redis) for recurrent queries (e.g., repeating the same analytics requests within the same hour).

## 🚀 Future Scalability Notes
- **Decoupled AI Service**: As AI features expand, the Gemini API integration will be extracted into a dedicated Spring Boot microservice. This isolates the heavier AI-related dependency libraries (and higher request latencies) from the core transactional expense logger API.

## 🛠️ Best Practices
- **Strict output sanitization**: Always strip HTML/markdown tags from LLM text responses before rendering them in the React client.
- **Monitor usage tokens**: Implement logging of prompt and response tokens to monitor operational costs.
- **Define fallback behavior**: Always specify default static behaviors (e.g., manual categorization) in case the Gemini API is unreachable or returns malformed data.

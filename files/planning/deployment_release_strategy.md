# Deployment & Release Strategy (deployment_release_strategy.md)

## 🎯 Objectives
The primary objective of the **Deployment & Release Strategy** is to define the steps, environment progression, and release gates required to deploy the application. It outlines containerization structures, deployment environments, CI/CD integrations, and rollback strategies.

## 🔍 Scope
- **In-Scope**:
  - Multi-stage Docker image builds.
  - Multi-environment setup (Development, Staging, Production).
  - Continuous Integration (CI) test executions.
  - Deployment release gates and checklists.
  - Rollback strategies.
- **Out-of-Scope**:
  - Specific cloud server hosting pricing models.

## 🏗️ Design Decisions
1. **Multi-stage Docker Builds**:
   - *Rationale*: Isolating frontend and backend builds in separate containers ensures consistent runtime behavior across dev, staging, and production environments, while keeping final image sizes small.
2. **Stateless API Gateway Proxies (NGINX)**:
   - *Rationale*: Direct access to Spring Boot ports is blocked. NGINX handles SSL/TLS encryption, CORS validation, and proxy routing to application nodes.

---

## 💎 Advantages
- **Consistent Environments**: Docker containers eliminate "works on my machine" deployment bugs.
- **Improved Performance**: Deploying frontend assets to CDNs keeps loading times fast.
- **Secure Boundaries**: NGINX limits attack exposure by routing all traffic through a single gateway port.

## ⚠️ Risks & Mitigations
1. **Risk**: Data loss during database migrations.
   - *Mitigation*: Run backups of production databases before executing migrations, and test schema updates in staging first.
2. **Risk**: Redirection loops during authentication failures.
   - *Mitigation*: Ensure the Axios 401 interceptor clears local storage credentials and cancels pending requests before redirecting to the login route.

## 🚀 Future Scalability Notes
- **Kubernetes Clustering**: As user traffic grows, transition from Docker Compose to a Kubernetes cluster (EKS/GKE) with auto-scaling configurations.

## 🛠️ Best Practices
- **Use Multi-stage Docker builds**: Separate build tools from runtime containers to keep production image sizes small and secure.
- **Enable SSL/TLS**: Block unencrypted HTTP (Port 80) connections, redirecting all traffic to HTTPS (Port 443).
- **Run automated migration tests**: Verify schema migrations run successfully on empty staging databases before executing them in production.

---

## 🚀 Environment Progression & Release Gates

```
 [Local Commit] ---> [CI Pre-merge Pipeline] ---> [Merge to main]
                                                        |
                                                        v
 [Production Registry] <--- [Staging Deploy & Test] <----+
 (Version Tagging)
```

### 1. Release Gates & Deployment Checklist
- **Gate 1: Pre-merge (CI)**:
  - Verify all unit and integration tests pass.
  - Verify code styling and formatting rules are met.
- **Gate 2: Staging Release**:
  - Deploy Docker container configurations to staging.
  - Run database schema migration scripts.
  - Verify Playwright/Cypress integration tests pass on the staging environment.
- **Gate 3: Production Release**:
  - Run manual QA sanity tests in staging.
  - Schedule deployment during low-traffic windows.
  - Back up production database schemas and contents.
  - Deploy verified staging containers to production.

### 2. Rollback Strategy
If production deployments encounter regressions or failures:
- Revert the Git repository branch to the last stable release tag.
- Re-deploy the previously verified Docker images.
- If schema migrations were executed, run rollback migrations on the database to restore schemas.
- Restore the pre-deployment database backup if data inconsistencies occurred.

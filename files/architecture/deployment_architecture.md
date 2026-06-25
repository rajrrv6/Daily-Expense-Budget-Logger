# Deployment Architecture Specification (deployment_architecture.md)

## 🎯 Objectives
The primary objective of the **Deployment Architecture** is to design a secure, reliable containerized deployment strategy. This includes container packaging (Dockerfiles), reverse proxy configurations, environment separation, and deployment pipelines.

## 🔍 Scope
- **In-Scope**:
  - Docker container configuration plans for frontend, backend, and database layers.
  - NGINX configuration guidelines (reverse proxy, static file server, SSL termination).
  - Multi-environment setup rules (Dev, Staging, Prod).
  - SSL/TLS security protocols.
- **Out-of-Scope**:
  - Specific cloud server hosting pricing models.

## 🏗️ Design Decisions
1. **Docker Containerization**:
   - *Rationale*: Isolating frontend, backend, and PostgreSQL in separate containers ensures consistent runtime behavior across dev, staging, and production environments.
2. **NGINX Reverse Proxy and SSL Gateway**:
   - *Rationale*: Direct access to Spring Boot ports is blocked. NGINX acts as the single entry point, handling SSL/TLS encryption, CORS validation, and proxy routing to application nodes.
3. **Environment Isolation via Docker Compose**:
   - *Rationale*: Isolates staging and production environments using distinct networks and environment parameter files (`.env`).

---

## 🏗️ Production Topology Plan

```
             [Client Web Browser]
                      |
                      | HTTPS (Port 443)
                      v
             [NGINX Reverse Proxy]
                      |
         +------------+------------+
         | Proxy Routing           | Static File Delivery
         v                         v
  [Spring Boot Web App]     [React SPA Bundle]
  (Docker Container,        (Served statically by NGINX)
   Port 8080)
         |
         | JDBC connection (Port 5432)
         v
  [PostgreSQL Database]
  (Docker Container, Port 5432)
```

---

## 💎 Advantages
- **Easy Scaling**: Separating frontend static assets from backend API services allows each to scale independently.
- **Consistent Environments**: Docker containers eliminate "works on my machine" deployment bugs.
- **Enhanced Security**: NGINX limits attack exposure by routing all backend traffic through a single gateway port.

## ⚠️ Risks & Mitigations
1. **Risk**: Exposing database ports directly to the internet.
   - *Mitigation*: PostgreSQL container ports are not published to the host machine. The database is reachable only via the internal Docker bridge network by the Spring Boot container.
2. **Risk**: Data loss when containers restart.
   - *Mitigation*: Configure persistent PostgreSQL volumes on the host system to secure data directories outside the container lifecycles.

## 🚀 Future Scalability Notes
- **Kubernetes Migration**: Since all components are containerized, the application can migrate to a Kubernetes cluster (EKS/GKE) with minimal friction, wrapping pods in deployment scripts.

## 🛠️ Best Practices
- **Use Multi-stage Docker Builds**: Keeps production image sizes small and secure by separating build dependencies from the runtime image.
- **Disable Root Privileges**: Run containers using dedicated non-root users.
- **Enforce SSL/TLS**: Block unencrypted HTTP (Port 80) connections, redirecting all traffic to HTTPS (Port 443).

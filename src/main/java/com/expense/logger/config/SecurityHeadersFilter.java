package com.expense.logger.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class SecurityHeadersFilter extends OncePerRequestFilter {

    private final SecurityHeaderProperties properties;
    private final Environment environment;

    public SecurityHeadersFilter(SecurityHeaderProperties properties, Environment environment) {
        this.properties = properties;
        this.environment = environment;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Strict-Transport-Security (HSTS)
        if (properties.isHstsEnabled()) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        }

        // 2. X-Frame-Options (DENY)
        if (properties.getFrameOptions() != null && !properties.getFrameOptions().isEmpty()) {
            response.setHeader("X-Frame-Options", properties.getFrameOptions());
        }

        // 3. X-Content-Type-Options (nosniff)
        if (properties.getContentTypeOptions() != null && !properties.getContentTypeOptions().isEmpty()) {
            response.setHeader("X-Content-Type-Options", properties.getContentTypeOptions());
        }

        // 4. Referrer-Policy
        if (properties.getReferrerPolicy() != null && !properties.getReferrerPolicy().isEmpty()) {
            response.setHeader("Referrer-Policy", properties.getReferrerPolicy());
        }

        // 5. Permissions-Policy
        if (properties.getPermissionsPolicy() != null && !properties.getPermissionsPolicy().isEmpty()) {
            response.setHeader("Permissions-Policy", properties.getPermissionsPolicy());
        }

        // 6. Content-Security-Policy (CSP) - Environment Aware
        if (properties.isCspEnabled()) {
            boolean isProd = false;
            for (String profile : environment.getActiveProfiles()) {
                if ("prod".equalsIgnoreCase(profile)) {
                    isProd = true;
                    break;
                }
            }

            String cspValue = isProd ? properties.getCspPolicyProd() : properties.getCspPolicyDev();
            response.setHeader("Content-Security-Policy", cspValue);
        }

        // Forward to the next filter
        filterChain.doFilter(request, response);
    }
}

package com.expense.logger.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.security.headers")
@Data
public class SecurityHeaderProperties {

    private boolean cspEnabled = true;
    private boolean hstsEnabled = true;
    private String frameOptions = "DENY";
    private String contentTypeOptions = "nosniff";
    private String referrerPolicy = "strict-origin-when-cross-origin";
    private String permissionsPolicy = "geolocation=(), microphone=(), camera=()";

    private String cspPolicyDev = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';";
    
    private String cspPolicyProd = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';";
}

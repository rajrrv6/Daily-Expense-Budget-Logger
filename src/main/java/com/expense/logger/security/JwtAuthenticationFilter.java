package com.expense.logger.security;

import com.expense.logger.service.JwtBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final JwtBlacklistService blacklistService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, JwtBlacklistService blacklistService) {
        this.tokenProvider = tokenProvider;
        this.blacklistService = blacklistService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                
                // Perform real-time token blacklist checking (revocation verification)
                if (blacklistService.isBlacklisted(jwt)) {
                    logger.warn("Security Alert: Attempted access using revoked/blacklisted JWT JTI: " + tokenProvider.getJtiFromJwt(jwt));
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"JWT has been revoked. Re-authentication required.\"}");
                    return;
                }

                String username = tokenProvider.getUsernameFromJwt(jwt);

                // Perform real-time user-level lock/revocation checking
                if (blacklistService.isUserBlacklisted(username)) {
                    logger.warn("Security Alert: Attempted access by blacklisted/locked user: " + username);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"User account has been locked or session revoked.\"}");
                    return;
                }

                List<String> roles = tokenProvider.getRolesFromJwt(jwt);
                List<String> permissions = tokenProvider.getPermissionsFromJwt(jwt);

                List<GrantedAuthority> authorities = new ArrayList<>();
                if (roles != null) {
                    roles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
                }
                if (permissions != null) {
                    permissions.forEach(perm -> authorities.add(new SimpleGrantedAuthority(perm)));
                }

                // Construct a stateless UserDetails instance using Spring Security's User object
                UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                        username,
                        "",
                        authorities
                );

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (org.springframework.data.redis.RedisSystemException ex) {
            logger.error("Security Enforcement blocked request: Redis blacklist offline. Details: " + ex.getMessage());
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":503,\"error\":\"Service Unavailable\",\"message\":\"Security cache database is offline. Fail-secure block activated.\"}");
            return;
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        String tokenParam = request.getParameter("token");
        if (StringUtils.hasText(tokenParam)) {
            return tokenParam;
        }
        return null;
    }
}

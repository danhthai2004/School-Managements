package com.schoolmanagement.backend.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;

@Slf4j
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final UserDetailsService userDetailsService;
    private Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    public JwtAuthFilter(JwtService jwt, UserDetailsService userDetailsService) {
        this.jwt = jwt;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String requestUri = request.getRequestURI();

        // Skip CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            logger.debug("[JwtAuth] No Bearer token for: {}", requestUri);
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();
        try {
            var kind = jwt.getKind(token);
            if (kind != TokenKind.ACCESS) {
                logger.debug("[JwtAuth] Wrong token kind for: {}", requestUri);
                filterChain.doFilter(request, response);
                return;
            }
            var claims = jwt.parse(token).getPayload();
            String email = claims.get("email", String.class);
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                var userDetails = userDetailsService.loadUserByUsername(email);
                var auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);

                // Log for notification endpoints
                if (requestUri.contains("/notifications")) {
                    logger.info("[JwtAuth] Authenticated {} with authorities: {} for {}",
                        email, userDetails.getAuthorities(), requestUri);
                }
            }
        } catch (JwtException ex) {
            logger.warn("[JwtAuth] Invalid token for {}: {}", requestUri, ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}


package com.schoolmanagement.backend.config;

import com.schoolmanagement.backend.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter,
            CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/", "/health").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/system/**").hasRole("SYSTEM_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/school/semesters/**", "/api/school/academic-years/**").hasAnyRole("SCHOOL_ADMIN", "TEACHER", "STUDENT", "GUARDIAN")
                        .requestMatchers("/api/school/**").hasRole("SCHOOL_ADMIN")
                        .requestMatchers("/api/school-admin/**").hasRole("SCHOOL_ADMIN")
                        .requestMatchers("/api/teacher/**").hasRole("TEACHER")
                        .requestMatchers("/api/student/**").hasRole("STUDENT")
                        .requestMatchers("/api/guardian/**").hasRole("GUARDIAN")
                        // Notification v1 APIs
                        .requestMatchers("/api/v1/admin/notifications/**").hasRole("SCHOOL_ADMIN")
                        .requestMatchers("/api/v1/teacher/notifications/**").hasRole("TEACHER")
                        .requestMatchers("/api/v1/notifications/**").hasAnyRole("SCHOOL_ADMIN", "TEACHER", "STUDENT", "GUARDIAN")
                        // Risk Analytics APIs
                        .requestMatchers("/api/risk/trigger").hasRole("SCHOOL_ADMIN")
                        .requestMatchers("/api/risk/feedback").hasAnyRole("SCHOOL_ADMIN", "TEACHER")
                        .requestMatchers("/api/risk/**").hasAnyRole("SCHOOL_ADMIN", "TEACHER", "STUDENT")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${APP_CORS_ALLOWED_ORIGINS:${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}}") String origins) {
        List<String> allowedOrigins = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());

        System.out.println("CORS allowed origins: " + allowedOrigins);

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);

        config.setExposedHeaders(List.of("Authorization"));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // @Bean
    // public
    // org.springframework.boot.web.servlet.FilterRegistrationBean<org.springframework.web.filter.CorsFilter>
    // corsFilterRegistration(
    // CorsConfigurationSource corsConfigurationSource) {
    // org.springframework.boot.web.servlet.FilterRegistrationBean<org.springframework.web.filter.CorsFilter>
    // bean = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(
    // new org.springframework.web.filter.CorsFilter(corsConfigurationSource));
    // bean.setOrder(org.springframework.core.Ordered.HIGHEST_PRECEDENCE);
    // return bean;
    // }
}

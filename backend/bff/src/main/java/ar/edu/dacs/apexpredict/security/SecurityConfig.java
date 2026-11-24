package ar.edu.dacs.apexpredict.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(sessions -> sessions.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/health", "/ping", "/backendping", "/conectorping", "/calendar/**", "/results/**", "/f1/**", "/sessions/next/duel-stats").permitAll()
                .requestMatchers("/admin/**").hasRole("admin")
                .requestMatchers("/me/**", "/leagues/**", "/scores/**", "/notifications", "/notifications/**").hasAnyRole("player", "admin")
                .requestMatchers(HttpMethod.GET, "/sessions/next", "/leaderboard/global",
                    "/users/check-display-name",
                    "/predictions/current", "/predictions/history", "/predictions/session/**").hasAnyRole("player", "admin")
                .requestMatchers(HttpMethod.POST, "/predictions/session/**").hasAnyRole("player", "admin")
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(roleConverter()))
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()))
            .build();
    }

    @Bean
    AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> writeError(
            response,
            HttpServletResponse.SC_UNAUTHORIZED,
            "bff_401",
            "Se requiere autenticacion para acceder a este recurso.",
            authException.getMessage() != null ? authException.getMessage() : "No autenticado"
        );
    }

    @Bean
    AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> writeError(
            response,
            HttpServletResponse.SC_FORBIDDEN,
            "bff_403",
            "No tienes permisos suficientes para realizar esta accion.",
            accessDeniedException.getMessage() != null ? accessDeniedException.getMessage() : "Acceso denegado"
        );
    }

    private void writeError(HttpServletResponse response, int status, String code, String description, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        Map<String, Object> error = Map.of(
            "status", status,
            "code", code,
            "description", description,
            "message", message
        );
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    static JwtAuthenticationConverter roleConverter() {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Object access = jwt.getClaim("realm_access");
            if (!(access instanceof Map<?, ?> map) || !(map.get("roles") instanceof Collection<?> roles)) return List.of();
            return roles.stream().filter(String.class::isInstance).map(String.class::cast)
                .filter(role -> role.equals("player") || role.equals("admin"))
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .map(org.springframework.security.core.GrantedAuthority.class::cast).toList();
        });
        return converter;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
        @Value("${apexpredict.security.cors-origins}") List<String> origins) {
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(origins);
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setAllowCredentials(false);
        cors.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }
}

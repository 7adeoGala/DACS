package ar.edu.dacs.apexpredict.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class KeycloakUserSyncService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakUserSyncService.class);

    private final String baseUrl;
    private final String realm;
    private final String clientId;
    private final String adminUsername;
    private final String adminPassword;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    @Autowired
    public KeycloakUserSyncService(
        @Value("${apexpredict.keycloak-admin.url:}") String baseUrl,
        @Value("${apexpredict.keycloak-admin.realm:apexpredict}") String realm,
        @Value("${apexpredict.keycloak-admin.client-id:apexpredict-web}") String clientId,
        @Value("${apexpredict.keycloak-admin.username:}") String adminUsername,
        @Value("${apexpredict.keycloak-admin.password:}") String adminPassword
    ) {
        this.baseUrl = baseUrl != null ? baseUrl.trim().replaceAll("/+$", "") : "";
        this.realm = realm != null && !realm.isBlank() ? realm.trim() : "apexpredict";
        this.clientId = clientId != null && !clientId.isBlank() ? clientId.trim() : "apexpredict-web";
        this.adminUsername = adminUsername != null ? adminUsername.trim() : "";
        this.adminPassword = adminPassword != null ? adminPassword : "";
    }

    public boolean isConfigured() {
        return !baseUrl.isBlank() && !adminUsername.isBlank() && !adminPassword.isBlank();
    }

    public boolean syncUserProfile(String subject, String email, String firstName, String lastName) {
        if (!isConfigured() || subject == null || subject.isBlank()) {
            return false;
        }
        try {
            String adminToken = obtainAdminToken();
            if (adminToken == null) {
                return false;
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            if (email != null && !email.isBlank()) {
                payload.put("email", email.trim().toLowerCase());
            }
            if (firstName != null) {
                payload.put("firstName", firstName.trim());
            }
            if (lastName != null) {
                payload.put("lastName", lastName.trim());
            }
            if (payload.isEmpty()) {
                return true;
            }
            String userUrl = String.format("%s/admin/realms/%s/users/%s", baseUrl, realm, encode(subject));
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(userUrl))
                .timeout(Duration.ofSeconds(8))
                .header("Authorization", "Bearer " + adminToken)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 200 && res.statusCode() < 300) {
                return true;
            }
            log.warn("Sincronización de perfil en Keycloak devolvió HTTP {} para usuario {}", res.statusCode(), subject);
            return false;
        } catch (Exception ex) {
            log.warn("No se pudo sincronizar perfil en Keycloak para {}: {}", subject, ex.getMessage());
            return false;
        }
    }

    public void changePassword(String subject, String loginIdentifier, String currentPassword, String newPassword) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new IllegalArgumentException("Debes ingresar tu contraseña actual.");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 6 caracteres.");
        }
        if (newPassword.equals(currentPassword)) {
            throw new IllegalArgumentException("La nueva contraseña debe ser distinta a la actual.");
        }
        if (!isConfigured()) {
            throw new IllegalStateException(
                "El servicio de cambio de contraseña no está configurado en el servidor (faltan credenciales administrativas de Keycloak)."
            );
        }

        verifyCurrentPassword(loginIdentifier, currentPassword);

        String adminToken = obtainAdminToken();
        if (adminToken == null) {
            throw new IllegalStateException("No se pudo autenticar con el servidor de identidad para actualizar la contraseña.");
        }

        try {
            String resetUrl = String.format("%s/admin/realms/%s/users/%s/reset-password", baseUrl, realm, encode(subject));
            String body = objectMapper.writeValueAsString(Map.of(
                "type", "password",
                "value", newPassword,
                "temporary", false
            ));
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(resetUrl))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + adminToken)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw new IllegalStateException("No se pudo actualizar la contraseña en el servidor de identidad.");
            }
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Error de comunicación al actualizar la contraseña.", ex);
        }
    }

    private void verifyCurrentPassword(String loginIdentifier, String currentPassword) {
        if (loginIdentifier == null || loginIdentifier.isBlank()) {
            throw new IllegalArgumentException("No se pudo identificar el usuario para validar la contraseña actual.");
        }
        try {
            String tokenUrl = String.format("%s/realms/%s/protocol/openid-connect/token", baseUrl, realm);
            String form = "grant_type=password&client_id=" + encode(clientId)
                + "&username=" + encode(loginIdentifier.trim())
                + "&password=" + encode(currentPassword);
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 400 || res.statusCode() == 401) {
                throw new IllegalArgumentException("La contraseña actual es incorrecta.");
            }
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw new IllegalStateException("No se pudo verificar tu contraseña actual en el servidor de identidad.");
            }
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Error de conexión verificando la contraseña actual.", ex);
        }
    }

    private String obtainAdminToken() {
        try {
            String tokenUrl = String.format("%s/realms/master/protocol/openid-connect/token", baseUrl);
            String form = "grant_type=password&client_id=admin-cli&username=" + encode(adminUsername)
                + "&password=" + encode(adminPassword);
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 200 && res.statusCode() < 300 && res.body() != null) {
                JsonNode node = objectMapper.readTree(res.body());
                JsonNode tokenNode = node.path("access_token");
                return tokenNode.isTextual() ? tokenNode.asText() : null;
            }
            log.warn("Obtención de token admin de Keycloak devolvió HTTP {}", res.statusCode());
        } catch (Exception ex) {
            log.warn("Error obteniendo token admin de Keycloak: {}", ex.getMessage());
        }
        return null;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

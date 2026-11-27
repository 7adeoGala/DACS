package ar.edu.dacs.apexpredict.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import feign.RetryableException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@SuppressWarnings("null")
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<Map<String, Object>> handleFeign(FeignException ex) {
        int status = ex.status();
        if (status <= 0 || status >= 500 || ex instanceof RetryableException) {
            String detail = ex.getMessage();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "status", 502,
                "code", "bff_502",
                "description", "El servicio dependiente no esta disponible: " + (detail != null ? detail : "error de conexion"),
                "message", "Bad Gateway"
            ));
        }

        String downstreamDescription = extractDescription(ex);
        String code = "bff_" + status;
        String defaultDesc = switch (status) {
            case 400 -> "Solicitud invalida.";
            case 401 -> "Se requiere autenticacion para acceder a este recurso.";
            case 403 -> "No tienes permisos suficientes para realizar esta accion.";
            case 404 -> "Recurso no encontrado.";
            case 409 -> "Conflicto con el estado actual del recurso.";
            default -> "Error en el servicio dependiente.";
        };

        String description = (downstreamDescription != null && !downstreamDescription.isBlank())
            ? downstreamDescription
            : defaultDesc;

        String message = switch (status) {
            case 400 -> "Bad Request";
            case 401 -> "Unauthorized";
            case 403 -> "Forbidden";
            case 404 -> "Not Found";
            case 409 -> "Conflict";
            default -> "Error";
        };

        HttpStatus httpStatus = HttpStatus.resolve(status);
        if (httpStatus == null) {
            httpStatus = HttpStatus.BAD_GATEWAY;
            code = "bff_502";
        }

        return ResponseEntity.status(httpStatus).body(Map.of(
            "status", httpStatus.value(),
            "code", code,
            "description", description,
            "message", message
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "status", 400,
            "code", "bff_400",
            "description", "Los datos enviados en la solicitud no son validos.",
            "message", "Validation Failed"
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "status", 400,
            "code", "bff_400",
            "description", ex.getMessage() != null ? ex.getMessage() : "Parametro invalido.",
            "message", "Bad Request"
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "status", 409,
            "code", "bff_409",
            "description", ex.getMessage() != null ? ex.getMessage() : "Conflicto con el estado del servidor.",
            "message", "Conflict"
        ));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
            "status", 403,
            "code", "bff_403",
            "description", "No tienes permisos suficientes para realizar esta accion.",
            "message", "Forbidden"
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "status", 500,
            "code", "bff_500",
            "description", "Ocurrio un error interno en el BFF.",
            "message", "Internal Server Error"
        ));
    }

    private String extractDescription(FeignException ex) {
        try {
            var bodyOpt = ex.responseBody();
            if (bodyOpt.isPresent()) {
                ByteBuffer buffer = bodyOpt.get();
                byte[] bytes = new byte[buffer.remaining()];
                buffer.get(bytes);
                String body = new String(bytes, StandardCharsets.UTF_8);
                JsonNode root = mapper.readTree(body);
                if (root.has("description") && !root.get("description").isNull()) {
                    return root.get("description").asText();
                }
                if (root.has("message") && !root.get("message").isNull()) {
                    return root.get("message").asText();
                }
            }
        } catch (Exception parseEx) {
            log.debug("No se pudo parsear el cuerpo de error downstream: {}", parseEx.getMessage());
        }
        return null;
    }
}

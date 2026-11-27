package ar.edu.dacs.apexpredict.connector.web;

import ar.edu.dacs.apexpredict.connector.service.F1Service;
import feign.FeignException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@SuppressWarnings("null")
public class ConnectorExceptionHandler {

    @ExceptionHandler(F1Service.F1UnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleUnavailable(F1Service.F1UnavailableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
            "status", 502,
            "code", "conector_502",
            "description", "El proveedor de Formula 1 no esta disponible. Intenta nuevamente.",
            "message", "Bad Gateway"
        ));
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<Map<String, Object>> handleFeign(FeignException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
            "status", 502,
            "code", "conector_502",
            "description", "El proveedor de Formula 1 no esta disponible. Intenta nuevamente.",
            "message", "Bad Gateway"
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "status", 400,
            "code", "conector_400",
            "description", ex.getMessage() != null ? ex.getMessage() : "Parametro invalido.",
            "message", "Bad Request"
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "status", 500,
            "code", "conector_500",
            "description", "Error interno en el conector F1.",
            "message", "Internal Server Error"
        ));
    }
}

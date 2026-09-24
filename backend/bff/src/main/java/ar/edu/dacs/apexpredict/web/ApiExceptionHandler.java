package ar.edu.dacs.apexpredict.web;

import ar.edu.dacs.apexpredict.infrastructure.f1.JolpicaAdapter.F1UnavailableException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(F1UnavailableException.class)
    ResponseEntity<ProblemDetail> unavailable() {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_GATEWAY, "El proveedor de Formula 1 no esta disponible. Intenta nuevamente."));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalid(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, error.getMessage()));
    }
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<ProblemDetail> conflict(IllegalStateException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, error.getMessage()));
    }
}

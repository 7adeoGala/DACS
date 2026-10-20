FROM quay.io/keycloak/keycloak:26.7.4 AS builder

# Pre-compilar Quarkus en tiempo de build (aprovecha la RAM del builder de Render)
ENV KC_DB=postgres \
    KC_HTTP_RELATIVE_PATH=/auth \
    KC_HEALTH_ENABLED=true

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.7.4

COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY apexpredict-realm.json /opt/keycloak/data/import/apexpredict-realm.json
COPY theme/ /opt/keycloak/themes/

# Limitar estrictamente el uso de memoria para el límite de 512MB de Render
# - KC_CACHE=local / --cache=local: Desactiva JGroups/Infinispan distribuido (evita puertos 7800/57800 y errores de cookie HEAD)
# - Xss256k: Reduce el stack por thread de 1MB a 256KB (ahorra ~35-40MB en ~50 threads)
# - Xmx224m + MaxMetaspaceSize=128m: Máximo total JVM controlado en ~390-410MB (dentro del límite de 512MB)
# IMPORTANTE: NO añadir banderas de GC explícitas (ej: -XX:+UseSerialGC) para evitar colisión con el GC configurado por kc.sh
ENV KC_DB=postgres \
    KC_HTTP_ENABLED=true \
    KC_HTTP_HOST=0.0.0.0 \
    KC_HTTP_RELATIVE_PATH=/auth \
    KC_DB_SCHEMA=keycloak \
    KC_PROXY_HEADERS=xforwarded \
    KC_CACHE=local \
    KC_HEALTH_ENABLED=true \
    JAVA_OPTS_APPEND="-Xms96m -Xmx224m -XX:MetaspaceSize=80m -XX:MaxMetaspaceSize=128m -Xss256k"

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm", "--http-host=0.0.0.0", "--cache=local"]


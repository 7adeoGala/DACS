FROM quay.io/keycloak/keycloak:26.7.4 AS builder

# Pre-compilar Quarkus en tiempo de build (aprovecha la RAM del builder de Render)
ENV KC_DB=postgres \
    KC_HTTP_RELATIVE_PATH=/auth

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.7.4

COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY apexpredict-realm.json /opt/keycloak/data/import/apexpredict-realm.json

# Limitar el uso de memoria a < 450 MB para que no supere el límite de 512MB del tier gratis de Render
ENV KC_DB=postgres \
    KC_HTTP_ENABLED=true \
    KC_HTTP_HOST=0.0.0.0 \
    KC_HTTP_RELATIVE_PATH=/auth \
    KC_PROXY_HEADERS=xforwarded \
    JAVA_OPTS_APPEND="-Xms128m -Xmx256m -XX:MaxRAMPercentage=50 -XX:MetaspaceSize=96m -XX:MaxMetaspaceSize=160m"

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--optimized", "--import-realm", "--http-host=0.0.0.0"]

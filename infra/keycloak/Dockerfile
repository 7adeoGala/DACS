FROM quay.io/keycloak/keycloak:26.7.4

# Copiar la definición del realm de ApexPredict para importar automáticamente
COPY apexpredict-realm.json /opt/keycloak/data/import/apexpredict-realm.json

ENV KC_HTTP_ENABLED=true \
    KC_HTTP_HOST=0.0.0.0 \
    KC_HTTP_RELATIVE_PATH=/auth \
    KC_PROXY_HEADERS=xforwarded

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--import-realm", "--http-host=0.0.0.0"]

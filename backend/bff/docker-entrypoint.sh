#!/bin/sh
set -eu
# Conservar las CA publicas para Jolpica y agregar el certificado local de Keycloak.
if [ -f /certs/local.pem ]; then
  cp "$JAVA_HOME/lib/security/cacerts" /tmp/apexpredict-cacerts
  keytool -importcert -noprompt -alias dacs2026.local -file /certs/local.pem \
    -keystore /tmp/apexpredict-cacerts -storepass changeit >/dev/null
  exec java -Djavax.net.ssl.trustStore=/tmp/apexpredict-cacerts -XX:MaxRAMPercentage=75.0 -jar /app/app.jar
fi
exec java -XX:MaxRAMPercentage=75.0 -jar /app/app.jar

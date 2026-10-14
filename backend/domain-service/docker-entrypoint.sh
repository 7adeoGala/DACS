#!/bin/sh
set -eu
cp "$JAVA_HOME/lib/security/cacerts" /tmp/apexpredict-cacerts
keytool -importcert -noprompt -alias dacs2026.local -file /certs/local.pem \
  -keystore /tmp/apexpredict-cacerts -storepass changeit >/dev/null
exec java -Djavax.net.ssl.trustStore=/tmp/apexpredict-cacerts -jar /app/app.jar

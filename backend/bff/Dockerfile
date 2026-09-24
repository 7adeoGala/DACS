FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q verify

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=build /src/target/apexpredict-bff.jar /app/app.jar
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
USER 10001:10001
EXPOSE 8443
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

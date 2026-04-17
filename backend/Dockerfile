# Build stage
FROM maven:3.9-eclipse-temurin-21-jammy AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve -B
COPY src ./src
RUN mvn package -DskipTests -B

# ======================
# Dev stage (HOT RELOAD)
# ======================
FROM maven:3.9-eclipse-temurin-21-jammy AS dev
WORKDIR /app
COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
COPY src src
RUN chmod +x mvnw
RUN ./mvnw dependency:resolve
EXPOSE 8081
CMD ["./mvnw", "spring-boot:run"]

# ======================
# Production Run stage
# ======================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
# EXPOSE 5005 (Bỏ qua debug ở prod)
ENTRYPOINT ["java", "-jar", "app.jar"]

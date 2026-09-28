# Stage 1: Build the JAR with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

COPY . .

# Build from the specific module directory
RUN mvn clean package -pl search_event_consumer -am -DskipTests

# Stage 2: Create the runtime container
FROM eclipse-temurin:17-jdk
WORKDIR /app

# Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy the generated JAR
COPY --from=builder /app/search_event_consumer/target/*.jar app.jar

EXPOSE 9093

ENV AWS_LWA_PORT=9093
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]

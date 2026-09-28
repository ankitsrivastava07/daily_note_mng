# Stage 1: Build the JAR with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy all repository files
COPY . .

# Move into the subfolder containing pom.xml and build
RUN cd search_event_consumer && mvn clean package -DskipTests

# Stage 2: Create the runtime container
FROM eclipse-temurin:17-jdk
WORKDIR /app

# Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy the generated JAR from the build stage
COPY --from=builder /app/search_event_consumer/target/*.jar app.jar

EXPOSE 9093

ENV AWS_LWA_PORT=9093
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]

FROM eclipse-temurin:17-jdk

WORKDIR /app

# Copy Lambda Web Adapter from private ECR
COPY --from=446394402725.dkr.ecr.ap-south-1.amazonaws.com/lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

# Copy Spring Boot application JAR
COPY target/*.jar app.jar

EXPOSE 9091

# Lambda Web Adapter configuration
ENV AWS_LWA_PORT=9091
ENV AWS_LWA_READINESS_CHECK_PATH=/health

ENTRYPOINT ["java", "-jar", "app.jar"]
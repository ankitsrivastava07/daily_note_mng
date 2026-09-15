FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1 \
     /lambda-adapter /opt/extensions/lambda-adapter

COPY target/*.jar app.jar

ENV AWS_LWA_PORT=9091

EXPOSE 9091

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
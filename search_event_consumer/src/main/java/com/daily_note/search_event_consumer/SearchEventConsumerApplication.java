package com.daily_note.search_event_consumer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SearchEventConsumerApplication {

    public static void main(String[] args) {
        SpringApplication application =
                new SpringApplication(SearchEventConsumerApplication.class);

        application.setLazyInitialization(true);
        application.setWebApplicationType(WebApplicationType.NONE);

        application.run(args);
    }

}

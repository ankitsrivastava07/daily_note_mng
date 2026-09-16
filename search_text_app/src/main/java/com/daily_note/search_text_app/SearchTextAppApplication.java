package com.daily_note.search_text_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SearchTextAppApplication {

    public static void main(String[] args) {
        SpringApplication application =
                new SpringApplication(SearchTextAppApplication.class);

        // application.setLazyInitialization(true);

        application.run(args);
    }
}
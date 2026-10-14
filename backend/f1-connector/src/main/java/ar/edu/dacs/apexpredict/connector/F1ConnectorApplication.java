package ar.edu.dacs.apexpredict.connector;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class F1ConnectorApplication {
    public static void main(String[] args) {
        SpringApplication.run(F1ConnectorApplication.class, args);
    }
}

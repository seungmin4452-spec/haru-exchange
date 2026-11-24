package io.github.seungmin4452spec.haruexchange;

import org.springframework.boot.SpringApplication;

public class TestHaruExchangeApplication {

	public static void main(String[] args) {
		SpringApplication.from(HaruExchangeApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

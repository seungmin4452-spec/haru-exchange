package io.github.seungmin4452spec.haruexchange;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class HaruExchangeApplicationTests {

	@Test
	void contextLoads() {
	}

}

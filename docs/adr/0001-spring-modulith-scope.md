# ADR-0001: Spring Modulith는 모듈 경계 검증과 내부 이벤트 기록에만 쓴다

- 상태: 채택
- 날짜: 2026-11-25 (결정은 2026-11-24, WBS 0.2)
- 관련: WBS 0.2 ([#26](https://github.com/seungmin4452-spec/haru-exchange/pull/26)), 이슈 [#1](https://github.com/seungmin4452-spec/haru-exchange/issues/1)

## 배경

루트 애플리케이션은 주문, 잔고, 원장, 시세 같은 여러 모듈을 하나의 Spring Boot 애플리케이션에 담는 모듈러 모놀리스다. 모듈 사이의 내부 참조를 막고, 모듈 간 이벤트를 안전하게 처리할 장치가 필요했다.

프로젝트 생성 시점에는 Spring Modulith `2.2.0-M1` 마일스톤 버전과 `spring-modulith-events-kafka`가 들어 있었다. 두 가지를 정해야 했다.

1. 마일스톤 버전을 유지할지
2. Modulith의 기능 중 어디까지 쓸지, 특히 Kafka 외부 발행을 맡길지

Kafka 발행에는 강한 제약이 있다. 매칭 엔진은 종목별로 명령을 순서대로 적용해야 결과가 결정된다. 따라서 `order.commands` 토픽은 종목을 키로 하고, 같은 종목의 명령은 `(symbol, seq)` 순서대로 발행되어야 한다. 장애 후 재발행할 때도 이 순서가 깨지면 안 된다.

## 결정

- Spring Modulith **`2.2.0` GA**를 쓴다. (2026-11-19 GA, Spring Boot 4.2.0 기준 빌드)
- 다음 기능만 쓴다.
  - 모듈 경계 검증과 문서화: `starter-core`, `starter-test`, `starter-insight`, `runtime`, `events-api`
  - 모듈 내부 이벤트 발행 기록: `starter-jpa` (`event_publication` 테이블)
- **`spring-modulith-events-kafka`는 쓰지 않는다.** `order.commands` 발행은 `(symbol, seq)` 순서를 보장하는 직접 구현 Outbox와 릴레이가 맡는다.

## 검토한 대안

### 대안 1: `2.2.0-M1` 마일스톤 유지

- 장점: 변경이 없다.
- 단점: 마일스톤은 GA 전에 API가 바뀔 수 있고, 버그 수정이 GA 쪽에만 들어간다.
- 포기한 이유: GA가 이미 나왔으므로 마일스톤에 머물 이유가 없다.

### 대안 2: `events-kafka`로 Kafka 외부 발행까지 맡기기

- 장점: `@Externalized` 이벤트를 선언하는 것만으로 Kafka 발행과 실패 시 재발행을 얻는다. 직접 짤 코드가 줄어든다.
- 단점: 재발행은 at-least-once로 미완료 이벤트를 다시 보내는 방식이라, 같은 종목의 명령이 원래 순서대로 다시 나간다는 보장이 없다. 앞 명령이 실패해 재발행을 기다리는 동안 뒤 명령이 먼저 발행될 수 있다.
- 포기한 이유: 종목별 순서는 엔진 결정성과 복구 후 호가창 해시 일치(3단계 게이트)의 전제다. 이 보장을 프레임워크 동작에 기대지 않고, 종목별 `seq`를 직접 관리하는 Outbox에서 확인할 수 있게 한다. Outbox 직접 구현은 완성 후 AI 없이 다시 구현해 볼 핵심 대상이기도 하다.

### 대안 3: Spring Modulith를 쓰지 않기

- 장점: 의존성이 줄고, 패키지 규칙은 ArchUnit으로도 검사할 수 있다.
- 단점: 모듈 경계 검증, 모듈 문서 생성, 트랜잭션과 묶인 이벤트 발행 기록을 직접 만들어야 한다.
- 포기한 이유: 모듈 내부 이벤트에서는 Modulith가 주는 기능이 비용보다 크다. 문제가 되는 것은 Kafka 외부 발행뿐이므로 그 부분만 뺀다.

## 결과

- 좋아지는 점
  - 모듈 사이 내부 참조를 `ApplicationModules.verify()` 테스트로 막을 수 있다.
  - Kafka 발행 순서 보장이 직접 구현한 코드 안에 있으므로 테스트와 장애 실험으로 확인할 수 있다.
- 감수하는 점
  - Outbox 테이블, 릴레이, 재시도, 순서 보장을 직접 구현하고 테스트해야 한다. (3단계, WBS 3.4 ADR에서 상세 결정)
  - 모듈 내부 이벤트(Modulith)와 외부 명령(직접 Outbox) 두 가지 발행 경로가 생긴다. 어떤 이벤트가 어느 경로를 쓰는지 구분해야 한다.
- 후속 작업
  - `event_publication` 테이블 Flyway 마이그레이션은 2단계 스키마 작업 때 추가한다. ([`docs/후속 작업.md`](../후속%20작업.md))

## 검증

- `runtimeClasspath`의 Modulith 의존성이 모두 `2.2.0`으로 해석되고 `events-kafka`가 없다. (#26에서 확인)
- 3단계 게이트: 체결 중 강제 종료 후 호가창 해시 일치, 중복 반영 0건. Outbox 순서 보장이 깨지면 이 실험에서 드러난다.
- 다시 검토할 조건: Modulith의 Kafka 외부 발행이 키별 순서 보장을 지원하게 되면 대안 2를 다시 비교한다.

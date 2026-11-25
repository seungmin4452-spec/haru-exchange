# CLAUDE.md

하루거래소(Haru Exchange): 가상 종목 8개를 거래하는 모의 증권 거래소 Spring 백엔드 포트폴리오 프로젝트.
설계와 일정은 아래 문서가 기준이다. 작업 전에 관련 부분을 확인한다.

- `docs/모의 증권 거래소 기획서.md`: 아키텍처, 불변식, Kafka 토픽, 장애 실험 기준
- `docs/WBS.md`: 단계별 작업 번호(예: 0.1, 1.3)와 GitHub 이슈 연결
- `docs/후속 작업.md`: 미뤄 둔 작업과 참고 사항. 처리 시점이 된 항목이 있는지 작업 전에 확인한다.
- `docs/상장 종목.md`: 가상 하루 그룹 계열사 8개의 종목 코드, 이름, 업종. 종목을 다루는 코드와 데이터는 이 표를 따른다.
- `docs/adr/`: 설계 결정과 포기한 대안. 새 ADR은 `0000-template.md`를 복사하고 `README.md` 목록에 추가한다. 채택된 ADR은 고치지 않고 새 ADR로 대체한다.

## 모듈 구조

- 루트 프로젝트: Spring Boot 애플리케이션 (API, 원장, Kafka, 시세 등)
- `matching-engine/`: 매칭 엔진. **Spring을 포함해 어떤 프레임워크에도 의존하지 않는 순수 Java 모듈이다.**
  - 패키지: `io.github.seungmin4452spec.haruexchange.engine`
  - 시스템 시계, 난수 같은 외부 상태 없이 입력 명령만으로 결과가 결정되어야 한다.
  - `./gradlew :matching-engine:check`의 `verifyNoSpring` 태스크가 Spring 의존 유입을 막는다.
  - 속성 기반 테스트는 jqwik(`@Property`), 마이크로벤치마크는 JMH로 `src/jmh/java`에 작성한다.
- 영속성 조회: QueryDSL(OpenFeign 포크 `io.github.openfeign.querydsl`). Q클래스는 `build/generated/sources/annotationProcessor`에 생성된다.

## Git 작업 규칙

- `main`에 직접 커밋하지 않는다. 모든 작업은 최신 `main`에서 브랜치를 만들어 진행한다.
- 브랜치 이름: `<type>/<WBS번호>-<요약>` (예: `chore/0.1-docker-compose`). WBS 작업이 아니면 번호를 생략한다 (예: `docs/claude-md`).
- 커밋 메시지는 Conventional Commits 형식(`feat`, `fix`, `chore`, `docs`, `test`, `refactor`)이고 본문은 한국어로 쓴다. WBS 작업이면 본문에 `Refs #<이슈> (WBS <번호>)`를 적는다.
- 작업이 끝나면 브랜치를 푸시하고 `main` 대상 PR을 올린다. PR 본문에는 개요, 변경 사항, 검증 결과를 적는다.
- 작업과 무관한 변경 파일은 커밋에 넣지 않는다. 작업 트리에 다른 변경이 있으면 건드리지 말고 알린다.
- **참고 사항과 미룬 작업은 반드시 `docs/후속 작업.md`에 기록한다.** PR 본문의 "참고", "주의", "후속 작업", "나중에"에 쓴 내용은 모두 해당한다. 같은 PR에서 문서에 항목(처리 시점, 출처 PR, 이유, 처리 방법)을 추가하고, PR 본문에는 문서에 추가했다고 적는다. PR 본문에만 남기지 않는다.
- 후속 작업을 처리하면 같은 PR에서 해당 항목을 `docs/후속 작업.md`에서 지운다.

## 빌드와 실행

- JDK 25가 필요하다. 시스템 기본 Java가 낮으면 `JAVA_HOME`을 JDK 25로 지정해서 실행한다.
- 테스트: `./gradlew test` (Testcontainers를 쓰므로 Docker가 실행 중이어야 한다)
- CI: `.github/workflows/backend.yml`이 PR과 `main` 푸시에서 `./gradlew build`를 실행한다 (프론트엔드·문서만 바뀌면 생략). 프론트엔드는 `frontend.yml`이 따로 검사한다.
- 벤치마크: `./gradlew :matching-engine:jmh`는 기본 설정이 수 분 이상 걸린다. 빠르게 확인할 때는 `./gradlew :matching-engine:jmhJar` 후 `java -jar matching-engine/build/libs/*-jmh.jar <벤치마크> -f 1 -wi 1 -i 1`로 실행한다.
- 로컬 인프라: `docker compose up -d --wait` / `docker compose down`
  - PostgreSQL, Redis, Kafka(KRaft 단일 노드, `localhost:9092` 고정)
  - 이미지는 버전을 고정한다. `compose.yaml`과 `TestcontainersConfiguration`의 이미지 버전을 항상 같게 맞춘다.
  - Kafka 토픽 자동 생성은 꺼져 있다. 토픽은 파티션 수를 명시해 직접 만든다.

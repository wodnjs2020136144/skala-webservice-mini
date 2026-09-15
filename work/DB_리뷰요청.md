# 리뷰 요청 v2 — DBML 전체 (11 엔티티 · 7 Enum) · 10라운드 지적 반영본

> ⚠️ **[09-16 이후 이름 변경 — 본문은 리뷰 요청 당시 그대로 둔다]**
> 대기 중인 리뷰 5건을 **이 본문과 대조**해야 하므로 본문을 고치지 않았다. 현행과의 대응:
>
> | 이 문서의 표기 | 현행 (`work/DB_sketch.dbml`) |
> |---|---|
> | `care_assignment` · `from/to_care_assignment_id` | `handover_assignment` · `from/to_handover_assignment_id` |
> | `CareStatus` · `CARE_TRANSFERRED` | `HandoverAssignmentStatus` · `HANDOVER_OWNER_TRANSFERRED` |
> | `role_handover_template_item.role_type_id` **[미확정]** | `handover_template_item.ward_id` — **Q3 09-16 해소 (역할 무관 `[C]`)** |
> | 11 엔티티 · 읽기 2단 | **12 엔티티**(`team` 추가) · **읽기 3단** |
>
> 판정 `docs/04` 15라운드

- 파일: `work/DB_sketch.dbml` (**513줄**, v1 요청 시점 388줄 대비 +125줄) · `assets/erd_full.png`
- 같이 봐야 하는 것: **`docs/02_작업-템플릿.md` T5-b·T6** ← **이번 라운드의 교훈이 이것이다** (§0-2)
- 앞선 리뷰 이력: `docs/04_리뷰반영-이력.md` (**10라운드 · 51건**)

> **이번 요청의 목적**: 10라운드 지적 5건 중 **4건을 반영했고 1건을 인터뷰로 넘겼다.**
> 반영 과정에서 **리뷰 권장안을 두 군데 좁혔다.** 그 두 곳이 이번 리뷰의 핵심이다. → §4

---

## 0-1. 지적 → 처리 대조표

| # | 지적 | 처리 | 반영 위치 |
|---|---|---|---|
| 1 | [차단] 권한 판정 데이터 없음 | **반영** — `users.user_type` + `Enum UserType` | `DB_sketch.dbml` `users` |
| 2 | [차단] 전달 후 수신자 결원 | **반영(범위 축소)** — `SUPERSEDED` + 자기참조 FK | `handover` · `T5-b` |
| 3 | [중요] 템플릿이 누구 역할 기준인가 | **미확정 → 인터뷰 Q3** (오늘 밤 22시) | `05` §1-6 |
| 4 | [중요] `change_reason` vs 완료 확인 API | **반영(a 복사 · b 화면으로 이관)** | `reassignment_log` · `T6` 서버계산 ④ |
| 5 | [중요] 조회 인덱스 누락 | **반영** — `(to_shift_assignment_id, change_type)` | `reassignment_log` |
| + | 스냅샷 불변 규칙 미기재 | **반영** — `[스냅샷 불변 규칙 3]` 신설 | `handover_item` |

## 0-2. 이번 라운드에서 드러난 실패 패턴 — 같이 봐주면 좋겠다

지적 5건 중 **3건이 같은 원인**이었다.

- **1번** — 읽기 2단 권한은 `T3` 에 **있었다.** DBML 에 없어서 안 보였다
- **4번** — `change_reason NOT NULL` 은 DBML 에, *"body 없음"* 은 `T6` 에. **둘을 나란히 놓은 적이 없었다**
- **+** — 불변 규칙을 `reassignment_log` 에만 쓰고 인계 계열에는 같은 일을 하지 않았다

앞선 9라운드의 실패 패턴은 **사실 오류·추론 과잉**이었다. 이번은 다르다.
**한 규칙이 여러 파일에 흩어지고, 고칠 때 한 곳만 고친다.**

세운 규칙: **규칙마다 단일 출처를 정하고 다른 쪽엔 포인터만 둔다.**
데이터 구조 제약 → **DBML note 가 출처** / API 동작·상태 코드 → **`T6` 가 출처.** 복사본은 두지 않는다.

> 그래서 이번 요청에는 **`docs/02` T5-b·T6 를 같이 낸다.** 4번이 잡힌 게 정확히 둘을 나란히 놨기 때문이다.

---

## 1. 구조

```
ward ──< users (user_type: HEAD_NURSE / NURSE)   ← 신규: 권한 판정의 출처
     ──< role_type ──< role_handover_template_item        (1:N — F-06 템플릿 정의)
     ──< shift_assignment ──< care_assignment >── inpatient_stay
     ──< inpatient_stay                │
                                       ├──< handover(from/to) ──< handover_item
                                       │         └─ superseded_by (자기참조)  ← 신규
                                       │         └── handover_receipt (1:1)
                          reassignment_log(from/to shift · from/to care)
```

**Enum 7개**: `UserType`(신규) `ShiftCode` `ShiftStatus` `CareStatus` `StayStatus` `HandoverStatus`(+`SUPERSEDED`) `ChangeType`

| # | 테이블 | 역할 | 이번 변경 |
|---|---|---|---|
| 1 | `ward` | 병동 | |
| 2 | `users` | 간호사 / 수간호사 | **`user_type` 추가** |
| 3 | `role_type` | 차지·액팅 등 — 수간호사가 정의하므로 Enum 아님 | |
| 4 | `shift_assignment` | 근무 배정 (+`status`, `covered_at`) | |
| 5 | `inpatient_stay` | 입원 건 — 환자 마스터 미보유, `patient_ref_code` 외부 참조 | |
| 6 | **`care_assignment`** | **유일한 M:N 해소**, append-only | |
| 7 | `role_handover_template_item` | 역할별 인계 항목 정의 (1:N) | **기준 역할 [미확정]** |
| 8 | **`handover`** | `from/to` + `status` 4종 | **`SUPERSEDED` · `superseded_at` · `superseded_by_handover_id`** |
| 9 | `handover_item` | 템플릿의 **스냅샷** | **불변 규칙 3 신설** |
| 10 | `handover_receipt` | `receiver_summary` — ack 가 아니라 read-back (1:1) | |
| 11 | `reassignment_log` | `change_type` 으로 shift/care 두 층위 기록 | **인덱스 +1 · 사유 복사 규칙** |

---

## 2. 이번에 새로 내린 판단 4가지

### 2-1. 권한은 `user_type` + `users.ward_id` 로만 판정한다 (지적 1)

```
"해당 병동 수간호사" = users.user_type = HEAD_NURSE AND users.ward_id = 대상 자원의 ward_id
```

- **`role_type` 으로 판정하지 않는다.** 그건 근무조 안의 역할(차지/액팅)이라 **근무가 없는 날엔 행이 없다.**
  수간호사는 근무표에 안 올라온 날에도 배정을 바꾼다. → `user_type` = 직책, `role_type` = 근무 중 역할. **층위가 다르다**
- **`shift_assignment.ward_id` 가 아니라 `users.ward_id`.** 권한은 소속 기준이다.
  타 병동 지원 근무를 나가도 그 병동 배정을 바꿀 권한은 없다
- 외부 로그인 시스템은 **인증**만. **인가는 이 컬럼이 출처**
- **전제**: 병동당 `HEAD_NURSE` 1명. 깨지면 컬럼 추가가 아니라 `(user_id, ward_id, user_type)` 별도 테이블
- **읽기는 여기서 판정하지 않는다** — 2단(① 병동 범위 ② `care_assignment` 범위), API 계층

### 2-2. `SUPERSEDED` — 단, `CONFIRMED` 는 제외한다 (지적 2 · **권장안 축소**)

기존 행을 고치지 않고 보존, 새 수신자에게 후속 인계 발행. **여기까지는 권장안 그대로.**

| 원래 상태 | 전환 | 이유 |
|---|---|---|
| `DRAFT` | ○ | 작성자가 이미 쓴 내용을 새 수신자가 받아야 한다 |
| `SENT` | ○ | 지적된 그 케이스 |
| `CONFIRMED` | **× `409`** | **이미 닫힌 고리다** |

**`CONFIRMED` 를 제외한 이유** — 받은 사람이 확인까지 했으면 그 인계는 완결이다.
그 이후의 담당 변경은 **인계 실패가 아니라 정상 교대**이고, `CARE_TRANSFERRED` 로 남은 뒤 **새 인계가 새로 작성**된다.
구분하지 않으면 *"확인까지 끝난 인계가 다시 미확인으로 돌아오는"* 결과가 된다.

같이 정한 것:

- 후속 인계는 **같은 트랜잭션**에서 생성, `superseded_by_handover_id` 가 비면 **`422`** (인계가 끊긴 채 종결되는 것 방지)
- 후속의 `status` 는 **원본 승계**(`DRAFT→DRAFT`, `SENT→SENT`). 대체는 작성 진행도를 되돌리는 사건이 아니다
- 후속의 `from_care_assignment_id` 는 **원본과 같다**
- 원본의 `handover_receipt` 행은 **지우지 않는다**(원래 수신자가 언제 열어봤는지도 기록). `confirmed_at` 은 `NULL` 로 남음 → **1:1 유지**
- **미확인 건수 집계식(`status = SENT`)은 안 바꾼다** — `SUPERSEDED` 가 자동으로 빠진다

**자기참조 FK 를 넣은 이유 (채택하지 않은 대안)** — 컬럼 없이도 2-hop 으로 후속을 찾을 수는 있다
(`to_care` → `CARE_TRANSFERRED.from_care` → `to_care` → 그 care 를 to 로 가진 handover).
조인 2번이고, 무엇보다 **"SUPERSEDED 인데 후속이 없다"를 제약으로 표현할 수 없다.**

### 2-3. `change_reason` 은 요청에서 받지 않고 복사한다 (지적 4-a)

사람이 사유를 쓰는 지점은 **`ABSENCE_REGISTERED` 하나뿐**이다.

| change_type | 사유 |
|---|---|
| `ABSENCE_REGISTERED` | **화면 입력 (필수)** |
| `SUBSTITUTE_ASSIGNED` · `CARE_TRANSFERRED` · `COVER_CONFIRMED` | 같은 `from_shift_assignment_id` 의 결원 사유 **복사**. 원본 없으면 `422` |

- `COVER_CONFIRMED` 는 *"이 결원이 메워졌다"* 는 기록이지 **새로운 사건이 아니다**
- 두 로그의 사유가 달라지면 **한 결원 건의 이력을 이어서 읽을 수 없다**
- → **그래서 F-05 API 는 `body` 가 없다.** `T6` 의 **서버 계산 ④** 로 명세에 박았다

### 2-4. 잔여 담당은 API 가 아니라 화면이 막는다 (지적 4-b · **대응 위치 변경**)

지적대로 가드가 대체 **근무**만 보므로 결원자에게 `ACTIVE` 담당이 남아도 완료 확인이 통과한다.
**그래도 API 로는 막지 않는다** — 담당이 의도적으로 안 넘어가는 경우(그 사이 퇴원 등)가 **정상**이기 때문이다.

대신 `6_reassign_manager` 가 **"이 사람 이름으로 남은 담당 N건"** 을 보여주고 사람이 판단한다.
`covered_at` 을 *"사람의 확인 기록"* 으로 정의한 이상, **확인할 근거를 화면이 줘야 그 뜻이 성립한다.**

> 이건 기존 원칙 *"DB 제약으로 표현 불가한 규칙은 API 계층"* 의 연장이자, **그 바깥 한 칸(사람의 판단)** 을 명시한 것이다.

---

## 3. 스냅샷 불변 규칙 3 (신설)

`handover_item` 에 추가. `reassignment_log` 의 불변 규칙 8개에 대응하는 인계 계열 블록이 **없었다.**

1. 템플릿을 고쳐도 **이미 생성된 `handover_item` 은 안 바뀐다. `DRAFT` 도 예외 아님.** 복사는 `handover` 생성 시 1회
2. `SENT` 이후 `label · content · is_required` 수정 불가 → `409`
3. `CONFIRMED` 이후 `receiver_summary` 수정 불가 → `409`

> `care_assignment` 의 append-only 는 인계의 **당사자**를, 이 셋은 인계의 **내용**을 고정한다.
> 둘 다 있어야 "과거 인계는 불변" 이 실제로 성립한다.

---

## 4. ★ 이번 리뷰에서 특히 봐줬으면 하는 것

**권장안을 좁힌 두 곳이 먼저다.**

1. **`CONFIRMED → SUPERSEDED` 를 금지한 것이 맞는가** (§2-2)
   - 확인까지 끝난 인계를 "대체됨"으로 만들지 않는다는 판단이다.
   - **반증 시나리오**: 확인 직후 5분 만에 수신자가 결원되면? 새 인계를 처음부터 쓰는 게 과한가?
2. **잔여 담당을 API 가 아니라 화면에 맡긴 것이 맞는가** (§2-4)
   - "의도적으로 안 넘긴다"가 정말 정상 케이스인지, 아니면 **경고 + 강제 확인 파라미터**(`?acknowledge_pending=true`)가 나은지

그다음:

3. **`user_type` 을 `users` 컬럼으로 둔 것** — 병동당 수간호사 1명 전제가 이번 범위에서 지나친 단순화인가
4. **후속 인계의 `status` 승계** — `SENT → SENT` 로 만들면 새 수신자에게 **읽지도 않은 인계가 이미 도착한 상태**로 뜬다. 이게 맞나
5. **자기참조 FK 가 ERD 를 읽기 어렵게 만드는가** — 발표 캡처에 `handover` 에 고리가 하나 생긴다
6. **인덱스가 `T6` 조회 패턴을 덮는가** — `/me/shifts`(양방향), 내가 받을 인계, 결원 건별 이력, 사유 복사 원본 조회
7. **화면 데이터가 전부 모델에 있는가** — `T5` 화면 11개 대조. 특히 `2_dashboard_manager` 의 "역할별 배정 인원", "미확인 인계 건수"

---

## 5. 미확정 — 오늘 밤 22시 인터뷰로 닫는다

| # | 질문 | 걸려 있는 것 |
|---|---|---|
| Q1 | 역할이 전날 정해지나 | `03` §8 분기 A/B · `8_myshift_nurse` 상단 |
| Q2-b | 확인 기록이 남나 | **`handover_receipt` 의 존재 이유** · F-04 차별점 |
| **Q3** | 인계 항목이 **누구 역할** 기준인가 | **`role_handover_template_item.role_type_id` 의 방향** (지적 3) |

**Q3 이 `SUPERSEDED` 와 맞물린다.** 후속 인계의 항목을 원본에서 복사한다는 것까지는 정했는데,
템플릿이 **수신자 역할 기준**으로 판명되면 새 수신자의 역할에 맞는 항목이 원본과 달라질 수 있다.
그 보정 규칙은 **Q3 답을 받은 뒤** 확정한다. → `handover` note 5번에 `[미확정]` 으로 표기해 뒀다.

---

## 6. 제약 (변동 없음)

- 3일 설계 과제. **실제 개발 없음.** 평가: 데이터 모델 20 / API 20
- **AI 기능 없음·규모 작음은 감점 아님.** 핵심은 `문제 → Actor → 기능 → UI → API → DB` 정합성
- 엔티티 11개는 `[전략] 6~9개` 기준의 **의도적 예외** (절삭하면 핵심 기능이 죽음)
- 실제 환자정보 미사용 — **가상 입원 건만**

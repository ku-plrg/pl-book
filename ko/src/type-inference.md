# 타입 추론

지금까지 본 타입 있는 언어에서는 프로그래머가 함수의 매개변수마다 타입을 직접 적어 주어야 했습니다. `TFAE`에서는 `(x: Number) => x + 1`처럼 쓰고, `TRFAE`에서는 재귀 함수의 반환 타입까지 `def sum(x: Number): Number = ...`처럼 적었습니다. 그런데 `x + 1`이라는 몸통만 보아도 `x`가 수라는 사실은 뻔히 보이지 않나요? 사람이 보고 알 수 있다면 컴퓨터도 알아낼 수 있지 않을까요?

이 장에서는 바로 그 일, 즉 **타입 추론**(type inference)을 배웁니다. 먼저 세 가지 예제(`sum`, `app`, `id`)를 손으로 따라가며 타입 추론이 어떤 식으로 동작하는지 감을 잡고, 이어서 `TRFAE`에 타입 추론을 더한 언어 `TIFAE`의 타입 규칙과 타입 검사기를 차근차근 정의합니다. 그 과정에서 타입 추론의 심장이라 할 수 있는 <a id="g-unification"></a>**타입 단일화**(type unification)와, 타입 표기 없이도 매개변수 다형성을 누리게 해 주는 <a id="g-let-polymorphism"></a>**let-다형성**(let-polymorphism)을 만나게 됩니다. OCaml, Haskell, Scala, Rust 같은 언어에서 타입을 일일이 적지 않아도 되는 이유가 바로 여기에 있습니다.

## 타입 추론이란

앞의 두 장에서 우리는 **다형성**(polymorphism), 즉 하나의 대상을 여러 타입으로 쓰는 방법을 배웠습니다. 다형성에는 [매개변수 다형성](./parametric-polymorphism.md)(parametric polymorphism), [서브타입 다형성](./subtype-polymorphism.md)(subtype polymorphism), 임시 다형성(ad-hoc polymorphism) 등 여러 종류가 있었고, `TFAE`에 매개변수 다형성을 더한 `PTFAE`와 서브타입 다형성을 더한 `STFAE`를 정의했습니다. 이 언어들은 모두 프로그래머가 타입을 꼼꼼히 적어 준다는 전제 위에 서 있었습니다. 이번에는 그 전제를 걷어 내 봅시다.

> **정의 (타입 추론)** 타입 추론은 식의 타입을 자동으로 알아내는 과정입니다.

**타입 추론 알고리즘**의 목표는 프로그래머가 준 명시적인 **타입 표기**(type annotation) 없이 식의 타입을 알아내는 것입니다. 다음 `RFAE` 식을 생각해 봅시다.

```rfae
/* RFAE */
def sum(x) = if (x < 1) 0 else x + sum(x + -1);
sum
```

타입 표기가 하나도 없습니다. 그래도 우리는 `sum`의 타입이 `Number => Number`라는 것을 압니다. 어떻게 알았을까요? 머릿속에서 일어난 일을 천천히 풀어 쓰면 대략 이렇습니다.

1. 아직 모르는 타입을 나타내는 **타입 변수**(type variable)를 도입합니다. "`x`의 타입을 일단 `T1`이라 부르자."
2. 식을 살펴보며 타입들이 만족해야 할 <a id="g-type-constraint"></a>**타입 제약**(type constraint)을 모읍니다. "`x < 1`이 있으니 `T1`은 `Number`여야 한다."
3. 모은 제약을 모두 만족하는 <a id="g-solution"></a>**해**(solution), 즉 타입 변수를 타입으로 바꾸는 치환(substitution)을 찾습니다. "`T1`은 `Number`이다."

이 세 단계가 타입 추론의 전부라고 해도 과언이 아닙니다. 이제 예제를 하나씩 따라가 보겠습니다.

## 예제 1: `sum`

`sum` 식을 구문 트리로 그리면 다음과 같습니다. `@`는 함수 적용을 뜻합니다.

```text
def
├─ sum(x)
├─ if
│  ├─ <
│  │  ├─ x
│  │  └─ 1
│  ├─ 0
│  └─ +
│     ├─ x
│     └─ @
│        ├─ sum
│        └─ +
│           ├─ x
│           └─ -1
└─ sum
```

처음에는 `x`의 타입도 `sum`의 타입도 모릅니다. 그래서 타입 변수를 두 개 만듭니다. 매개변수 `x`의 타입을 `T1`, `sum`의 반환 타입을 `T2`라고 하면 `sum`의 타입은 `T1 => T2`가 됩니다. 이제 두 가지 표를 들고 트리를 왼쪽부터, 아래에서 위로 훑어 갑니다.

- **타입 환경**(type environment): 변수마다 타입을 기록합니다. 몸통을 검사하는 동안에는 `x: T1`, `sum: T1 => T2`입니다.
- **해**: 타입 변수마다 지금까지 알아낸 타입을 기록합니다. 아직 모르면 `-`로 둡니다.

| 단계 | 살펴보는 부분식 | 타입 | 새로 얻은 제약 | `T1` | `T2` |
|---|---|---|---|---|---|
| 0 | (시작) | | | `-` | `-` |
| 1 | `x` | `T1` | | `-` | `-` |
| 2 | `1` | `Number` | | `-` | `-` |
| 3 | `x < 1` | `Boolean` | `T1 == Number` | `Number` | `-` |
| 4 | `0` | `Number` | | `Number` | `-` |
| 5 | `x` | `T1` | | `Number` | `-` |
| 6 | `sum` | `T1 => T2` | | `Number` | `-` |
| 7 | `x`, `-1` | `T1`, `Number` | | `Number` | `-` |
| 8 | `x + -1` | `Number` | `T1 == Number` (이미 앎) | `Number` | `-` |
| 9 | `sum(x + -1)` | `T2` | `T1 == Number` (이미 앎) | `Number` | `-` |
| 10 | `x + sum(x + -1)` | `Number` | `T1 == Number`, `T2 == Number` | `Number` | `Number` |
| 11 | `if (x < 1) 0 else ...` | `Number` | | `Number` | `Number` |
| 12 | `sum` (마지막 줄) | `T1 => T2` | | `Number` | `Number` |

몇 단계를 자세히 살펴봅시다.

- **3단계**: `<`의 피연산자는 `Number`여야 합니다. 왼쪽 피연산자 `x`의 타입이 `T1`이므로 제약 `T1 == Number`를 얻고, 해에 `T1`이 `Number`라고 적습니다. 비교 결과는 `Boolean`입니다.
- **8단계**: `+`의 피연산자도 `Number`여야 하므로 다시 `T1 == Number`를 얻습니다. 하지만 이미 아는 사실이라 새로운 정보는 아닙니다.
- **9단계**: 함수를 적용할 때는 **인자 타입이 매개변수 타입과 같아야** 합니다. 인자 `x + -1`의 타입은 `Number`이고 매개변수 타입은 `T1`이므로 또 `T1 == Number`입니다. 적용 결과의 타입은 `sum`의 반환 타입 `T2`입니다.
- **10단계**: 바깥쪽 `+`의 두 피연산자 `x`와 `sum(x + -1)`의 타입은 각각 `T1`과 `T2`입니다. 둘 다 `Number`여야 하므로 `T1 == Number`와 `T2 == Number`를 얻습니다. 이번에는 두 번째 제약이 새 정보입니다.
- **11단계**: 조건식의 조건은 `Boolean`, 두 갈래는 모두 `Number`이므로 `if` 식 전체는 `Number`입니다. 이것이 `sum`의 몸통이므로 반환 타입 `T2`와 같아야 하는데, 이미 `T2`가 `Number`이니 문제없습니다.
- **12단계**: `def` 아래의 마지막 식 `sum`을 검사할 때는 타입 환경에 `sum: T1 => T2`만 남습니다(`x`는 몸통 안에서만 보입니다). 그 타입은 `T1 => T2`이고, 해를 이용해 타입 변수를 채우면 `Number => Number`가 됩니다.

각 부분식에 알아낸 타입을 붙인 트리는 다음과 같습니다.

```text
def                                  타입 환경: x: T1, sum: T1 => T2
├─ sum(x)                            해: T1 = Number, T2 = Number
├─ if : Number
│  ├─ < : Boolean
│  │  ├─ x : T1
│  │  └─ 1 : Number
│  ├─ 0 : Number
│  └─ + : Number
│     ├─ x : T1
│     └─ @ : T2
│        ├─ sum : T1 => T2
│        └─ + : Number
│           ├─ x : T1
│           └─ -1 : Number
└─ sum : T1 => T2
```

결국 타입 추론은 프로그래머 대신 다음 `TRFAE` 프로그램의 타입 표기를 채워 넣은 셈입니다.

```trfae
/* TRFAE */
def sum(x: Number): Number = if (x < 1) 0 else x + sum(x + -1);
sum
```

## 예제 2: `app`

이번에는 고차 함수가 들어간 `FAE` 식입니다.

```fae
/* FAE */
val app = n => f => f(n);
app(42)(x => x)
```

`app`은 값 `n`을 받고, 함수 `f`를 받아서 `f(n)`을 돌려줍니다. 구문 트리는 다음과 같습니다(`λ`는 함수 정의입니다).

```text
val
├─ λ
│  ├─ n
│  └─ λ
│     ├─ f
│     └─ @
│        ├─ f
│        └─ n
├─ app
└─ @
   ├─ @
   │  ├─ app
   │  └─ 42
   └─ λ
      ├─ x
      └─ x
```

이번에는 처음부터 타입 변수를 다 만들어 두지 않고, 필요할 때마다 **새 타입 변수**를 하나씩 만듭니다. 함수 정의를 만나면 매개변수를 위한 타입 변수를 만들고, 반환 타입을 모르는 함수를 적용할 때도 결과를 위한 타입 변수를 만듭니다. 타입 환경은 다음과 같이 바뀝니다. 1단계에서 `n: T1`, 2단계에서 `f: T2`가 들어가고, 함수 정의를 빠져나오는 6, 7단계에서 차례로 `f`와 `n`이 빠집니다. 8단계에서 `app: T1 => T2 => T3`가 들어가고, 12단계에서 `x: T4`가 들어갔다가 14단계에서 빠집니다.

| 단계 | 살펴보는 부분식 | 타입 | 새 변수, 제약 | `T1` | `T2` | `T3` | `T4` |
|---|---|---|---|---|---|---|---|
| 1 | 매개변수 `n` | `T1` | 새 변수 `T1` | `-` | | | |
| 2 | 매개변수 `f` | `T2` | 새 변수 `T2` | `-` | `-` | | |
| 3 | `f` | `T2` | | `-` | `-` | | |
| 4 | `n` | `T1` | | `-` | `-` | | |
| 5 | `f(n)` | `T3` | 새 변수 `T3`, `T2 == T1 => T3` | `-` | `T1 => T3` | `-` | |
| 6 | `f => f(n)` | `T2 => T3` | | `-` | `T1 => T3` | `-` | |
| 7 | `n => f => f(n)` | `T1 => T2 => T3` | | `-` | `T1 => T3` | `-` | |
| 8 | `app` 정의 | | | `-` | `T1 => T3` | `-` | |
| 9 | `app` | `T1 => T2 => T3` | | `-` | `T1 => T3` | `-` | |
| 10 | `42` | `Number` | | `-` | `T1 => T3` | `-` | |
| 11 | `app(42)` | `T2 => T3` | `T1 == Number` | `Number` | `T1 => T3` | `-` | |
| 12 | 매개변수 `x` | `T4` | 새 변수 `T4` | `Number` | `T1 => T3` | `-` | `-` |
| 13 | `x` | `T4` | | `Number` | `T1 => T3` | `-` | `-` |
| 14 | `x => x` | `T4 => T4` | | `Number` | `T1 => T3` | `-` | `-` |
| 15 | `app(42)(x => x)` | `T3` | `T2 == T4 => T4` | `Number` | `T1 => T3` | `Number` | `Number` |

중요한 단계는 5, 11, 15단계입니다.

- **5단계**: `f`를 `n`에 적용하고 있으니 `f`는 함수여야 하고, 그 매개변수 타입은 `n`의 타입 `T1`과 같아야 합니다. 즉 `f`의 타입 `T2`는 `T1 => ???` 꼴이어야 합니다. `???`(`f`의 반환 타입)을 위해 새 타입 변수 `T3`를 만들면 제약 `T2 == T1 => T3`를 얻고, `f(n)`의 타입은 `T3`가 됩니다.
- **11단계**: `app`의 매개변수 타입 `T1`은 인자 타입 `Number`와 같아야 하므로 `T1 == Number`입니다. 결과 타입은 `app`의 타입에서 첫 화살표를 떼어 낸 `T2 => T3`입니다.
- **15단계**: `app(42)`의 매개변수 타입 `T2`는 인자 `x => x`의 타입 `T4 => T4`와 같아야 합니다. 그런데 해를 보면 `T2`는 이미 `T1 => T3`입니다. 따라서 `T1 => T3 == T4 => T4`가 성립해야 하고, 화살표의 양쪽을 맞추면 `T1 == T4`와 `T3 == T4`를 얻습니다. `T1`은 `Number`이므로 `T4 == Number`, 이어서 `T3 == Number`가 됩니다. 전체 식의 타입은 `T3`, 즉 `Number`입니다.

해 표에서 `T2`가 `Number => Number`가 아니라 여전히 `T1 => T3`로 적혀 있다는 점에 주목하세요. 해에는 타입 변수가 들어간 타입을 그대로 적어 두고, 필요할 때 다른 타입 변수의 해를 따라가며 풀어서 읽으면 됩니다. 이 "따라가며 풀기"는 뒤에서 `resolve`라는 함수로 정식화합니다.

다 채운 트리와 그에 해당하는 `TFAE` 프로그램은 다음과 같습니다.

```text
val : T3
├─ λ : T1 => T2 => T3
│  ├─ n : T1
│  └─ λ : T2 => T3
│     ├─ f : T2
│     └─ @ : T3
│        ├─ f : T2
│        └─ n : T1
├─ app
└─ @ : T3
   ├─ @ : T2 => T3
   │  ├─ app : T1 => T2 => T3
   │  └─ 42 : Number
   └─ λ : T4 => T4
      ├─ x : T4
      └─ x : T4
```

```tfae
/* TFAE */
val app = (n: Number) => (f: Number => Number) => f(n)
app(42)((x: Number) => x)
```

## 예제 3: `id`

세 번째 예제는 항등 함수를 두 번, 서로 다른 타입의 인자에 적용합니다.

```fae
/* FAE */
val id = x => x;
val n = id(42);
val b = id(true);
b
```

```text
val
├─ λ
│  ├─ x
│  └─ x
├─ id
└─ val
   ├─ @
   │  ├─ id
   │  └─ 42
   ├─ n
   └─ val
      ├─ @
      │  ├─ id
      │  └─ true
      ├─ b
      └─ b
```

앞의 방법을 그대로 적용하면 어떻게 될까요? `x => x`의 타입은 `T1 => T1`이고, `id(42)`에서 `T1 == Number`, `id(true)`에서 `T1 == Boolean`을 얻습니다. `T1`이 `Number`이면서 동시에 `Boolean`일 수는 없으니 타입 오류입니다. 하지만 이 프로그램은 실행해 보면 아무 문제가 없습니다. `id`는 어떤 타입의 값이든 그대로 돌려주는 함수이니까요.

해결책은 `id`를 정의하는 순간 그 타입 `T1 => T1`을 **다형 타입**(polymorphic type)으로 바꾸어 두는 것입니다. `T1`에 대한 해가 아무것도 없으므로 `T1`은 아무 타입이나 될 수 있습니다. 그래서 `T1`을 **타입 매개변수**(type parameter)로 삼아 `id`의 타입을 `[T1] { T1 => T1 }`로 기록합니다. `PTFAE`의 `forall[T1] { T1 => T1 }`과 같은 뜻입니다. 이것을 타입의 **일반화**(generalization)라고 합니다. 그리고 `id`를 쓸 때마다 타입 매개변수 `T1` 자리에 새 타입 변수를 넣어 <a id="g-instantiation"></a>**인스턴스화**(instantiation)합니다. 타입 환경은 1단계에서 `x: T1`이 들어갔다가 3단계에서 빠지고, 4단계에서 `id: [T1] { T1 => T1 }`, 8단계에서 `n: T2`, 12단계에서 `b: T3`가 차례로 들어갑니다.

| 단계 | 살펴보는 부분식 | 타입 | 새 변수, 제약 | `T1` | `T2` | `T3` |
|---|---|---|---|---|---|---|
| 1 | 매개변수 `x` | `T1` | 새 변수 `T1` | `-` | | |
| 2 | `x` | `T1` | | `-` | | |
| 3 | `x => x` | `T1 => T1` | | `-` | | |
| 4 | `id` 정의 | | `T1 => T1`을 일반화 | (타입 매개변수) | | |
| 5 | `id` | `T2 => T2` | 새 변수 `T2`로 `T1`을 인스턴스화 | | `-` | |
| 6 | `42` | `Number` | | | `-` | |
| 7 | `id(42)` | `T2` | `T2 == Number` | | `Number` | |
| 8 | `n` 정의 | | 일반화하지 않음 | | `Number` | |
| 9 | `id` | `T3 => T3` | 새 변수 `T3`로 `T1`을 인스턴스화 | | `Number` | `-` |
| 10 | `true` | `Boolean` | | | `Number` | `-` |
| 11 | `id(true)` | `T3` | `T3 == Boolean` | | `Number` | `Boolean` |
| 12 | `b` 정의 | | 일반화하지 않음 | | `Number` | `Boolean` |
| 13 | `b` | `T3` | | | `Number` | `Boolean` |

- **4단계**: `T1 => T1`을 `T1`을 타입 매개변수로 하는 다형 타입으로 일반화합니다. 이렇게 `val` 같은 **let 바인딩에서만** 다형성을 도입하기 때문에 이 방식을 **let-다형성**이라고 부릅니다.
- **5단계**: `id`를 꺼내 쓸 때 새 타입 변수 `T2`를 만들고, `T1 => T1`의 `T1`을 `T2`로 치환해 `T2 => T2`를 얻습니다.
- **8단계**: `n`의 타입 `T2`도 일반화할까요? 아닙니다. `T2`는 해에서 이미 `Number`로 정해졌으므로 **자유 타입 변수**(free type variable)가 아닙니다. 아무 타입이나 될 수 있는 변수가 아니니 다형 타입을 만들지 않습니다.
- **9단계**: 두 번째 `id`는 또 다른 새 타입 변수 `T3`로 인스턴스화합니다. 덕분에 `T2`와 `T3`는 서로 독립적이고, `T2 == Number`와 `T3 == Boolean`이 충돌하지 않습니다.
- **13단계**: 전체 식의 타입은 `T3`, 즉 `Boolean`입니다.

일반화와 인스턴스화를 그림으로 정리하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 650 220" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="x =&gt; x의 타입 T1 =&gt; T1을 id에 묶을 때 [T1] T1 =&gt; T1로 일반화하고, id를 쓸 때마다 새 타입 변수 T2, T3로 인스턴스화하므로 T2 = Number와 T3 = Boolean이 충돌하지 않는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="type-inference-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="10" y="92" width="170" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="115" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">x =&gt; x : T1 =&gt; T1</text>
<polyline points="180,110 232,110" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-3)"/>
<text x="206" y="98" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" font-weight="bold">gen</text>
<rect x="236" y="90" width="190" height="40" rx="4" fill="#2a408e"/>
<text x="331" y="115" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#fff">id : [T1] T1 =&gt; T1</text>
<polyline points="426,110 470,42" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-3)"/>
<rect x="474" y="24" width="150" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="549" y="47" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">id : T2 =&gt; T2</text>
<text x="549" y="80" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">id(42): T2 = Number</text>
<polyline points="426,110 470,168" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-3)"/>
<rect x="474" y="150" width="150" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="549" y="173" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">id : T3 =&gt; T3</text>
<text x="549" y="142" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">id(true): T3 = Boolean</text>
<text x="440" y="82" text-anchor="end" font-family="ui-monospace, Menlo, monospace" font-size="13" font-weight="bold">inst</text>
</svg>
</div>

다 채운 트리와 그에 해당하는 `PTFAE` 프로그램은 다음과 같습니다.

```text
val : T3
├─ λ : T1 => T1
│  ├─ x : T1
│  └─ x : T1
├─ id                         id: [T1] { T1 => T1 }
└─ val : T3
   ├─ @ : T2
   │  ├─ id : T2 => T2
   │  └─ 42 : Number
   ├─ n                       n: T2
   └─ val : T3
      ├─ @ : T3
      │  ├─ id : T3 => T3
      │  └─ true : Boolean
      ├─ b                    b: T3
      └─ b : T3
```

```ptfae
/* PTFAE */
val id = forall[T] { (x: T) => x }
val n = id[Number](42)
val b = id[Boolean](true)
b
```

타입 추론이 `forall[T]`로 타입을 추상화할 곳과 `[Number]`, `[Boolean]`으로 타입을 적용할 곳까지 알아서 찾아 준 셈입니다.

> **생각해 보기** `val`로 정의하는 대신 항등 함수를 함수 매개변수로 받는 `(id => { val n = id(42); id(true) })(x => x)`는 어떨까요? 이번에는 `id`가 `val`이 아니라 함수 매개변수로 묶이므로 일반화되지 않고, `Number`와 `Boolean`을 맞추다가 타입 오류가 납니다. let-다형성이라는 이름이 붙은 이유가 여기에 있습니다.

## `TIFAE`: 타입 추론이 있는 `TRFAE`

세 예제로 감을 잡았으니 이제 알고리즘을 정확히 정의할 차례입니다. 이 장에서 다룰 언어 `TIFAE`는 [`TRFAE`](./typing-recursive-functions.md)에 타입 추론을 더한 언어입니다. 문법은 `TRFAE`와 같되 함수 매개변수와 재귀 함수에 타입 표기가 없습니다. 실행 의미, 즉 인터프리터 `interp`와 자연 의미(natural semantics)은 타입과 무관하므로 `TRFAE`와 똑같습니다. 바뀌는 것은 타입 규칙과 타입 검사기뿐입니다.

여느 때처럼 두 가지를 합니다. 첫째, 식이 언제 타입이 맞는지(well-typed)를 정의하는 **타입 규칙**(typing rule)을 \\(\Gamma \vdash e : \tau\\) 꼴로 설계하고, 둘째, 타입 규칙대로 동작하는 **타입 검사기**(type checker)를 Scala로 구현합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = ???
```

타입 검사기는 식의 타입이 맞으면 그 타입을 돌려주고, 아니면 **타입 오류**(type error)를 던집니다. 변수의 타입은 변수 이름에서 타입으로 가는 유한 부분 함수인 타입 환경 \\(\Gamma\\)로 관리합니다.

\\[
\begin{array}{lrcll}
\text{Type Environments} & \Gamma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T} & (\texttt{TypeEnv})
\end{array}
\\]

```scala
type TypeEnv = Map[String, Type]
```

### 타입 제약의 해

예제에서는 타입 환경 말고도 표가 하나 더 있었습니다. 바로 타입 변수에 대한 **해**입니다. 타입 추론을 하려면 타입 제약을 모아 가면서 해를 계속 갱신해야 합니다. 먼저 타입에 타입 변수 \\(\alpha\\)를 추가하고, 해를 타입 변수에서 타입 또는 \\(\bullet\\)으로 가는 사상으로 정의합니다.

\\[
\begin{array}{lrrcll}
\text{Types} & \mathbb{T} \ni & \tau & ::= & \mathtt{num} \mid \mathtt{bool} \mid \tau \to \tau \mid \alpha & (\texttt{Type}) \\\\
\text{Solutions} & & \psi & \in & \Psi = \mathbb{X}\_{\alpha} \xrightarrow{\text{fin}} (\mathbb{T} \uplus \\{ \bullet \\}) & (\texttt{Solution}) \\\\
\text{Type Variables} & & \alpha & \in & \mathbb{X}\_{\alpha} & (\texttt{Int})
\end{array}
\\]

```scala
type Solution = Map[Int, Option[Type]]
```

타입 변수는 그냥 정수(`VarT(k)`)로 나타냅니다. \\(\bullet\\)(Scala에서는 `None`)은 **아직 풀리지 않은**, 즉 자유로운 타입 변수를 뜻합니다. 예제의 해 표에서 `-`로 적었던 칸이 바로 \\(\bullet\\)입니다.

이제 타입 검사기와 타입 규칙의 모양이 바뀝니다. 해를 받아서, 검사하는 동안 갱신한 해를 함께 돌려줍니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = ???
```

\\[
\Gamma, \psi \vdash e : \tau, \psi
\\]

[변경 가능한 변수](./mutable-variables.md)를 다룰 때 `MFAE`의 인터프리터가 메모리를 받아서 갱신한 메모리를 돌려주었던 것을 떠올려 보세요. 해도 마찬가지로 이 부분식에서 저 부분식으로 넘겨 가며 갱신합니다.

### 새 타입 변수

타입 검사를 하다 보면 <a id="g-fresh-type-variable"></a>**새 타입 변수**(fresh type variable)가 자주 필요합니다. 새 타입 변수란 지금 해의 정의역에 **없는** 타입 변수, 즉 \\(\alpha \notin \mathrm{dom}(\psi)\\)인 \\(\alpha\\)입니다. 타입 변수가 정수이므로, 해의 크기를 새 타입 변수로 쓰고 해를 그 변수가 \\(\bullet\\)을 가리키도록 확장하면 됩니다.

```scala
def newTypeVar(sol: Solution): (Type, Solution) =
  val k = sol.size // `k` is not in the domain of `sol`
  (VarT(k), sol + (k -> None))
```

타입 변수를 하나 만들 때마다 해에 하나씩 추가하므로, 해에는 `0`부터 `sol.size - 1`까지의 타입 변수가 빠짐없이 들어 있습니다. 따라서 `sol.size`는 언제나 새 타입 변수입니다.

### 수

수의 타입은 언제나 \\(\mathtt{num}\\)이고, 해는 건드리지 않습니다.

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Num(n) => (NumT, sol)
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\tau\texttt{-Num}$}
\UnaryInfC{$\Gamma, \psi \vdash n : \mathtt{num}, \psi$}
\end{prooftree}
\\]

<a id="g-boolean"></a>불(boolean) 값도 똑같이 \\(\mathtt{bool}\\) 타입을 돌려주고 해를 그대로 둡니다.

### 덧셈

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Add(l, r) =>
    val (lty, sol1) = typeCheck(l, tenv, sol)
    val (rty, sol2) = typeCheck(r, tenv, sol1)
    val sol3 = unify(lty, NumT, sol2)
    val sol4 = unify(rty, NumT, sol3)
    (NumT, sol4)
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi_0 \vdash e_1 : \tau_1, \psi_1 \qquad
\Gamma, \psi_1 \vdash e_2 : \tau_2, \psi_2 \\\\
\mathtt{unify}(\tau_1, \mathtt{num}, \psi_2) = \psi_3 \qquad
\mathtt{unify}(\tau_2, \mathtt{num}, \psi_3) = \psi_4
\end{array}$}
\LeftLabel{$\tau\texttt{-Add}$}
\UnaryInfC{$\Gamma, \psi_0 \vdash e_1 \mathbin{\mathtt{+}} e_2 : \mathtt{num}, \psi_4$}
\end{prooftree}
\\]

해가 \\(\psi_0, \psi_1, \psi_2, \psi_3, \psi_4\\) 순서로 실처럼 이어지는 모습을 눈여겨보세요. 예전의 `TFAE`라면 "\\(\tau_1\\)이 \\(\mathtt{num}\\)인지 확인한다"고 했을 자리에, 이제는 "\\(\tau_1\\)과 \\(\mathtt{num}\\)이 **같아지도록** 해를 갱신한다"는 `unify`가 들어갑니다. `unify`는 두 타입이 같아야 한다는 제약을 받아서 해를 갱신하는 함수인데, 어떻게 동작하는지는 잠시 뒤에 자세히 봅니다. 곱셈, 나눗셈, 나머지도 같은 방식이고, `==`와 `<` 같은 비교는 피연산자를 \\(\mathtt{num}\\)과 단일화한 뒤 \\(\mathtt{bool}\\)을 돌려준다는 점만 다릅니다.

### 조건식

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case If(c, t, e) =>
    val (cty, sol1) = typeCheck(c, tenv, sol)
    val (tty, sol2) = typeCheck(t, tenv, sol1)
    val (ety, sol3) = typeCheck(e, tenv, sol2)
    val sol4 = unify(cty, BoolT, sol3)
    val sol5 = unify(tty, ety, sol4)
    (tty, sol5)
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi \vdash e_c : \tau_c, \psi_c \qquad
\Gamma, \psi_c \vdash e_t : \tau_t, \psi_t \qquad
\Gamma, \psi_t \vdash e_e : \tau_e, \psi_e \\\\
\mathtt{unify}(\tau_c, \mathtt{bool}, \psi_e) = \psi' \qquad
\mathtt{unify}(\tau_t, \tau_e, \psi') = \psi''
\end{array}$}
\LeftLabel{$\tau\texttt{-If}$}
\UnaryInfC{$\Gamma, \psi \vdash \mathtt{if}\ (e_c)\ e_t\ \mathtt{else}\ e_e : \tau_t, \psi''$}
\end{prooftree}
\\]

조건의 타입은 \\(\mathtt{bool}\\)과, 두 갈래의 타입은 서로 단일화합니다. 결과로는 \\(\tau_t\\)를 돌려주는데, 단일화를 마친 해 \\(\psi''\\) 아래에서는 \\(\tau_t\\)와 \\(\tau_e\\)가 같은 타입을 가리키므로 어느 쪽을 돌려주어도 됩니다.

### 변수 정의와 식별자

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Val(x, e, b) =>
    val (ety, sol1) = typeCheck(e, tenv, sol)
    typeCheck(b, tenv + (x -> ety), sol1)
  case Id(x) =>
    val ty = tenv.getOrElse(x, error(s"free identifier: $x"))
    (ty, sol)
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma, \psi_0 \vdash e_1 : \tau_1, \psi_1$}
\AxiomC{$\Gamma[x : \tau_1], \psi_1 \vdash e_2 : \tau_2, \psi_2$}
\LeftLabel{$\tau\texttt{-Val}$}
\BinaryInfC{$\Gamma, \psi_0 \vdash \mathtt{val}\ x\ \mathtt{=}\ e_1\mathtt{;}\ e_2 : \tau_2, \psi_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$x \in \mathrm{dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma, \psi \vdash x : \Gamma(x), \psi$}
\end{prooftree}
\\]

지금까지와 거의 같고, 해를 넘겨주는 일만 늘었습니다. 이 두 규칙은 뒤에서 let-다형성을 넣으며 한 번 더 고칩니다.

### 함수 정의

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Fun(p, b) =>
    val (pty, sol1) = newTypeVar(sol)
    val (rty, sol2) = typeCheck(b, tenv + (p -> pty), sol1)
    (ArrowT(pty, rty), sol2)
```

\\[
\begin{prooftree}
\AxiomC{$\alpha_p \notin \mathrm{dom}(\psi)$}
\AxiomC{$\Gamma[x : \alpha_p], \psi[\alpha_p \mapsto \bullet] \vdash e : \tau, \psi'$}
\LeftLabel{$\tau\texttt{-Fun}$}
\BinaryInfC{$\Gamma, \psi \vdash \lambda x.e : \alpha_p \to \tau, \psi'$}
\end{prooftree}
\\]

매개변수 \\(x\\)에 타입 표기가 없으니, 새 타입 변수 \\(\alpha_p\\)를 만들어 \\(x\\)의 타입으로 삼습니다. 예제 2의 1, 2단계에서 한 일이 정확히 이것입니다.

### 재귀 함수 정의

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Rec(f, p, b, s) =>
    val (pty, sol1) = newTypeVar(sol)
    val (rty, sol2) = newTypeVar(sol1)
    val fty = ArrowT(pty, rty)
    val tenv1 = tenv + (f -> fty)
    val tenv2 = tenv1 + (p -> pty)
    val (bty, sol3) = typeCheck(b, tenv2, sol2)
    val sol4 = unify(bty, rty, sol3)
    typeCheck(s, tenv1, sol4)
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\alpha_p, \alpha_r \notin \mathrm{dom}(\psi) \qquad \alpha_p \neq \alpha_r \qquad
\Gamma_1 = \Gamma[x_f : (\alpha_p \to \alpha_r)] \qquad
\Gamma_2 = \Gamma_1[x_p : \alpha_p] \\\\
\Gamma_2, \psi[\alpha_p \mapsto \bullet, \alpha_r \mapsto \bullet] \vdash e_b : \tau_b, \psi_b \qquad
\mathtt{unify}(\tau_b, \alpha_r, \psi_b) = \psi_r \\\\
\Gamma_1, \psi_r \vdash e_s : \tau_s, \psi_s
\end{array}$}
\LeftLabel{$\tau\texttt{-Rec}$}
\UnaryInfC{$\Gamma, \psi \vdash \mathtt{def}\ x_f(x_p)\ \mathtt{=}\ e_b\mathtt{;}\ e_s : \tau_s, \psi_s$}
\end{prooftree}
\\]

매개변수 타입 \\(\alpha_p\\)와 반환 타입 \\(\alpha_r\\)를 위해 서로 다른 새 타입 변수 두 개를 만듭니다. 예제 1에서 `T1`, `T2`를 만든 것과 같습니다. 몸통은 함수 자신과 매개변수가 모두 보이는 \\(\Gamma_2\\)에서 검사하고, 몸통의 타입 \\(\tau_b\\)를 반환 타입 \\(\alpha_r\\)와 단일화합니다(예제 1의 11단계). 마지막 식 \\(e_s\\)는 함수만 보이는 \\(\Gamma_1\\)에서 검사합니다.

### 함수 적용

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case App(f, a) =>
    val (fty, sol1) = typeCheck(f, tenv, sol)
    val (aty, sol2) = typeCheck(a, tenv, sol1)
    val (rty, sol3) = newTypeVar(sol2)
    val sol4 = unify(ArrowT(aty, rty), fty, sol3)
    (rty, sol4)
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi \vdash e_f : \tau_f, \psi_f \qquad
\Gamma, \psi_f \vdash e_a : \tau_a, \psi_a \\\\
\alpha_r \notin \mathrm{dom}(\psi_a) \qquad
\mathtt{unify}(\tau_a \to \alpha_r, \tau_f, \psi_a[\alpha_r \mapsto \bullet]) = \psi'
\end{array}$}
\LeftLabel{$\tau\texttt{-App}$}
\UnaryInfC{$\Gamma, \psi \vdash e_f(e_a) : \alpha_r, \psi'$}
\end{prooftree}
\\]

함수 적용이 가장 흥미롭습니다. `TFAE`에서는 \\(\tau_f\\)가 화살표 타입인지 확인하고 그 매개변수 타입을 인자 타입과 비교했습니다. 하지만 이제 \\(\tau_f\\)는 예제 2의 `f`처럼 아직 정체를 모르는 타입 변수일 수도 있습니다. 그래서 결과 타입을 위한 새 타입 변수 \\(\alpha_r\\)를 만들고, "\\(e_f\\)는 \\(\tau_a\\)를 받아 \\(\alpha_r\\)를 돌려주는 함수여야 한다"는 제약을 단일화로 해에 반영합니다. \\(\tau_f\\)가 이미 화살표 타입이라면 단일화가 알아서 매개변수 타입과 인자 타입을 맞추어 줍니다.

> **자주 하는 실수** 예제 2를 손으로 풀 때는 `app(42)`의 타입을 `app`의 타입에서 바로 `T2 => T3`로 읽어 냈지만, 실제 알고리즘은 함수 적용마다 결과 타입을 위한 새 타입 변수를 만듭니다. 그래서 예제를 코드로 돌려 보면 타입 변수의 번호와 개수가 손으로 푼 것과 다릅니다. 하지만 해를 끝까지 풀어서 얻는 최종 타입은 같으니 걱정하지 않아도 됩니다.

## 타입 단일화

이제 미뤄 두었던 `unify`를 정의할 차례입니다.

> **정의 (타입 단일화)** 타입 단일화는 두 타입이 같아지도록 해를 갱신하는 과정입니다. 두 타입을 같게 만들 수 없으면 실패하고 예외를 던집니다.

\\[
\mathtt{unify} : (\mathbb{T} \times \mathbb{T} \times \Psi) \rightharpoonup \Psi
\\]

실패할 수 있으므로 <a id="g-partial-function"></a>부분 함수(partial function)입니다. 예를 들어 타입 변수 \\(\alpha\\)와 \\(\mathtt{num}\\)을 단일화하면 해 \\([\alpha \mapsto \bullet]\\)이 \\([\alpha \mapsto \mathtt{num}]\\)으로 바뀝니다.

\\[
\mathtt{unify}(\alpha, \mathtt{num}, [\alpha \mapsto \bullet]) = [\alpha \mapsto \mathtt{num}]
\\]

간단해 보이지만, 제대로 정의하려면 도우미 함수 두 개가 먼저 필요합니다.

1. <a id="g-type-resolving"></a>**타입 해소**(type resolving): 타입 변수가 다른 타입 변수를 가리키는 **aliasing**을 처리하기 위해, 타입 변수를 따라가며 그 <a id="g-representative-type"></a>**대표 타입**(representative type)을 재귀적으로 찾습니다.
2. <a id="g-occurrence-checking"></a>**출현 검사**(occurrence checking): 어떤 타입 변수가 어떤 타입 안에 나타나는지 확인해서, **재귀 타입**(recursive type)이 필요한 상황을 잡아냅니다.

### 타입 해소

타입 해소가 왜 필요한지 다음 예로 알아봅시다.

\\[
\mathtt{unify}(\alpha_1, \mathtt{num}, \psi_1) = \psi_2
\\]

| 타입 변수 | \\(\psi_1\\) | 잘못된 \\(\psi_2\\) | 올바른 \\(\psi_2\\) |
|---|---|---|---|
| \\(\alpha_1\\) | \\(\alpha_2\\) | \\(\mathtt{num}\\) | \\(\alpha_2\\) |
| \\(\alpha_2\\) | \\(\alpha_3\\) | \\(\alpha_3\\) | \\(\alpha_3\\) |
| \\(\alpha_3\\) | \\(\bullet\\) | \\(\bullet\\) | \\(\mathtt{num}\\) |

\\(\psi_1\\)에서 \\(\alpha_1\\)은 \\(\alpha_2\\)를, \\(\alpha_2\\)는 \\(\alpha_3\\)를 가리키고, \\(\alpha_3\\)는 아직 풀리지 않았습니다. 즉 세 변수는 모두 같은 타입의 다른 이름입니다. 여기서 \\(\alpha_1\\)의 칸을 곧바로 \\(\mathtt{num}\\)으로 덮어쓰면(가운데 열), \\(\alpha_2\\)와 \\(\alpha_3\\)도 \\(\mathtt{num}\\)이라는 정보를 잃어버립니다. 대신 \\(\alpha_1\\)을 따라가서 대표 타입 \\(\alpha_3\\)를 찾은 다음, \\(\alpha_3\\)를 \\(\mathtt{num}\\)과 단일화해야 합니다(오른쪽 열). 그러면 세 변수 모두 \\(\mathtt{num}\\)으로 풀립니다.

해를 "타입 변수가 가리키는 타입"으로 향하는 화살표로 그리면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 530 190" width="100%" style="max-width: 520px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="α1이 α2를, α2가 α3를 가리키는 해에서 α1과 num을 단일화할 때, α1을 바로 num으로 덮어쓰면 α2와 α3가 정보를 잃고, 대표 타입 α3를 num으로 정해야 세 변수가 모두 num으로 풀린다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="type-inference-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="46" text-anchor="start" font-weight="bold">ψ₁</text>
<rect x="105.0" y="24" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="46" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">1</tspan></text>
<polyline points="155,40 193,40" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="195.0" y="24" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="46" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">2</tspan></text>
<polyline points="245,40 283,40" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="285.0" y="24" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="46" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">3</tspan></text>
<polyline points="335,40 373,40" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="375.0" y="24" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="46" text-anchor="middle" font-size="24">•</text>
<text x="20" y="106" text-anchor="start" font-weight="bold">잘못된 ψ₂</text>
<rect x="105.0" y="84" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="106" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">1</tspan></text>
<polyline points="155,100 193,100" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="195.0" y="84" width="50" height="32" rx="4" fill="#2a408e"/>
<text x="220" y="106" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">num</text>
<rect x="285.0" y="84" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="106" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">2</tspan></text>
<polyline points="335,100 373,100" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="375.0" y="84" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="106" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">3</tspan></text>
<polyline points="425,100 463,100" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="465.0" y="84" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="106" text-anchor="middle" font-size="24">•</text>
<text x="20" y="166" text-anchor="start" font-weight="bold">올바른 ψ₂</text>
<rect x="105.0" y="144" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="166" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">1</tspan></text>
<polyline points="155,160 193,160" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="195.0" y="144" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="166" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">2</tspan></text>
<polyline points="245,160 283,160" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="285.0" y="144" width="50" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="166" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="17" font-style="italic">α<tspan baseline-shift="sub" font-size="11">3</tspan></text>
<polyline points="335,160 373,160" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-1)"/>
<rect x="375.0" y="144" width="50" height="32" rx="4" fill="#2a408e"/>
<text x="400" y="166" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">num</text>
</svg>
</div>

타입 해소 함수는 다음과 같이 정의합니다.

\\[
\mathtt{resolve} : (\mathbb{T} \times \Psi) \to \mathbb{T}
\\]

\\[
\mathtt{resolve}(\tau, \psi) = \left\\{
\begin{array}{ll}
\mathtt{resolve}(\tau', \psi) & \text{if}\ \tau = \alpha \land \psi(\alpha) = \tau' \\\\
\mathtt{resolve}(\tau_p, \psi) \to \mathtt{resolve}(\tau_r, \psi) & \text{if}\ \tau = (\tau_p \to \tau_r) \\\\
\tau & \text{otherwise}
\end{array}
\right.
\\]

타입 변수가 어떤 타입을 가리키면 그 타입을 계속 따라가고, 화살표 타입이면 양쪽을 각각 해소하고, 나머지(\\(\mathtt{num}\\), \\(\mathtt{bool}\\), 풀리지 않은 타입 변수)는 그대로 둡니다. Scala로는 이렇게 구현합니다.

```scala
def resolve(ty: Type, sol: Solution): Type = ty match
  case VarT(k) => sol(k) match
    case Some(ty) => resolve(ty, sol)
    case None => ty
  case ArrowT(pty, rty) =>
    ArrowT(resolve(pty, sol), resolve(rty, sol))
  case _ => ty
```

예제 2의 해 표에서 `T2`가 `T1 => T3`로 적혀 있어도 괜찮았던 이유가 이것입니다. 마지막 해에서 `T2`를 해소하면 `T1`과 `T3`를 각각 따라가 `Number => Number`를 얻습니다.

### 출현 검사

다음 단일화를 생각해 봅시다.

\\[
\mathtt{unify}(\alpha_1, \mathtt{num} \to \alpha_1, \psi) = \psi'
\\]

\\(\alpha_1\\)과 \\(\mathtt{num} \to \alpha_1\\)을 같게 만들 수 있을까요? **아닙니다.** \\(\alpha_1 = \mathtt{num} \to \alpha_1 = \mathtt{num} \to \mathtt{num} \to \alpha_1 = \cdots\\)처럼 끝없이 펼쳐지는 재귀 타입이 필요한데, 우리 타입 시스템은 재귀 타입을 지원하지 않습니다. 이런 제약을 잡아내기 위해 타입 변수가 타입 안에 나타나는지 검사하는 함수를 정의합니다.

\\[
\mathtt{occur} : (\mathbb{X}\_{\alpha} \times \mathbb{T}) \to \mathbb{B}
\\]

\\[
\mathtt{occur}(\alpha, \tau) = \left\\{
\begin{array}{ll}
\mathtt{true} & \text{if}\ \tau = \alpha \\\\
\mathtt{occur}(\alpha, \tau_p) \lor \mathtt{occur}(\alpha, \tau_r) & \text{if}\ \tau = (\tau_p \to \tau_r) \\\\
\mathtt{false} & \text{otherwise}
\end{array}
\right.
\\]

```scala
def occurs(k: Int, ty: Type): Boolean = ty match
  case VarT(l) => k == l
  case ArrowT(pty, rty) => occurs(k, pty) || occurs(k, rty)
  case _ => false
```

> **생각해 보기** `x => x(x)`의 타입을 추론하면 어디서 출현 검사에 걸릴까요? `x`의 타입을 `T0`라 하면, `x(x)`에서 결과 타입 `T1`을 만들고 `T0 => T1`과 `T0`를 단일화하게 됩니다. `T0`가 `T0 => T1` 안에 나타나므로 단일화가 실패합니다.

### 단일화 정의

타입 해소와 출현 검사가 준비되었으니 타입 단일화를 부분 함수로 정의할 수 있습니다.

\\[
\small
\mathtt{unify}(\tau_1, \tau_2, \psi) = \left\\{
\begin{array}{ll}
\psi & \text{if}\ \tau'\_1 = \mathtt{num} \land \tau'\_2 = \mathtt{num} \\\\
\psi & \text{if}\ \tau'\_1 = \mathtt{bool} \land \tau'\_2 = \mathtt{bool} \\\\
\mathtt{unify}(\tau_{1,r}, \tau_{2,r}, \mathtt{unify}(\tau_{1,p}, \tau_{2,p}, \psi)) & \text{if}\ \tau'\_1 = \tau_{1,p} \to \tau_{1,r} \land \tau'\_2 = \tau_{2,p} \to \tau_{2,r} \\\\
\psi & \text{if}\ \tau'\_1 = \alpha = \tau'\_2 \\\\
\psi[\alpha \mapsto \tau'\_2] & \text{if}\ \tau'\_1 = \alpha \land \neg \mathtt{occur}(\alpha, \tau'\_2) \\\\
\psi[\alpha \mapsto \tau'\_1] & \text{if}\ \tau'\_2 = \alpha \land \neg \mathtt{occur}(\alpha, \tau'\_1)
\end{array}
\right.
\\]

\\[
\text{where}\ \tau'\_1 = \mathtt{resolve}(\tau_1, \psi)\ \text{and}\ \tau'\_2 = \mathtt{resolve}(\tau_2, \psi)
\\]

말로 풀면 세 단계입니다.

1. 먼저 지금의 해 \\(\psi\\)로 두 타입 \\(\tau_1\\), \\(\tau_2\\)를 해소해 \\(\tau'\_1\\), \\(\tau'\_2\\)를 얻습니다.
2. 둘 중 하나가 타입 변수이고 그 변수가 다른 쪽 타입에 **나타나지 않으면**, 그 타입 변수의 해를 다른 쪽 타입으로 정합니다.
3. 그 밖의 경우에는 \\(\tau'\_1\\)과 \\(\tau'\_2\\)가 같은지 확인하거나(\\(\mathtt{num}\\)끼리, \\(\mathtt{bool}\\)끼리, 같은 타입 변수끼리), 둘 다 화살표 타입이면 매개변수 타입끼리, 반환 타입끼리 재귀적으로 단일화합니다. 어느 경우에도 해당하지 않으면 실패합니다.

해소를 먼저 하기 때문에, 2번에서 갱신하는 타입 변수는 언제나 해에서 \\(\bullet\\)을 가리키던 대표 타입 변수입니다. 앞의 타입 해소 예에서 \\(\alpha_1\\)이 아니라 \\(\alpha_3\\)가 갱신되는 것도 이 덕분입니다. Scala 구현은 정의를 거의 그대로 옮긴 모양입니다.

```scala
def unify(lty: Type, rty: Type, sol: Solution): Solution =
  (resolve(lty, sol), resolve(rty, sol)) match
    case (NumT, NumT) => sol
    case (BoolT, BoolT) => sol
    case (ArrowT(lpty, lrty), ArrowT(rpty, rrty)) =>
      unify(lrty, rrty, unify(lpty, rpty, sol))
    case (VarT(k), VarT(l)) if k == l => sol
    case (VarT(k), rty) if !occurs(k, rty) => sol + (k -> Some(rty))
    case (lty, VarT(k)) if !occurs(k, lty) => sol + (k -> Some(lty))
    case _ => error(s"Cannot unify ${lty.str} and ${rty.str}")
```

예제 2의 15단계를 `unify`로 다시 따라가 봅시다. 해가 `T1 = Number`, `T2 = T1 => T3`, `T3 = -`, `T4 = -`일 때 `unify(T2, T4 => T4)`를 계산합니다.

| 계산 | 해소한 두 타입 | 적용되는 경우 | 해의 변화 |
|---|---|---|---|
| `unify(T2, T4 => T4)` | `Number => T3`, `T4 => T4` | 화살표끼리 | |
| `unify(T1, T4)` (매개변수끼리) | `Number`, `T4` | 오른쪽이 타입 변수 | `T4 = Number` |
| `unify(T3, T4)` (반환 타입끼리) | `T3`, `Number` | 왼쪽이 타입 변수 | `T3 = Number` |

반환 타입끼리 단일화할 때는 바로 앞에서 갱신된 해를 쓰므로 `T4`가 이미 `Number`로 해소된다는 점에 주목하세요. 정의에서 바깥 `unify`가 안쪽 `unify`의 결과 해를 받는 이유가 이것입니다.

단일화가 끝난 뒤의 해를 화살표로 그리면 다음과 같습니다. `T2`를 해소하면 화살표를 따라가 `Number => Number`를 얻습니다.

<div style="text-align:center">
<svg viewBox="0 0 560 250" width="100%" style="max-width: 540px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="예제 2의 15단계 뒤의 해: T2는 화살표 타입 T1 =&gt; T3를 가리키고, T1, T3, T4는 모두 Number를 가리키므로 T2를 해소하면 Number =&gt; Number가 된다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="type-inference-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="42.0" y="30" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="52" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">T2</text>
<polyline points="98,46 186,46" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-2)"/>
<rect x="192.0" y="30" width="56" height="32" rx="4" fill="#2a408e"/>
<text x="220" y="52" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">=&gt;</text>
<polyline points="205,62 162,118" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4"/>
<polyline points="235,62 278,118" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4"/>
<text x="166" y="88" text-anchor="end" font-size="12">매개변수</text>
<text x="274" y="88" text-anchor="start" font-size="12">반환</text>
<rect x="122.0" y="118" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">T1</text>
<rect x="262.0" y="118" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">T3</text>
<rect x="402.0" y="118" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">T4</text>
<polyline points="150,150 150,186" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-2)"/>
<rect x="110.0" y="188" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="210" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<polyline points="290,150 290,186" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-2)"/>
<rect x="250.0" y="188" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="290" y="210" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<polyline points="430,150 430,186" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-2)"/>
<rect x="390.0" y="188" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="210" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<polyline points="330,240 350,240" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#type-inference-2)"/>
<text x="356" y="244" text-anchor="start" font-size="13">해 ψ가 가리키는 타입</text>
<polyline points="140,240 160,240" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4"/>
<text x="166" y="244" text-anchor="start" font-size="13">타입의 구성 요소</text>
<text x="470" y="40" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">resolve(T2)</text>
<text x="470" y="62" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">= Number =&gt; Number</text>
</svg>
</div>

## let-다형성을 위한 타입 추론

지금까지의 규칙만으로는 예제 3의 `id`를 처리할 수 없습니다. 예제 3에서 한 일은 두 가지였습니다. `val`로 정의한 식의 타입을 **일반화**하고, 식별자를 쓸 때마다 **인스턴스화**했습니다. 이 두 가지를 차례로 정의해 봅시다.

### 타입 스킴

먼저 타입 환경이 `[T1] { T1 => T1 }` 같은 다형 타입을 담을 수 있어야 합니다. 이를 위해 타입 환경을 <a id="g-type-scheme"></a>**타입 스킴**(type scheme), 즉 다형 타입의 제한된 형태를 담도록 확장합니다.

\\[
\begin{array}{lrcrcl}
\text{Type Environments} & & & \Gamma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T}^{\forall} \\\\
\text{Type Schemes} & \forall(\alpha^{\ast}).\tau & = & \tau^{\forall} & \in & \mathbb{T}^{\forall} = \mathbb{X}\_{\alpha}^{\ast} \times \mathbb{T} \\\\
\text{Types} & \mathbb{T} & \ni & \tau & ::= & \mathtt{num} \mid \mathtt{bool} \mid \tau \to \tau \mid \alpha
\end{array}
\\]

타입 스킴 \\(\forall(\alpha_1, \ldots, \alpha_m).\tau\\)는 타입 매개변수 목록과 타입의 쌍입니다. 다형 타입이 `TIFAE`의 **타입은 아니라는** 점에 주의하세요. 타입의 문법 \\(\tau\\)에는 \\(\forall\\)가 없습니다. 타입 스킴은 오직 타입 환경 안에서만 쓰는, 맨 바깥에만 \\(\forall\\)를 허용하는 제한된 다형 타입입니다. `PTFAE`에서는 `Number => (forall[T] { T => T })`처럼 화살표 안쪽에도 다형 타입을 쓸 수 있었지만, 타입 스킴으로는 그럴 수 없습니다. 바로 이 제한 덕분에 주석 없이도 타입을 추론할 수 있습니다.

Scala로는 타입 환경과 타입 스킴을 다음과 같이 정의합니다.

```scala
// type environments
type TypeEnv = Map[String, TypeScheme]
// type schemes
case class TypeScheme(ks: List[Int], ty: Type)
```

타입 환경이 이제 `TypeScheme`을 담으므로, 함수 매개변수나 재귀 함수처럼 일반화하지 않는 변수를 타입 환경에 넣을 때는 타입 매개변수가 없는 스킴 `TypeScheme(Nil, ty)`로 감싸서 넣습니다. 예를 들어 함수 정의의 경우 `tenv + (p -> TypeScheme(Nil, pty))`가 됩니다.

### 타입 일반화

`val`의 규칙은 다음과 같이 바뀝니다.

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Val(x, e, b) =>
    val (ety, sol1) = typeCheck(e, tenv, sol)
    val polyty = gen(ety, tenv, sol1)
    typeCheck(b, tenv + (x -> polyty), sol1)
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma, \psi_0 \vdash e_1 : \tau_1, \psi_1$}
\AxiomC{$\mathtt{gen}(\tau_1, \Gamma, \psi_1) = \tau^{\forall}\_1$}
\AxiomC{$\Gamma[x : \tau^{\forall}\_1], \psi_1 \vdash e_2 : \tau_2, \psi_2$}
\LeftLabel{$\tau\texttt{-Val}$}
\TrinaryInfC{$\Gamma, \psi_0 \vdash \mathtt{val}\ x\ \mathtt{=}\ e_1\mathtt{;}\ e_2 : \tau_2, \psi_2$}
\end{prooftree}
\\]

\\(e_1\\)의 타입 \\(\tau_1\\)을 <a id="g-generalization"></a>**타입 일반화**(type generalization) 함수 \\(\mathtt{gen}\\)으로 타입 스킴 \\(\tau^{\forall}\_1\\)으로 바꾼 뒤 \\(x\\)에 묶습니다. 예를 들어 예제 3의 4단계는 다음과 같습니다.

\\[
\mathtt{gen}(\alpha \to \alpha, \varnothing, [\alpha \mapsto \bullet]) = \forall \alpha.(\alpha \to \alpha)
\\]

\\(\mathtt{gen}\\)은 다음과 같이 정의합니다. 여기서 \\(\Gamma\\)들의 집합을 \\(\mathbb{E} = \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T}^{\forall}\\)라고 쓰겠습니다.

\\[
\mathtt{gen} : (\mathbb{T} \times \mathbb{E} \times \Psi) \to \mathbb{T}^{\forall}
\\]

\\[
\mathtt{gen}(\tau, \Gamma, \psi) = \forall(\alpha_1, \ldots, \alpha_m).\tau
\quad \text{where} \quad
\mathtt{free}\_{\tau}(\tau, \psi) \setminus \mathtt{free}\_{\Gamma}(\Gamma, \psi) = \\{ \alpha_1, \ldots, \alpha_m \\}
\\]

즉 \\(\tau\\)에 나타나는 자유 타입 변수 가운데, 타입 환경 \\(\Gamma\\)에 나타나는 자유 타입 변수를 **뺀** 나머지를 타입 매개변수로 삼습니다. 각 구성 요소의 자유 타입 변수는 이렇게 정의합니다.

\\[
\mathtt{free}\_{\tau} : (\mathbb{T} \times \Psi) \to \mathcal{P}(\mathbb{X}\_{\alpha})
\\]

\\[
\mathtt{free}\_{\tau}(\tau, \psi) = \left\\{
\begin{array}{ll}
\\{ \alpha \\} & \text{if}\ \tau = \alpha \land \psi(\alpha) = \bullet \\\\
\mathtt{free}\_{\tau}(\tau', \psi) & \text{if}\ \tau = \alpha \land \psi(\alpha) = \tau' \\\\
\mathtt{free}\_{\tau}(\tau_p, \psi) \cup \mathtt{free}\_{\tau}(\tau_r, \psi) & \text{if}\ \tau = (\tau_p \to \tau_r) \\\\
\varnothing & \text{otherwise}
\end{array}
\right.
\\]

\\[
\mathtt{free}\_{\forall} : (\mathbb{T}^{\forall} \times \Psi) \to \mathcal{P}(\mathbb{X}\_{\alpha})
\\]

\\[
\mathtt{free}\_{\forall}(\forall(\alpha_1, \ldots, \alpha_m).\tau, \psi) = \mathtt{free}\_{\tau}(\tau, \psi) \setminus \\{ \alpha_1, \ldots, \alpha_m \\}
\\]

\\[
\mathtt{free}\_{\Gamma} : (\mathbb{E} \times \Psi) \to \mathcal{P}(\mathbb{X}\_{\alpha})
\\]

\\[
\mathtt{free}\_{\Gamma}([x_1 : \tau^{\forall}\_1, \ldots, x_n : \tau^{\forall}\_n], \psi) = \mathtt{free}\_{\forall}(\tau^{\forall}\_1, \psi) \cup \cdots \cup \mathtt{free}\_{\forall}(\tau^{\forall}\_n, \psi)
\\]

타입에서는 해를 따라가다 \\(\bullet\\)을 가리키는 타입 변수를 만나면 자유 타입 변수로 셉니다. 예제 3의 8단계에서 `n`의 타입 `T2`를 일반화하지 않은 것도 이 정의 때문입니다. `T2`는 해에서 `Number`를 가리키므로 \\(\mathtt{free}\_{\tau}\\)가 공집합을 돌려줍니다. 타입 스킴에서는 타입 매개변수로 묶인 변수를 빼고, 타입 환경에서는 모든 스킴의 자유 타입 변수를 모읍니다.

그런데 왜 타입 환경의 자유 타입 변수를 빼야 할까요? 다음 예를 봅시다.

```tifae
/* TIFAE */
x => {
  // tyenv = [x: T1]  and  solution = [T1 -> _]    (T1 is free in tyenv)
  val z = x;        // z: T1 (O)    not     z: [T1] { T1 } (X)
  z                 // z: T1 (O)    not     z: T2          (X)
}
```

`val z = x`에서 `x`의 타입 `T1`은 자유 타입 변수입니다. 만약 이것을 `[T1] { T1 }`로 일반화하면, 마지막 줄의 `z`는 새 타입 변수 `T2`로 인스턴스화되어 `x`와 아무 상관 없는 타입을 얻습니다. `z`와 `x`는 완전히 같은 값인데도 말이지요. 이 `T1`은 "아무 타입이나 될 수 있는" 변수가 아니라 "바깥 함수의 매개변수 타입으로, 아직 모를 뿐 하나로 정해져 있는" 변수입니다. 타입 환경에 나타나는 자유 타입 변수는 이렇게 바깥 문맥에 묶여 있으므로 일반화해서는 안 됩니다. 이 예제의 타입은 `T1 => T1`이어야 하는데, 잘못 일반화하면 `T1 => T2`라는 엉뚱한 타입이 나옵니다.

### 타입 인스턴스화

반대로 식별자를 쓸 때는 타입 스킴을 새 타입 변수로 채워 평범한 타입으로 바꿉니다.

```scala
def typeCheck(e: Expr, tenv: TypeEnv, sol: Solution): (Type, Solution) = e match
  ...
  case Id(x) =>
    val ty = tenv.getOrElse(x, error(s"free identifier: $x"))
    inst(ty, sol)
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma(x) = \tau^{\forall}$}
\AxiomC{$\mathtt{inst}(\tau^{\forall}, \psi) = (\tau, \psi')$}
\LeftLabel{$\tau\texttt{-Id}$}
\BinaryInfC{$\Gamma, \psi \vdash x : \tau, \psi'$}
\end{prooftree}
\\]

<a id="g-type-instantiation"></a>**타입 인스턴스화**(type instantiation) 함수 \\(\mathtt{inst}\\)는 타입 스킴의 타입 매개변수마다 새 타입 변수를 만들어 치환합니다. 예를 들어 예제 3의 5단계는 다음과 같습니다.

\\[
\mathtt{inst}(\forall \alpha.(\alpha \to \alpha), \varnothing) = (\beta \to \beta, [\beta \mapsto \bullet])
\\]

정의는 다음과 같습니다.

\\[
\mathtt{inst} : (\mathbb{T}^{\forall} \times \Psi) \to (\mathbb{T} \times \Psi)
\\]

\\[
\begin{array}{l}
\mathtt{inst}(\forall(\alpha_1, \ldots, \alpha_m).\tau, \psi) = ( \\\\
\qquad \mathtt{resolve}(\tau, \psi[\alpha_1 \mapsto \alpha'\_1, \ldots, \alpha_m \mapsto \alpha'\_m]), \\\\
\qquad \psi[\alpha'\_1 \mapsto \bullet, \ldots, \alpha'\_m \mapsto \bullet] \\\\
) \quad \text{where} \quad \alpha'\_1, \ldots, \alpha'\_m \notin \mathrm{dom}(\psi) \land \forall 1 \le i \lt j \le m.\ \alpha'\_i \neq \alpha'\_j
\end{array}
\\]

서로 다른 새 타입 변수 \\(\alpha'\_1, \ldots, \alpha'\_m\\)를 만들고, 각 \\(\alpha_i\\)가 \\(\alpha'\_i\\)를 가리키는 **임시** 해 아래에서 \\(\tau\\)를 해소하면 \\(\alpha_i\\) 자리가 모두 \\(\alpha'\_i\\)로 바뀐 타입을 얻습니다. 돌려주는 해에서는 \\(\alpha_i\\)에 대한 임시 사상을 버리고 새 타입 변수들만 \\(\bullet\\)으로 추가합니다. 타입 매개변수가 없는 스킴이라면 \\(\mathtt{inst}\\)는 \\(\tau\\)를 해소한 타입과 원래 해를 돌려주므로, let-다형성이 없던 예전 \\(\tau\\)-`Id` 규칙과 같은 일을 합니다.

### 세 예제 다시 보기

이제 세 예제를 모두 실제 알고리즘으로 처리할 수 있습니다. 이 장의 규칙대로 `typeCheck`를 구현하고, 빈 타입 환경과 빈 해에서 시작해 얻은 타입을 마지막 해로 해소하는 함수 `infer`를 만들어 돌려 보면 다음 결과가 나옵니다. 주석 안의 `TIFAE` 식은 실제로는 `Rec`, `Val`, `App` 같은 `Expr` 값으로 만들어 넘깁니다.

```scala
def infer(e: Expr): Type =
  val (ty, sol) = typeCheck(e, Map(), Map())
  resolve(ty, sol)

infer(/* def sum(x) = if (x < 1) 0 else x + sum(x + -1); sum */)
// ArrowT(NumT,NumT)
infer(/* val app = n => f => f(n); app(42)(x => x) */)
// NumT
infer(/* val id = x => x; val n = id(42); val b = id(true); b */)
// BoolT
infer(/* x => { val z = x; z } */)
// ArrowT(VarT(0),VarT(0))
infer(/* x => x(x) */)
// error: Cannot unify ...
```

`x => { val z = x; z }`의 결과 `ArrowT(VarT(0),VarT(0))`은 `T0 => T0`, 즉 앞에서 말한 올바른 타입입니다.

## 정리

- **타입 추론**은 타입 표기 없이 식의 타입을 자동으로 알아내는 과정입니다. 모르는 타입마다 **타입 변수**를 도입하고, 식을 훑으며 **타입 제약**을 모으고, 제약을 만족하는 **해**를 찾습니다.
- `TIFAE`는 `TRFAE`에 타입 추론을 더한 언어입니다. 타입 규칙은 \\(\Gamma, \psi \vdash e : \tau, \psi\\) 꼴이고, 타입 검사기 `typeCheck`는 해를 받아 갱신한 해를 함께 돌려줍니다. 해는 타입 변수에서 타입 또는 \\(\bullet\\)(아직 풀리지 않음)으로 가는 사상입니다.
- 함수 정의는 매개변수를 위해, 재귀 함수는 매개변수와 반환 타입을 위해, 함수 적용은 결과 타입을 위해 **새 타입 변수**를 만듭니다.
- **타입 단일화** `unify`는 두 타입이 같아지도록 해를 갱신하고, 불가능하면 실패합니다. 먼저 `resolve`로 두 타입을 **해소**해 별칭을 처리하고, 타입 변수를 정할 때는 `occurs`로 **출현 검사**를 해서 재귀 타입이 필요한 제약을 거부합니다.
- **let-다형성**: `val`로 정의한 식의 타입은 `gen`으로 **일반화**해 **타입 스킴**으로 만들고, 식별자를 쓸 때마다 `inst`로 새 타입 변수를 넣어 **인스턴스화**합니다. 타입 환경에 나타나는 자유 타입 변수는 일반화하지 않습니다.
- 타입 스킴은 맨 바깥에만 \\(\forall\\)를 허용하는 제한된 다형 타입이며, `TIFAE`의 타입이 아니라 타입 환경 안에서만 쓰입니다.
- 인터프리터와 실행 의미는 `TRFAE`와 같습니다.

## 연습 문제

1. 다음 식의 타입을 예제처럼 표(살펴보는 부분식, 타입, 제약, 타입 환경, 해)를 그리며 손으로 추론해 보세요.
   - `f => x => f(f(x))`
   - `def fact(n) = if (n < 1) 1 else n * fact(n + -1); fact(5)`
   - `val k = x => y => x; k(1)(true)`
2. `x => x + true`와 `x => x(x)`는 둘 다 타입 오류입니다. 각각 `unify`의 어느 단계에서 왜 실패하는지 설명해 보세요.
3. 다음 두 식 중 어느 쪽이 타입 검사를 통과하나요? 이유를 일반화와 인스턴스화를 써서 설명해 보세요.
   - `val f = x => x; f(f)(1)`
   - `(f => f(f)(1))(x => x)`
4. `x => { val z = x; z + 1 }`의 타입을 추론해 보세요. `z`를 정의할 때 `gen`이 무엇을 돌려주는지, 마지막에 `x`의 타입이 어떻게 정해지는지 따라가 보세요.
5. 이 장에서는 \\(\mathtt{gen}\\)과 \\(\mathtt{inst}\\)를 수식으로만 정의했습니다. 수식을 보고 Scala 함수 `gen(ty: Type, tenv: TypeEnv, sol: Solution): TypeScheme`, `free`, `inst(scheme: TypeScheme, sol: Solution): (Type, Solution)`을 구현해 보세요. `inst`에서 새 타입 변수를 여러 개 만들 때 `newTypeVar`를 어떻게 이어 부르면 되는지도 생각해 보세요.
6. (과제 `TIFAE`) 과목 과제 `tifae`의 `typeCheck`와 `interp` 함수를 구현해 보세요. `typeCheck`는 이 장의 규칙을, `interp`는 [`TRFAE`](./typing-recursive-functions.md)의 의미를 그대로 따르면 됩니다.

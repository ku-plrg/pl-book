# 타입 시스템

1부에서 우리는 컨티뉴에이션까지 포함해 다양한 언어를 설계하고, 그 인터프리터를 Scala로 구현했습니다. 이제 2부에서는 **타입 시스템**(type system)을 공부합니다. 앞으로 [타입 있는 언어](./typed-languages.md), [재귀 함수의 타입](./typing-recursive-functions.md), [대수적 데이터 타입](./algebraic-data-types.md), [매개변수 다형성](./parametric-polymorphism.md), [서브타입 다형성](./subtype-polymorphism.md), [타입 추론](./type-inference.md)을 차례로 다룰 예정입니다.

그 첫 장인 이번 장에서는 구체적인 언어를 만들기 전에 한 걸음 물러서서 **왜** 타입 시스템이 필요한지, 그리고 타입, 타입 오류, 타입 검사, 타입 안전성 같은 **기본 개념**이 무엇인지 정리합니다. 그 과정에서 프로그램 분석의 두 갈래인 동적 분석과 정적 분석, 그리고 분석의 건전성과 완전성이라는 중요한 개념도 함께 만나게 됩니다.

## 동기: 안전한 언어 시스템

### 실행 중 오류

지금까지 우리는 다양한 프로그래밍 언어를 다음 두 가지로 설계했습니다.

- **문법**(syntax): 프로그램의 구조를 정의하는 문법 규칙
- **의미**(semantics): 프로그램의 뜻을 정의하는 규칙들

그리고 프로그램을 받아 결과를 내는 **인터프리터**를 Scala로 구현했습니다.

<div style="text-align:center">
<svg viewBox="0 0 420 190" width="100%" style="max-width: 420px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-ts1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="60" y="52" text-anchor="middle" fill="currentColor" font-weight="bold"><tspan font-style="italic" font-family="serif" font-weight="normal">P</tspan></text>
<text x="60" y="70" text-anchor="middle" fill="currentColor" font-weight="bold">Program</text>
<polyline points="100,64 138,64" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts1)"/>
<rect rx="3" x="140" y="40" width="140" height="48" fill="#2a408e"/>
<text x="210.0" y="69.0" text-anchor="middle" fill="#fff">Interpreter</text>
<polyline points="280,64 318,64" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts1)"/>
<text x="360" y="70" text-anchor="middle" fill="currentColor" font-weight="bold">Result</text>
<text x="60" y="147" text-anchor="middle" fill="currentColor" font-weight="bold"><tspan font-style="italic" font-family="serif" font-weight="normal">P</tspan></text>
<text x="60" y="165" text-anchor="middle" fill="currentColor" font-weight="bold">Program</text>
<polyline points="100,159 138,159" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts1)"/>
<rect rx="3" x="140" y="135" width="140" height="48" fill="#2a408e"/>
<text x="210.0" y="164.0" text-anchor="middle" fill="#fff">Compiler</text>
<polyline points="280,159 318,159" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts1)"/>
<text x="360" y="147" text-anchor="middle" fill="currentColor" font-weight="bold"><tspan font-style="italic" font-family="serif" font-weight="normal">P</tspan></text>
<text x="360" y="165" text-anchor="middle" fill="currentColor" font-weight="bold">Program</text>
</svg>
</div>

인터프리터가 프로그램을 받아 결과를 내는 것과 달리, [앞 장](./compiling-with-continuations.md)에서 본 컴파일러는 프로그램을 받아 다른 프로그램을 냅니다. 그런데 둘 중 어느 쪽도, 어떤 프로그램이 <a id="g-run-time-error"></a>**실행 중 오류**(run-time error) 없이 실행될지를 실행 전에 자동으로 **검사**해 주지는 않습니다. 예를 들어 다음 FAE 식들은 문법적으로는 올바르지만 실행하면 오류가 납니다.

```fae
/* FAE */
x * 42              // error: free identifier
0 + (x => x)        // error: cannot add a function
1(2)                // error: cannot apply a number
```

이 정도라면 "실행해 보고 고치면 되지" 하고 넘어갈 수도 있습니다. 하지만 중요한 소프트웨어에서 예상하지 못한 실행 중 오류가 나면 이야기가 달라집니다.

- **로켓(Ariane 5, 1996)**: 첫 비행에서 이륙 약 37초 만에 궤도를 벗어나 자폭했습니다. 관성 기준 장치에서 64비트 부동소수점 값을 16비트 부호 있는 정수로 변환하다가 오버플로가 났기 때문입니다. Ariane 4의 코드를 그대로 재사용했는데, Ariane 5는 속도 값이 훨씬 커서 범위를 넘어선 것입니다.
- **보안(Heartbleed, 2014)**: OpenSSL의 Heartbeat 확장이 공격자가 보낸 길이 값을 경계 검사 없이 `memcpy()`에 넘겼습니다. 1바이트를 보내면서 "64KB"라고 주장하면 서버가 주변 메모리 64KB를 함께 돌려주었고, 그 안에는 개인 키나 비밀번호가 들어 있을 수 있었습니다. 이 버그는 약 2년 동안 아무도 모른 채 노출되어 있었습니다.
- **전 세계 IT (CrowdStrike, 2024)**: 보안 소프트웨어가 입력 필드 20개를 기대했는데 배포된 설정 파일에는 21개가 있었습니다. 이 개수 불일치가 배열 범위를 벗어난 메모리 읽기로 이어져 약 850만 대의 Windows 컴퓨터가 부팅되지 않았습니다. 21번째 필드를 실제로 쓰는 경우에 대한 테스트가 없어서 테스트로는 잡히지 않았습니다.
- **클라우드(Cloudflare, 2025)**: 설정 파일의 크기가 예상의 두 배를 넘자 파싱 코드가 오류(`Err`)를 돌려주었는데, 호출하는 쪽이 Rust의 `.unwrap()`으로 처리하는 바람에 프로그램이 그대로 멈춰 버렸습니다. Rust의 `Result` 타입은 실패할 수 있다는 사실을 타입에 드러내 처리하도록 강제하지만, `.unwrap()`은 그 정보를 버리고 실행 중 오류로 미룹니다. 타입 시스템의 보장은 프로그래머가 스스로 포기하지 않는 데까지만 유효하다는 것을 보여 주는 사례입니다.

그렇다면 이런 오류를 어떻게 **막을** 수 있을까요? 프로그램에 실행 중 오류가 없는지를 **자동으로** 검사할 수는 없을까요?

### 실행 중 오류 찾기

실행 중 오류를 찾는 데는 여러 가지 **분석** 기법을 쓸 수 있습니다. <a id="g-analyzer"></a>**분석기**(analyzer)는 프로그램을 입력으로 받아 그 프로그램이 어떤 성질을 갖는지 판단하는 프로그램입니다. 여기서 관심 있는 성질은 "실행 중 오류가 있는가"입니다.

<div style="text-align:center">
<svg viewBox="0 0 560 100" width="100%" style="max-width: 560px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-ts2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="50" y="48" text-anchor="middle" fill="currentColor" font-weight="bold"><tspan font-style="italic" font-family="serif" font-weight="normal">P</tspan></text>
<text x="50" y="66" text-anchor="middle" fill="currentColor" font-weight="bold">Program</text>
<polyline points="90,60 128,60" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts2)"/>
<rect rx="3" x="130" y="36" width="140" height="48" fill="#2a408e"/>
<text x="200.0" y="65.0" text-anchor="middle" fill="#fff">Analyzer</text>
<polyline points="270,60 298,60" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts2)"/>
<rect rx="3" x="300" y="36" width="140" height="48" fill="#2a408e"/>
<text x="370.0" y="65.0" text-anchor="middle" fill="#fff">Interpreter</text>
<polyline points="440,60 478,60" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-ts2)"/>
<text x="515" y="66" text-anchor="middle" fill="currentColor" font-weight="bold">Result</text>
</svg>
</div>

분석 기법은 크게 두 무리로 나눌 수 있습니다.

- <a id="g-dynamic-analysis"></a>**동적 분석**(dynamic analysis): 프로그램을 **실행해서** 분석합니다.
- <a id="g-static-analysis"></a>**정적 분석**(static analysis): 프로그램을 **실행하지 않고** 분석합니다.

### 동적 분석과 정적 분석

다음 Scala 함수를 두 방법으로 분석해 봅시다.

```scala
def abs(x: Int): Int = { /* L1 */
  if (x < 0)             /* L2 */
    -x                   /* L3 */
  else                   /* L4 */
    x                    /* L5 */
}                        /* L6 */
```

**동적 분석**은 입력을 하나 골라 실제로 실행하면서 각 줄에서 값이 어떻게 되는지 관찰합니다. 입력이 `-5`이면 L1, L2를 지나 L3에서 `5`가 되고 L6에서 `5`를 돌려줍니다. 입력을 `42`, `-7`, `99`, `0`으로 바꿔 가며 계속 실행하면 다음과 같은 표를 얻습니다.

| | `-5` | `42` | `-7` | `99` | `0` | ... |
|---|---:|---:|---:|---:|---:|---|
| L1 | -5 | 42 | -7 | 99 | 0 | ... |
| L2 | -5 | | -7 | | | ... |
| L3 | 5 | | 7 | | | ... |
| L4 | | 42 | | 99 | 0 | ... |
| L5 | | 42 | | 99 | 0 | ... |
| L6 | 5 | 42 | 7 | 99 | 0 | ... |

동적 분석으로는 **입력 하나하나**에 대한 프로그램의 **동작**을 쉽게 알 수 있습니다. 하지만 **모든 입력**에 대해 가능한 **모든 동작**을 알아내기는 **어렵습니다**. `Int`만 해도 값이 40억 개가 넘으니까요.

**정적 분석**은 프로그램을 실행하지 않고, 구체적인 값 대신 값의 **성질**만 추적합니다. 이를 위해 정수에 대한 <a id="g-abstract-domain"></a>**추상 도메인**(abstract domain) \\(\mathbb{D}\\)를 다음과 같이 정의합니다.

\\[
\begin{array}{lll}
\bot = \varnothing &
\top = \mathbb{Z} \\\\
\texttt{0} = \\{ 0 \\} &
\texttt{-} = \\{ x \in \mathbb{Z} \mid x < 0 \\} &
\texttt{+} = \\{ x \in \mathbb{Z} \mid x > 0 \\} \\\\
\texttt{-0} = \texttt{-} \cup \texttt{0} &
\texttt{-+} = \texttt{-} \cup \texttt{+} &
\texttt{0+} = \texttt{0} \cup \texttt{+}
\end{array}
\\]

이 여덟 원소는 포함 관계에 따라 맨 아래 \\(\bot\\)부터 \\(\texttt{-}\\), \\(\texttt{0}\\), \\(\texttt{+}\\)를 거쳐 \\(\texttt{-0}\\), \\(\texttt{-+}\\), \\(\texttt{0+}\\), 그리고 맨 위 \\(\top\\)까지 정육면체 모양으로 늘어섭니다. 선으로 이어진 두 원소 중 위쪽이 아래쪽을 포함합니다.

<div style="text-align:center">
<svg viewBox="0 0 300 250" width="100%" style="max-width: 260px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-lat" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<polyline points="137.6,40.1 82.4,84.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="150.0,46.0 150.0,79.0" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="162.4,40.1 217.6,84.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="70.0,111.0 70.0,144.0" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="82.4,105.1 137.6,149.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="137.6,105.1 82.4,149.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="162.4,105.1 217.6,149.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="217.6,105.1 162.4,149.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="230.0,111.0 230.0,144.0" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="82.4,170.1 137.6,214.9" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="150.0,176.0 150.0,209.0" fill="none" stroke="currentColor" stroke-width="2"/>
<polyline points="217.6,170.1 162.4,214.9" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="150" y="36" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18">⊤</text>
<text x="70" y="101" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18" font-family="monospace">-0</text>
<text x="150" y="101" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18" font-family="monospace">-+</text>
<text x="230" y="101" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18" font-family="monospace">0+</text>
<text x="70" y="166" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18" font-family="monospace">-</text>
<text x="150" y="166" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18" font-family="monospace">0</text>
<text x="230" y="166" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18" font-family="monospace">+</text>
<text x="150" y="231" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="18">⊥</text>
</svg>
</div>

이제 `abs`를 이 도메인으로 분석해 봅시다.

| | 추상 값 |
|---|---|
| L1 | \\(\top\\) |
| L2 | \\(\texttt{-}\\) |
| L3 | \\(\texttt{+}\\) |
| L4 | \\(\texttt{0+}\\) |
| L5 | \\(\texttt{0+}\\) |
| L6 | \\(\texttt{0+}\\) |

처음에 `x`는 아무 정수나 될 수 있으므로 \\(\top\\)입니다. `x < 0`이 참인 갈래(L2)에서 `x`는 \\(\texttt{-}\\)이고, 음수를 부정하면 \\(\texttt{+}\\)가 됩니다(L3). 거짓인 갈래(L4, L5)에서 `x`는 \\(\texttt{0+}\\)입니다. 두 갈래가 합쳐지는 L6에서는 \\(\texttt{+}\\)와 \\(\texttt{0+}\\)를 모두 포함하는 가장 작은 원소인 \\(\texttt{0+}\\)가 됩니다. 이렇게 해서 `Int`를 수학의 정수 \\(\mathbb{Z}\\)로 본다면 `abs`가 **언제나** 음이 아닌 정수(\\(\texttt{0+}\\))를 돌려준다는 것을 **증명**할 수 있습니다. 입력을 하나도 실행해 보지 않고 모든 입력에 대한 결론을 얻은 것입니다.

> **생각해 보기.** 실제 Scala의 `Int`는 수학의 정수가 아닙니다. `abs(-2147483648)`은 무엇을 돌려줄까요? 분석이 "`Int`를 \\(\mathbb{Z}\\)로 본다면"이라는 가정을 단 이유가 여기에 있습니다.

### 건전성과 완전성

분석 결과를 얼마나 믿을 수 있을지 이야기하려면 두 개념이 필요합니다. 먼저 논리에서 쓰는 기호를 빌려 옵니다.

- \\(\vdash \psi\\)는 명제 \\(\psi\\)가 <a id="g-provable"></a>**증명 가능하다**(provable)는 뜻입니다.
- \\(\vDash \psi\\)는 명제 \\(\psi\\)가 **참이다**(true)는 뜻입니다.

**건전한**(sound) 증명 체계에서는 증명할 수 있는 명제가 모두 참입니다. 이 성질을 <a id="g-soundness"></a>**건전성**(soundness)이라고 합니다.

\\[
\vdash \psi \qquad \Longrightarrow \qquad \vDash \psi
\\]

**완전한**(complete) 증명 체계에서는 참인 명제를 모두 증명할 수 있습니다. 이 성질을 <a id="g-completeness"></a>**완전성**(completeness)이라고 합니다.

\\[
\vDash \psi \qquad \Longrightarrow \qquad \vdash \psi
\\]

분석 기법은 프로그램에 **오류가 없음**(error-free)을 증명하는 도구로 볼 수 있습니다.

- \\(\vdash P\\)는 프로그램 \\(P\\)가 오류가 없다고 **분석되었다**는 뜻입니다.
- \\(\vDash P\\)는 프로그램 \\(P\\)에 **실제로** 오류가 없다는 뜻입니다.

그렇다면 동적 분석과 정적 분석은 건전할까요, 완전할까요? 그림으로 생각해 봅시다. 어떤 프로그램이 실행 중에 도달할 수 있는 **가능한 상태**들의 집합이 있고, 그와 별개로 **오류 상태**들의 집합이 있다고 합시다. 두 집합이 겹치면 그 프로그램에는 실행 중 오류가 있습니다.

**동적 분석**은 가능한 상태 중 몇 개의 점을 실제로 실행해서 찍어 보는 것과 같습니다.

- 찍은 점이 오류 상태 안에 있으면, 그것은 실제로 일어나는 오류이므로 <a id="g-true-alarm"></a>**진짜 경보**(true alarm), 즉 <a id="g-true-positive"></a>**참 양성**(true positive, TP)입니다. 오류가 없는 프로그램에서 오류를 보고하는 일은 없습니다.
- 하지만 찍지 않은 곳에 오류 상태가 숨어 있을 수 있습니다. 이렇게 **오류를 놓치는 것**을 <a id="g-false-negative"></a>**거짓 음성**(false negative, FN)이라고 합니다.

그래서 동적 분석은 일반적으로 **완전하지만 건전하지 않습니다**. "오류를 못 찾았다"는 것이 "오류가 없다"는 증명이 되지 못합니다.

**정적 분석**은 가능한 상태 전체를 **빠짐없이 덮는** 더 큰 영역을 계산하는 것과 같습니다. `abs` 예에서 \\(\texttt{0+}\\)가 실제 결과값들을 모두 포함했던 것처럼 말입니다.

- 덮은 영역이 오류 상태와 겹치면 경보를 냅니다. 실제 상태가 오류와 겹쳐서 낸 경보라면 참 양성입니다.
- 하지만 덮은 영역은 실제보다 크기 때문에, 실제 상태는 오류와 겹치지 않는데 덮은 영역의 **여분**만 겹칠 수도 있습니다. 이것이 <a id="g-false-alarm"></a>**거짓 경보**(false alarm), 즉 <a id="g-false-positive"></a>**거짓 양성**(false positive, FP)입니다.
- 반대로 덮은 영역이 오류 상태와 전혀 겹치지 않으면, 실제 상태도 당연히 겹치지 않습니다. **놓치는 오류가 없으므로** 프로그램에 오류가 없음을 **증명**할 수 있습니다.

그래서 정적 분석은 일반적으로 **건전하지만 완전하지 않습니다**. 아래 그림은 세 가지 상황을 한눈에 보여 줍니다. 회색 별 모양이 가능한 상태, 붉은 타원이 오류 상태, 파란 점이 동적 분석으로 실행해 본 상태, 파란 팔각형이 정적 분석이 덮은 영역입니다. \\(P_1\\)에서 동적 분석은 오류 하나를 찾았지만(참 양성) 다른 하나를 놓쳤고(거짓 음성), \\(P_2\\)에서 정적 분석은 진짜 오류와 함께 거짓 경보도 냈으며, \\(P_3\\)에서는 덮은 영역이 오류 상태와 겹치지 않아 오류가 없음을 증명했습니다.

<div style="text-align:center">
<svg viewBox="0 0 900 340" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="동적 분석과 정적 분석: P1에서 동적 분석은 오류 하나를 찾고 하나를 놓치며, P2에서 정적 분석은 진짜 경보와 거짓 경보를 내고, P3에서는 오류 없음을 증명한다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="18" fill="currentColor">
<polygon points="30.0,12.0 33.4,19.7 41.3,16.7 38.3,24.6 46.0,28.0 38.3,31.4 41.3,39.3 33.4,36.3 30.0,44.0 26.6,36.3 18.7,39.3 21.7,31.4 14.0,28.0 21.7,24.6 18.7,16.7 26.6,19.7" fill="currentColor" fill-opacity="0.55"/><text x="54" y="34">가능한 상태</text>
<ellipse cx="250" cy="28" rx="20" ry="14" fill="#e8706a" fill-opacity="0.65"/><text x="278" y="34">오류 상태</text>
<circle cx="450" cy="22" r="4" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="450" cy="34" r="4" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="461" cy="22" r="4" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="461" cy="34" r="4" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="472" cy="22" r="4" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="472" cy="34" r="4" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<text x="490" y="34">동적 분석</text>
<polygon points="691.6,34.9 681.9,44.6 668.1,44.6 658.4,34.9 658.4,21.1 668.1,11.4 681.9,11.4 691.6,21.1" fill="#2f4fb8" fill-opacity="0.4"/><text x="702" y="34">정적 분석</text>
<polygon points="115.0,125.0 134.1,163.8 175.1,149.9 161.2,190.9 200.0,210.0 161.2,229.1 175.1,270.1 134.1,256.2 115.0,295.0 95.9,256.2 54.9,270.1 68.8,229.1 30.0,210.0 68.8,190.9 54.9,149.9 95.9,163.8" fill="currentColor" fill-opacity="0.55"/>
<ellipse cx="200" cy="160" rx="75" ry="58" fill="#e8706a" fill-opacity="0.65"/>
<circle cx="70" cy="175" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="70" cy="205" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="70" cy="235" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="100" cy="175" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="100" cy="205" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="100" cy="235" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="130" cy="175" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="130" cy="205" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<circle cx="130" cy="235" r="8" fill="#2a408e" stroke="currentColor" stroke-width="1"/>
<path d="M148,188 L162,202 M148,202 L162,188" stroke="currentColor" stroke-width="3.5"/>
<polygon points="573.5,252.9 512.9,313.5 427.1,313.5 366.5,252.9 366.5,167.1 427.1,106.5 512.9,106.5 573.5,167.1" fill="#2f4fb8" fill-opacity="0.4"/>
<polygon points="470.0,135.0 487.2,168.4 523.0,157.0 511.6,192.8 545.0,210.0 511.6,227.2 523.0,263.0 487.2,251.6 470.0,285.0 452.8,251.6 417.0,263.0 428.4,227.2 395.0,210.0 428.4,192.8 417.0,157.0 452.8,168.4" fill="currentColor" fill-opacity="0.55"/>
<ellipse cx="510" cy="150" rx="72" ry="56" fill="#e8706a" fill-opacity="0.65"/>
<path d="M433,183 L447,197 M433,197 L447,183" stroke="currentColor" stroke-width="3.5"/>
<path d="M535,138 L549,152 M535,152 L549,138" stroke="currentColor" stroke-width="3.5"/>
<polygon points="865.0,260.2 815.2,310.0 744.8,310.0 695.0,260.2 695.0,189.8 744.8,140.0 815.2,140.0 865.0,189.8" fill="#2f4fb8" fill-opacity="0.4"/>
<polygon points="780.0,159.0 795.3,188.0 826.7,178.3 817.0,209.7 846.0,225.0 817.0,240.3 826.7,271.7 795.3,262.0 780.0,291.0 764.7,262.0 733.3,271.7 743.0,240.3 714.0,225.0 743.0,209.7 733.3,178.3 764.7,188.0" fill="currentColor" fill-opacity="0.55"/>
<ellipse cx="850" cy="105" rx="38" ry="30" fill="#e8706a" fill-opacity="0.65"/>
<text x="745" y="92" text-anchor="middle" font-weight="bold">오류 없음</text><text x="745" y="114" text-anchor="middle" font-weight="bold">증명</text>
<path d="M130,175 Q170,95 238,86" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/>
<path d="M352,86 Q420,90 440,183" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/>
<text x="295" y="84" text-anchor="middle" font-weight="bold">참 양성</text><text x="295" y="106" text-anchor="middle">(진짜 경보)</text>
<path d="M162,195 Q235,190 262,252" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/>
<text x="262" y="276" text-anchor="middle" font-weight="bold">거짓 음성</text><text x="262" y="298" text-anchor="middle">(놓친 오류)</text>
<path d="M550,145 Q620,160 622,248" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/>
<text x="622" y="276" text-anchor="middle" font-weight="bold">거짓 양성</text><text x="622" y="298" text-anchor="middle">(거짓 경보)</text>
<text x="115" y="334" text-anchor="middle" font-family="serif" font-style="italic" font-size="20">P₁</text>
<text x="470" y="334" text-anchor="middle" font-family="serif" font-style="italic" font-size="20">P₂</text>
<text x="780" y="334" text-anchor="middle" font-family="serif" font-style="italic" font-size="20">P₃</text>
</svg>
</div>

정리하면 다음과 같습니다.

| | 동적 분석 | 정적 분석 |
|---|---|---|
| 일반적인 성질 | 완전, 건전하지 않음 | 건전, 완전하지 않음 |
| 보고한 오류 | <a id="g-tp"></a>모두 진짜(TP) | 거짓 경보가 섞일 수 있음(FP) |
| 놓치는 오류 | 있을 수 있음(FN) | 없음 |
| 오류 없음의 증명 | 불가능 | 가능 |

> **자주 하는 실수.** "건전하다"를 "오류를 정확하게 찾는다"로 오해하기 쉽습니다. 오류가 없음을 증명하는 관점에서 건전한 분석은 **오류를 하나도 놓치지 않는** 분석입니다. 그 대가로 거짓 경보를 낼 수 있습니다.

## 타입 시스템

정적 분석은 강력하지만 일반적으로 만들기 어렵습니다. 타입 시스템은 그중에서도 **가볍고 실용적인** 정적 분석입니다. 그 기본 개념을 하나씩 정의해 봅시다.

### 타입

> **정의(타입).** <a id="g-type"></a>**타입**(type)은 값의 집합입니다.

예를 들어 Scala의 `Int`, `Boolean`, `Int => Int` 타입은 다음과 같은 값의 집합입니다.

\\[
\begin{array}{lcl}
\texttt{Int} &=& \\{ n \in \mathbb{Z} \mid -2^{31} \leq n < 2^{31} \\} \\\\
\texttt{Boolean} &=& \\{ \texttt{true}, \texttt{false} \\} \\\\
\texttt{Int => Int} &=& \\{ f \mid f \text{ is a function from } \texttt{Int} \text{ to } \texttt{Int} \\}
\end{array}
\\]

```scala
val n: Int = 42             // 42   : Int
n + 1                       // 43   : Int
val b: Boolean = n > 10     // true : Boolean
def f(x: Int): Int = x + 1  // f    : Int => Int
f(42)                       // 43   : Int
```

앞에서 본 추상 도메인과 비교해 보면, 타입도 결국 값들을 묶은 **추상 값**이라는 점을 알 수 있습니다. \\(\texttt{0+}\\)가 음이 아닌 정수의 집합이었듯이, `Int`는 32비트 정수의 집합입니다.

### 타입 오류

> **정의(타입 오류).** <a id="g-type-error"></a>**타입 오류**(type error)는 프로그램이 기대하는 타입과 **맞지 않는** 타입의 값을 사용하려 할 때 일어납니다.

예를 들어 다음 Scala 프로그램에는 타입 오류가 있습니다.

```scala
42 + true           // `Int` expected for `+`, but `Boolean` found
if (1) 2 else 3     // `Boolean` expected for `if`, but `Int` found
def f(x: Int): Int = x + 1
f(false)            // `Int` expected for `f`, but `Boolean` found
```

하지만 모든 **실행 중 오류**가 **타입 오류**인 것은 아닙니다.

```scala
42 / 0              // `ArithmeticException` at run-time
case class A(k: Int)
val x: A = null
x.k                 // `NullPointerException` at run-time
```

`0`은 `Int`가 기대되는 자리에 놓인 `Int`이고, `null`도 Scala에서는 `A` 타입의 값으로 허용됩니다. 그러니 이들은 타입은 맞지만 다른 이유로 실패하는 오류입니다.

### 타입 검사

식 \\(e\\)가 다음 중 하나에 해당하면 "식 \\(e\\)의 타입은 \\(\tau\\)이다"라고 말합니다.

- \\(e\\)가 타입 \\(\tau\\)의 값으로 계산되거나,
- \\(e\\)의 계산이 끝나지 않거나,
- \\(e\\)가 타입 오류가 **아닌** 실행 중 오류를 냅니다.

이때 다음과 같이 쓰고, \\(e\\)는 <a id="g-well-typed"></a>**타입이 맞는다**(well-typed)고 합니다.

\\[
\vdash e : \tau
\\]

두 번째와 세 번째 경우가 들어 있다는 점에 주목합시다. 타입은 "타입 오류는 일어나지 않는다"는 것만 약속할 뿐, 계산이 반드시 끝난다거나 `42 / 0` 같은 오류가 없다는 것까지 약속하지는 않습니다.

> **정의(타입 검사).** <a id="g-type-checking"></a>**타입 검사**(type checking)는 주어진 식 \\(e\\)가 타입이 맞는지 검사하는 정적 분석입니다. **타입 검사기**(type checker)는 \\(e\\)가 타입이 맞으면 그 **타입**을 돌려주고, 그렇지 않으면 \\(e\\)를 거부하고 발견한 **타입 오류**를 보고합니다.

<div style="text-align:center">
<svg viewBox="0 0 620 190" width="100%" style="max-width: 620px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-tc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="100" y="40" width="140" height="62" fill="#2a408e"/>
<text x="170.0" y="67.0" text-anchor="middle" fill="#fff">Type</text>
<text x="170.0" y="85.0" text-anchor="middle" fill="#fff">Checker</text>
<polyline points="240,52 500,52" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc)"/>
<text x="270" y="44" text-anchor="start" fill="currentColor" font-weight="bold">Reject</text>
<text x="510" y="57" text-anchor="start" fill="currentColor" font-weight="bold">TypeError</text>
<polyline points="240,92 500,92" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc)"/>
<text x="270" y="84" text-anchor="start" fill="currentColor" font-weight="bold">Accept</text>
<text x="510" y="97" text-anchor="start" fill="currentColor" font-weight="bold">Type</text>
<polyline points="320,92 320,126 368,126" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc)"/>
<text x="40" y="152" text-anchor="middle" fill="currentColor" font-weight="bold"><tspan font-style="italic" font-family="serif" font-weight="normal">P</tspan></text>
<text x="40" y="170" text-anchor="middle" fill="currentColor" font-weight="bold">Program</text>
<polyline points="80,140 170,140 170,104" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc)"/>
<polyline points="80,164 368,164" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc)"/>
<rect rx="3" x="370" y="114" width="140" height="62" fill="#2a408e"/>
<text x="440.0" y="150.0" text-anchor="middle" fill="#fff">Interpreter</text>
<polyline points="510,145 540,145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc)"/>
<text x="548" y="150" text-anchor="start" fill="currentColor" font-weight="bold">Result</text>
</svg>
</div>

### 타입 안전성

> **정의(타입 안전성).** 타입 시스템이 **건전하다**(sound)는 것은, 타입이 맞는 프로그램이 실행 중에 타입 오류를 **절대** 일으키지 않는다고 보장한다는 뜻입니다. 이 성질을 <a id="g-type-soundness"></a>**타입 안전성**(type soundness)이라고 부릅니다.

타입 시스템의 관점에서 언어는 두 부류로 나눌 수 있습니다.

- <a id="g-statically-typed-language"></a>**정적 타입 언어**(statically-typed language)는 타입이 맞는 프로그램만 실행을 허락합니다. Java, Scala, Haskell, OCaml, Rust 등이 여기에 속합니다.
- <a id="g-dynamically-typed-language"></a>**동적 타입 언어**(dynamically-typed language)는 어떤 프로그램이든 실행을 허락하며, 타입은 실행 시간에만 존재합니다. Python, Ruby, JavaScript 등이 여기에 속합니다.

대부분의 정적 타입 언어는 타입 시스템이 **건전하도록** 설계됩니다.

### 타입 검사: 건전하지만 완전하지 않다

**타입 검사**도 **정적 분석**의 하나입니다. 따라서 앞에서 본 대로 일반적으로 **건전하지만 완전하지 않습니다**. 예를 들어 다음 Scala 프로그램은 타입 검사기에 의해 **거부**됩니다.

```scala
val x: Int = if (true) 42 else "hello"  // error: type mismatch
```

하지만 이 프로그램은 실행 중에 타입 오류를 **절대** 일으키지 않습니다. 조건이 항상 `true`이므로 `else` 갈래는 계산되지 않기 때문입니다. 즉, 이것은 **거짓 경보**(거짓 양성)입니다.

**건전한** 타입 검사기는 타입 오류를 결코 놓치지 않지만, 그 대가로 실행 시간에는 안전한 프로그램을 일부 **거부**할 수 있습니다. 타입 시스템을 설계한다는 것은 결국 건전성을 지키면서 이런 거짓 경보를 얼마나 줄일지 고민하는 일입니다. 2부의 나머지 장에서 보게 될 다형성, 서브타입, 타입 추론 같은 기능들도 많은 경우 "안전한데 거부되는 프로그램"을 받아들이기 위해 등장합니다.

> **생각해 보기.** 동적 타입 언어인 Python에서 `x = 42 if True else "hello"`는 아무 문제 없이 실행됩니다. 이것은 Python이 더 "똑똑해서"일까요, 아니면 무엇을 포기한 대가일까요?

## 정리

- 지금까지 만든 인터프리터는 프로그램에 **실행 중 오류**가 있는지 미리 알려 주지 못합니다. 중요한 소프트웨어에서는 이런 오류가 큰 사고로 이어집니다.
- **분석기**는 프로그램이 어떤 성질을 갖는지 판단합니다. **동적 분석**은 실행해서, **정적 분석**은 실행하지 않고 분석합니다.
- 동적 분석은 입력 하나에 대한 동작을 쉽게 알려 주지만 모든 입력을 다루기 어렵습니다. 정적 분석은 **추상 도메인**으로 값의 성질을 추적해 모든 입력에 대해 결론을 냅니다.
- **건전한** 분석은 증명한 것이 모두 참이고(\\(\vdash P \Rightarrow \vDash P\\)), **완전한** 분석은 참인 것을 모두 증명합니다(\\(\vDash P \Rightarrow \vdash P\\)). 일반적으로 동적 분석은 완전하지만 건전하지 않고(거짓 음성), 정적 분석은 건전하지만 완전하지 않습니다(거짓 양성).
- **타입**은 값의 집합이고, **타입 오류**는 기대한 타입과 맞지 않는 값을 사용할 때 일어납니다. 모든 실행 중 오류가 타입 오류는 아닙니다.
- **타입 검사**는 식이 **타입이 맞는지**(\\(\vdash e : \tau\\)) 검사하는 정적 분석입니다. 타입 시스템이 건전하면 타입이 맞는 프로그램은 타입 오류를 일으키지 않으며, 이를 **타입 안전성**이라고 합니다.
- 정적 타입 언어는 타입이 맞는 프로그램만 실행하고, 동적 타입 언어는 타입을 실행 시간에만 다룹니다. 타입 검사는 건전하지만 완전하지 않아서, 안전한 프로그램을 거부하는 거짓 경보가 있을 수 있습니다.

## 연습 문제

1. 다음 FAE 식이 각각 어떤 실행 중 오류를 내는지, 그리고 그 오류가 타입 오류라고 볼 수 있는지 설명해 보세요.

   ```pl
   /* FAE */
   (x => x(1))(2)
   (f => f + 1)(y => y)
   (x => y)(3)
   ```

2. 이 장의 추상 도메인 \\(\mathbb{D}\\)로 다음 함수를 분석해, 결과의 추상 값을 구해 보세요. 이 분석 결과로 "결과가 항상 양수"임을 증명할 수 있나요? 정확한 답과 비교해 보세요.

   ```scala
   def f(x: Int): Int = if (x < 0) x * x else x + 1
   ```

3. 동적 분석이 거짓 양성을 내지 않는 이유와, 정적 분석이 거짓 음성을 내지 않는 이유를 각각 한두 문장으로 설명해 보세요.

4. Scala에서 실행 시간에는 안전하지만 타입 검사기가 거부하는 프로그램(거짓 경보)을 이 장의 예와 다른 것으로 하나 만들어 보세요.

5. 어떤 타입 검사기가 모든 프로그램을 거부한다고 합시다. 이 타입 검사기는 건전한가요? 완전한가요? 모든 프로그램을 받아들이는 타입 검사기는 어떨까요?

6. <a id="ex-type-systems-6"></a>★ 다음 문장이 참(O)인지 거짓(X)인지 답하세요.

   (a) 정상적으로 끝나는 프로그램이 모두 타입 검사를 통과하면, 그 타입 시스템은 건전하다.

   (b) 타입 검사를 통과한 프로그램이 모두 실행 중에 타입 오류를 일으키지 않으면, 그 타입 시스템은 건전하다.

   (c) 건전한 타입 시스템은 실행 중에 타입 오류를 일으키지 않는 프로그램을 모두 받아들인다.

   (d) 건전한 타입 시스템에서 타입 검사를 통과한 프로그램은 항상 정상적으로 끝난다.

   <details><summary>힌트</summary>

   "타입 검사를 통과한다"를 \\(\vdash P\\), "실행 중에 타입 오류가 없다"를 \\(\vDash P\\)로 놓고, 각 문장이 \\(\vdash P \Rightarrow \vDash P\\)(건전성)와 \\(\vDash P \Rightarrow \vdash P\\)(완전성) 중 어느 쪽을 말하는지 따져 보세요. 타입이 맞는다는 정의에 무엇이 들어 있었는지도 다시 보세요.

   </details>

   [해답 →](./answers-2.md#ans-type-systems-6)

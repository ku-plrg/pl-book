# 선형 타입과 소유권

[쓰레기 수집](./garbage-collection.md) 장에서 우리는 메모리를 프로그래머가 직접 해제하는 **수동 메모리 관리**가 효율적이지만 위험하다는 것을 보았습니다. 해제를 잊으면 메모리 누수가, 이미 해제한 칸을 쓰면 해제 후 사용이, 같은 칸을 두 번 해제하면 이중 해제가 생깁니다. 쓰레기 수집은 이 문제를 **실행 중에** 해결하지만, 그 대가로 실행 시간과 메모리를 더 씁니다.

그렇다면 이 세 가지 실수를 **실행하기 전에**, 타입 검사기로 잡을 수는 없을까요? 이 장의 답은 "값을 몇 번 쓰는지"를 타입이 세게 하는 것입니다. 상자를 정확히 한 번만 쓸 수 있다면, 해제한 뒤에 다시 쓰는 일도(해제가 이미 그 한 번이므로), 두 번 해제하는 일도, 해제하지 않고 버리는 일도 불가능해집니다. 이런 타입을 <a id="g-linear-type"></a>**선형 타입**(linear type)이라고 부르고, Rust의 **소유권**(ownership)은 이 아이디어를 실용적으로 다듬은 것입니다.

이 장에서는 먼저 Rust의 소유권과 이동을 살펴보고, 타입 환경에 숨어 있던 **구조 규칙**을 꺼내어 선형 타입이 무엇을 금지하는지 정확히 말합니다. 그다음 [타입 있는 언어](./typed-languages.md)의 TFAE에 선형 상자를 더한 **LTFAE**를 정의하고, 인터프리터, 타입 규칙, Scala 타입 검사기를 차례로 만듭니다. 마지막으로 타입이 맞는 LTFAE 프로그램이 왜 해제 후 사용, 이중 해제, 누수를 일으키지 않는지 살펴보고, Rust의 **빌림**과 수명, 그리고 C++, Haskell, Clean의 비슷한 기능과 연결합니다.

## 동기: 타입으로 메모리 실수 막기

### 수동 메모리 관리의 세 가지 실수

[쓰레기 수집](./garbage-collection.md) 장의 C++ 예를 다시 떠올려 봅시다.

```cpp
// C++
Box* b = new Box(42);
delete b;
b->k;         // use after free
delete b;     // double free
Box* c = new Box(7);
              // c is never deleted: memory leak
```

C++ 컴파일러는 이 프로그램을 아무 불평 없이 받아들입니다. `b`의 타입은 처음부터 끝까지 `Box*`이고, 타입만 보면 `delete b` 전과 후가 전혀 다르지 않기 때문입니다. 문제는 바로 여기에 있습니다. **같은 변수가 `delete` 전에는 쓸 수 있는 상자이고 `delete` 뒤에는 쓰면 안 되는 쓰레기**인데, 타입은 이 차이를 모릅니다.

### Rust의 대답: 소유권과 이동

Rust는 이 문제를 다음 규칙으로 해결합니다.

1. 힙에 있는 값에는 그 값을 책임지는 <a id="g-owner"></a>**소유자**(owner) 변수가 **정확히 하나** 있습니다.
2. 값을 다른 변수에 대입하거나 함수에 넘기면 소유권이 <a id="g-move"></a>**이동**(move)하고, 원래 변수는 더 이상 쓸 수 없습니다.
3. 소유자가 스코프를 벗어나면 값이 자동으로 해제(drop)됩니다.

규칙 2를 어기면 컴파일 오류가 납니다.

```rust
// Rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;          // move: s1 -> s2
    println!("{}", s1);   // error
}
```

```text
error[E0382]: borrow of moved value: `s1`
 --> src/main.rs:4:20
  |
2 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
3 |     let s2 = s1;          // move: s1 -> s2
  |              -- value moved here
4 |     println!("{}", s1);   // error
  |                    ^^ value borrowed here after move
```

`String`은 힙에 문자열을 담아 두는 타입입니다. `let s2 = s1;`은 힙의 문자열을 복사하지 않고, 그 문자열을 책임질 권리만 `s1`에서 `s2`로 넘깁니다. 그 뒤로 `s1`을 쓰려 하면 "이동된 값을 빌렸다"는 오류 E0382가 납니다. 다음 그림은 이 프로그램에서 소유권이 어떻게 움직이는지를 줄 단위로 보여 줍니다.

<div style="text-align:center">
<svg viewBox="0 0 640 250" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="소유권 이동 시간표: 2행에서 s1이 힙 칸을 소유하고, 3행에서 소유권이 s2로 이동하며 s1은 쓸 수 없게 된다. 4행에서 s1을 쓰면 E0382 오류이고, 5행 스코프 끝에서 s2가 힙 칸을 해제한다" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="linear-types-m1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="150" y="24" text-anchor="middle" font-size="13">2행</text>
<text x="290" y="24" text-anchor="middle" font-size="13">3행</text>
<text x="430" y="24" text-anchor="middle" font-size="13">4행</text>
<text x="570" y="24" text-anchor="middle" font-size="13">5행</text>
<text x="150" y="44" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">let s1 = …;</text>
<text x="290" y="44" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">let s2 = s1;</text>
<text x="430" y="44" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">println!(…s1)</text>
<text x="570" y="44" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">}</text>
<line x1="150" y1="56" x2="150" y2="236" stroke="currentColor" stroke-dasharray="3 4" opacity="0.5"/>
<line x1="290" y1="56" x2="290" y2="236" stroke="currentColor" stroke-dasharray="3 4" opacity="0.5"/>
<line x1="430" y1="56" x2="430" y2="236" stroke="currentColor" stroke-dasharray="3 4" opacity="0.5"/>
<line x1="570" y1="56" x2="570" y2="236" stroke="currentColor" stroke-dasharray="3 4" opacity="0.5"/>
<text x="70" y="90" text-anchor="end" font-family="ui-monospace, Menlo, monospace">s1</text>
<text x="70" y="150" text-anchor="end" font-family="ui-monospace, Menlo, monospace">s2</text>
<text x="70" y="210" text-anchor="end">힙 칸</text>
<rect x="150" y="70" width="140" height="30" rx="3" fill="#2a408e"/>
<text x="220" y="90" text-anchor="middle" fill="#fff">소유</text>
<rect x="290" y="70" width="280" height="30" rx="3" fill="none" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="430" y="90" text-anchor="middle">이동됨: 여기서 s1을 쓰면 E0382</text>
<path d="M290,102 L290,126" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#linear-types-m1)"/>
<text x="298" y="118" font-size="13">이동</text>
<rect x="290" y="130" width="280" height="30" rx="3" fill="#2a408e"/>
<text x="430" y="150" text-anchor="middle" fill="#fff">소유</text>
<rect x="150" y="190" width="420" height="30" rx="3" fill="none" stroke="currentColor"/>
<text x="360" y="210" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">"hello"</text>
<text x="158" y="236" font-size="12">할당</text>
<text x="562" y="236" text-anchor="end" font-size="12">drop: 해제</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 힙 칸 하나에 소유자는 언제나 하나뿐입니다. 이동한 뒤의 <code>s1</code>은 이름만 남은 빈 껍데기입니다.</p>

이 규칙이 앞의 세 가지 실수를 어떻게 막는지 봅시다. Rust의 `Box<T>`는 힙에 값 하나를 담는 상자이고, `drop(b)`는 상자를 명시적으로 해제합니다. `drop`은 평범한 함수이므로 `b`의 소유권을 **가져가 버립니다**.

```rust
// Rust
fn main() {
    let b = Box::new(1);
    drop(b);              // free
    println!("{}", b);    // error[E0382]: borrow of moved value: `b`
}
```

```rust
// Rust
fn main() {
    let b = Box::new(1);
    drop(b);              // free
    drop(b);              // error[E0382]: use of moved value: `b`
}
```

해제 후 사용도 이중 해제도 결국 "이미 이동한 값을 다시 쓰는 것"이므로 같은 오류 E0382로 잡힙니다. 누수는 규칙 3이 막습니다. 소유자가 스코프를 벗어날 때 컴파일러가 해제 코드를 끼워 넣어 주기 때문입니다.

그런데 모든 값이 이동하는 것은 아닙니다. `i32` 같은 수는 대입해도 원래 변수를 계속 쓸 수 있습니다.

```rust
// Rust
fn main() {
    let x: i32 = 42;
    let y = x;            // copy, not move
    println!("{} {}", x, y);
}
```

수는 복사해도 아무 문제가 없으니 몇 번이든 써도 됩니다. 반면 힙 칸을 책임지는 값은 복사하면 소유자가 둘이 되어 이중 해제가 생기므로 한 번만 써야 합니다. 즉 Rust는 타입마다 **몇 번 쓸 수 있는지**를 구별합니다. 오류 메시지의 "does not implement the `Copy` trait"가 바로 이 구별입니다.

> **생각해 보기.** [타입 있는 언어](./typed-languages.md)의 TFAE 타입 규칙으로는 왜 `let s2 = s1;` 뒤의 `s1` 사용을 막을 수 없을까요? \\(\tau\texttt{-Id}\\) 규칙은 \\(x\\)가 \\(\Gamma\\)에 있기만 하면 몇 번이든 그 타입을 꺼내 줍니다. 타입 환경 \\(\Gamma\\)는 한 번 붙은 변수를 절대 잊지 않습니다.

이 질문이 이 장의 출발점입니다. 변수를 "몇 번 쓰는지"를 타입 시스템이 세려면, 타입 환경을 다루는 방식 자체를 바꿔야 합니다.

## 구조 규칙과 부분구조적 타입 시스템

### 타입 환경에 숨어 있던 세 규칙

TFAE의 타입 규칙에는 명시적으로 적혀 있지 않지만 늘 성립하던 세 가지 성질이 있습니다. 논리학에서는 이것을 <a id="g-structural-rule"></a>**구조 규칙**(structural rule)이라고 부릅니다.

- <a id="g-weakening"></a>**약화**(weakening): 쓰지 않는 변수를 타입 환경에 더해도 됩니다. \\(\Gamma \vdash e : \tau\\)이면 \\(\Gamma[x : \tau'] \vdash e : \tau\\)입니다.
- <a id="g-contraction"></a>**축약**(contraction): 같은 타입의 변수 두 개를 하나로 합쳐도 됩니다. \\(\Gamma[x : \tau'][y : \tau'] \vdash e : \tau\\)이면 \\(\Gamma[x : \tau'] \vdash e[y := x] : \tau\\)입니다. 다시 말해 한 변수를 여러 번 써도 됩니다.
- <a id="g-exchange"></a>**교환**(exchange): 타입 환경 안에서 변수의 순서를 바꿔도 됩니다.

여기서 \\(e[y := x]\\)는 \\(e\\) 안의 \\(y\\)를 모두 \\(x\\)로 바꾼 식입니다. 이 세 성질은 TFAE의 규칙 어디에 숨어 있었을까요?

- 약화는 \\(\tau\texttt{-Id}\\)와 \\(\tau\texttt{-Num}\\)에 숨어 있습니다. \\(\Gamma \vdash x : \Gamma(x)\\)는 \\(\Gamma\\)에 \\(x\\) 말고 다른 변수가 얼마나 많든 상관하지 않습니다. 그래서 `val y = 1; 42`처럼 `y`를 한 번도 쓰지 않아도 됩니다.
- 축약은 \\(\tau\texttt{-Add}\\)처럼 전제가 둘 이상인 규칙에 숨어 있습니다. 두 전제에 **같은** \\(\Gamma\\)를 넘겨주므로 `x + x`처럼 양쪽에서 같은 변수를 쓸 수 있습니다.
- 교환은 \\(\Gamma\\)를 순서 없는 매핑 `Map[String, Type]`으로 정의한 데서 이미 성립합니다.

앞의 메모리 실수를 이 언어로 바꿔 말하면 다음과 같습니다. 상자 변수에 **축약**을 허락하면 같은 상자를 두 번 쓸 수 있으니 해제 후 사용과 이중 해제가 생기고, **약화**를 허락하면 상자를 한 번도 쓰지 않고 버릴 수 있으니 누수가 생깁니다.

### 구조 규칙을 빼면 생기는 타입 시스템들

구조 규칙의 일부를 허락하지 않는 타입 시스템을 <a id="g-substructural-type-system"></a>**부분구조적 타입 시스템**(substructural type system)이라고 부릅니다. 어떤 규칙을 빼느냐에 따라 다음과 같이 나뉩니다.

| 타입 시스템 | 약화 | 축약 | 교환 | 변수 사용 횟수 | 예 |
|---|---|---|---|---|---|
| 비제한 | O | O | O | 몇 번이든 | TFAE, 보통의 언어 |
| 아핀 | O | X | O | 많아야 한 번 | Rust의 소유권 |
| 관련 | X | O | O | 적어도 한 번 | |
| 선형 | X | X | O | 정확히 한 번 | Linear Haskell, LTFAE |
| 순서 | X | X | X | 정확히 한 번, 들어온 순서대로 | 스택처럼 쓰는 자원 |

<a id="g-unrestricted"></a>**비제한**(unrestricted) 타입 시스템은 지금까지 본 모든 타입 시스템입니다. <a id="g-affine-type"></a>**아핀 타입**(affine type)은 축약을 금지해 "많아야 한 번" 쓰게 합니다. 한 번도 안 쓰고 버리는 것은 괜찮습니다. Rust가 바로 이 모델입니다. 앞의 Rust 예에서 `s2`를 한 번도 쓰지 않았는데 오류가 아니라 경고만 났던 것을 떠올려 보세요. <a id="g-relevant-type"></a>**관련 타입**(relevant type)은 반대로 약화만 금지해 "적어도 한 번" 쓰게 합니다. **선형 타입**은 둘 다 금지해 "정확히 한 번" 쓰게 합니다. <a id="g-ordered-type"></a>**순서 타입**(ordered type)은 교환까지 금지해서, 변수를 타입 환경에 들어온 순서대로 정확히 한 번씩 쓰게 합니다. 스택에 쌓은 자원을 거꾸로 꺼내는 것 같은 상황을 표현할 수 있습니다.

<div style="text-align:center">
<svg viewBox="0 0 600 350" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="부분구조적 타입 시스템의 관계: 비제한에서 축약을 없애면 아핀, 약화를 없애면 관련, 아핀에서 약화를 없애거나 관련에서 축약을 없애면 선형, 선형에서 교환을 없애면 순서" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="linear-types-m2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="195" y="10" width="210" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="32" text-anchor="middle" font-weight="bold">비제한: 몇 번이든</text>
<text x="300" y="52" text-anchor="middle" font-size="13">약화, 축약, 교환</text>
<rect x="30" y="112" width="210" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="135" y="134" text-anchor="middle" font-weight="bold">아핀: 많아야 한 번</text>
<text x="135" y="154" text-anchor="middle" font-size="13">약화, 교환(Rust)</text>
<rect x="360" y="112" width="210" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="465" y="134" text-anchor="middle" font-weight="bold">관련: 적어도 한 번</text>
<text x="465" y="154" text-anchor="middle" font-size="13">축약, 교환</text>
<rect x="195" y="204" width="210" height="52" rx="4" fill="#2a408e"/>
<text x="300" y="226" text-anchor="middle" font-weight="bold" fill="#fff">선형: 정확히 한 번</text>
<text x="300" y="246" text-anchor="middle" font-size="13" fill="#fff">교환(LTFAE)</text>
<rect x="195" y="290" width="210" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="312" text-anchor="middle" font-weight="bold">순서: 정확히 한 번, 차례로</text>
<text x="300" y="332" text-anchor="middle" font-size="13">구조 규칙 없음</text>
<path d="M250,64 L165,110" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#linear-types-m2)"/>
<path d="M350,64 L435,110" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#linear-types-m2)"/>
<path d="M165,166 L250,202" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#linear-types-m2)"/>
<path d="M435,166 L350,202" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#linear-types-m2)"/>
<path d="M300,258 L300,288" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#linear-types-m2)"/>
<text x="196" y="88" text-anchor="end" font-size="13">축약 금지</text>
<text x="404" y="88" font-size="13">약화 금지</text>
<text x="196" y="194" text-anchor="end" font-size="13">약화 금지</text>
<text x="404" y="194" font-size="13">축약 금지</text>
<text x="310" y="279" font-size="13">교환 금지</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 아래로 내려갈수록 구조 규칙이 줄어들고, 변수를 쓰는 방식에 대한 보장이 강해집니다.</p>

> **생각해 보기.** 아래로 갈수록 타입 검사를 통과하는 프로그램은 줄어듭니다. 그런데 왜 이것을 "더 강한" 타입 시스템이라고 부를까요? 통과한 프로그램에 대해 **더 많은 것을 보장**하기 때문입니다. 선형 타입을 통과한 프로그램은 상자를 정확히 한 번 쓴다는 것까지 보장받습니다.

현실의 프로그램에서 **모든** 변수를 선형으로 만들 수는 없습니다. 수 `1`을 한 번만 쓰라고 하면 `x + x`조차 쓸 수 없지요. 그래서 실제 부분구조적 타입 시스템은 **비제한 타입과 선형 타입을 섞어** 씁니다. 수나 불 같은 값은 비제한으로 두고, 상자처럼 자원을 책임지는 값만 선형으로 둡니다. 어느 쪽인지는 타입에 붙은 <a id="g-qualifier"></a>**한정자**(qualifier)로 구별합니다. 이 장의 LTFAE는 Walker의 정리를 따라 한정자 \\(\mathsf{un}\\)(비제한)과 \\(\mathsf{lin}\\)(선형)을 씁니다.

## LTFAE: 선형 상자를 더한 TFAE

이제 TFAE를 **LTFAE**로 확장합니다. 이름의 L은 선형(linear)을 뜻합니다. LTFAE는 TFAE에 다음을 더한 언어입니다.

1. [재귀 함수의 타입](./typing-recursive-functions.md) 장의 불(`true`, `false`), 비교(`<`), 조건식(`if`)
2. 한정자 \\(\mathsf{un}\\)/\\(\mathsf{lin}\\)이 붙는 **함수**와 **쌍**, 그리고 쌍을 분해하는 `val (x, y) = e; e`
3. [변경 가능한 자료 구조](./mutable-data-structures.md) 장의 상자를 고친 **선형 상자**: `Box(e)`, `e.get`, `e.set(e)`, 그리고 명시적 해제 `free(e)`

한정자를 생략하면 \\(\mathsf{un}\\)입니다. 그래서 모든 TFAE 프로그램은 그대로 LTFAE 프로그램입니다. 먼저 예를 봅시다.

```ltfae
/* LTFAE */
val b = Box(1);
val (n, b) = b.get;      // n = 1, and the box comes back as the new `b`
val b = b.set(n + 1);    // `set` also gives the box back
free(b)                  // frees the box and returns its content: 2
```

BFAE의 상자와 비교하면 연산들의 모양이 조금 다릅니다. 선형 상자는 정확히 한 번만 쓸 수 있으므로, `b.get`에서 `b`를 쓰고 나면 `b`는 이미 다 쓴 것입니다. 상자를 계속 쓰려면 상자를 **돌려받아야** 합니다. 그래서 `b.get`은 내용물과 상자를 함께 담은 쌍을 돌려주고, `b.set(v)`는 내용물을 바꾼 뒤 상자를 돌려줍니다. 돌려받은 상자를 같은 이름 `b`로 다시 묶으면 마치 Rust에서 값을 넘겼다가 돌려받는 것처럼 쓸 수 있습니다. 상자의 삶을 끝내는 것은 `free(b)` 하나뿐이고, `free`는 칸을 해제하면서 마지막 내용물을 돌려줍니다.

반면 다음 프로그램들은 모두 타입 검사에서 거부되어야 합니다.

```ltfae
/* LTFAE */
val b = Box(1);
val n = free(b);
b.get                    // use after free: `b` is already used
```

```ltfae
/* LTFAE */
val b = Box(1);
free(b) + free(b)        // double free: `b` is used twice
```

```ltfae
/* LTFAE */
val b = Box(1);
42                       // memory leak: `b` is never used
```

### 구체 문법

```bnf
// expressions
<expr> ::= ...                                          // TFAE
         | "true" | "false"
         | <expr> "<" <expr>
         | "if" "(" <expr> ")" <expr> "else" <expr>
         | <qual> "(" <id> ":" <type> ")" "=>" <expr>   // function
         | <qual> "(" <expr> "," <expr> ")"             // pair
         | "val" "(" <id> "," <id> ")" "=" <expr> ";" <expr>
         | "Box" "(" <expr> ")"                         // box creation
         | <expr> "." "get"                             // read
         | <expr> "." "set" "(" <expr> ")"              // write
         | "free" "(" <expr> ")"                        // deallocation

// qualifiers (omitted = un)
<qual> ::= "" | "un" | "lin"

// types
<type> ::= "(" <type> ")"                               // only for precedence
         | "Number" | "Boolean"
         | "Box" "[" <type> "]"                         // linear box type
         | <qual> <type> "=>" <type>                    // function type
         | <qual> "(" <type> "," <type> ")"             // pair type
```

### 추상 문법

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \texttt{true} \mid \texttt{false} & (\texttt{Bool}) \\\\
& & \mid & e < e & (\texttt{Lt}) \\\\
& & \mid & \texttt{if}\ (e)\ e\ \texttt{else}\ e & (\texttt{If}) \\\\
& & \mid & q\ \lambda x\texttt{:}\tau.e & (\texttt{Fun}) \\\\
& & \mid & q\ (e, e) & (\texttt{Pair}) \\\\
& & \mid & \texttt{val}\ (x, x)\ \texttt{=}\ e;\ e & (\texttt{ValPair}) \\\\
& & \mid & \texttt{Box}(e) & (\texttt{NewBox}) \\\\
& & \mid & e\texttt{.get} & (\texttt{GetBox}) \\\\
& & \mid & e\texttt{.set}(e) & (\texttt{SetBox}) \\\\
& & \mid & \texttt{free}(e) & (\texttt{Free}) \\\\
\text{Qualifiers} & q & ::= & \mathsf{un} \mid \mathsf{lin} & (\texttt{Qual}) \\\\
\text{Types} & \mathbb{T} \ni \tau & ::= & \texttt{num} \mid \texttt{bool} & (\texttt{NumT}, \texttt{BoolT}) \\\\
& & \mid & \texttt{box}\ \tau & (\texttt{BoxT}) \\\\
& & \mid & q\ (\tau \to \tau) & (\texttt{ArrowT}) \\\\
& & \mid & q\ (\tau \times \tau) & (\texttt{PairT})
\end{array}
\\]

```scala
enum Qual:
  case Un, Lin

enum Type:
  case NumT
  case BoolT
  case BoxT(contentTy: Type)
  case ArrowT(q: Qual, paramTy: Type, retTy: Type)
  case PairT(q: Qual, leftTy: Type, rightTy: Type)

enum Expr:
  ...  // TFAE: Num, Add, Mul, Id, Val, App
  case Bool(b: Boolean)
  case Lt(left: Expr, right: Expr)
  case If(cond: Expr, thenE: Expr, elseE: Expr)
  case Fun(q: Qual, param: String, ty: Type, body: Expr)
  case Pair(q: Qual, left: Expr, right: Expr)
  case ValPair(x: String, y: String, init: Expr, body: Expr)
  case NewBox(content: Expr)
  case GetBox(box: Expr)
  case SetBox(box: Expr, content: Expr)
  case Free(box: Expr)
```

한정자는 함수 타입과 쌍 타입에만 붙입니다. 수와 불은 언제나 비제한이고, 상자는 언제나 선형입니다. 한 타입이 비제한인지 선형인지를 다음 두 술어로 나타냅니다.

\\[
\begin{array}{lcl}
\mathsf{un}(\tau) & \Longleftrightarrow & \tau \text{ 가 } \texttt{num},\ \texttt{bool},\ \mathsf{un}\ (\tau_1 \to \tau_2),\ \mathsf{un}\ (\tau_1 \times \tau_2) \text{ 중 하나} \\\\
\mathsf{lin}(\tau) & \Longleftrightarrow & \tau \text{ 가 } \texttt{box}\ \tau',\ \mathsf{lin}\ (\tau_1 \to \tau_2),\ \mathsf{lin}\ (\tau_1 \times \tau_2) \text{ 중 하나}
\end{array}
\\]

모든 타입은 둘 중 정확히 하나에 속합니다. Scala로는 `isLin` 하나로 충분합니다.

```scala
def isLin(ty: Type): Boolean = ty match
  case NumT | BoolT     => false
  case BoxT(_)          => true
  case ArrowT(q, _, _)  => q == Lin
  case PairT(q, _, _)   => q == Lin
```

LTFAE를 간단하게 유지하기 위해 한 가지 제약을 둡니다. **상자의 내용물은 비제한 타입이어야 합니다.** `get`은 내용물을 꺼내 주면서 상자 안에도 그대로 남겨 두므로, 내용물이 선형이면 그 순간 같은 선형 값이 둘이 되기 때문입니다. 이 제약을 푸는 방법은 연습 문제에서 다룹니다.

## LTFAE의 인터프리터와 자연 의미

LTFAE의 계산은 [변경 가능한 자료 구조](./mutable-data-structures.md) 장의 BFAE와 같은 방식으로 환경 \\(\sigma\\)와 메모리 \\(M\\)을 함께 씁니다. 판단은 \\(\sigma, M \vdash e \Rightarrow v, M'\\)이고, 부분식을 계산할 때마다 메모리를 순서대로 이어서 넘깁니다. 수, 덧셈, 변수 정의, 함수, 함수 호출, 조건식의 규칙은 BFAE와 재귀 함수의 타입 장의 규칙에 메모리를 이어 붙인 그대로이고, 한정자는 계산에 아무 영향을 주지 않습니다. 값에는 쌍이 새로 생깁니다.

\\[
\begin{array}{llcll}
\text{Values} & \mathbb{V} \ni v & ::= & n \mid b \mid \langle \lambda x.e, \sigma \rangle \mid (v, v) \mid a & (\texttt{PairV}, \texttt{BoxV}, \ldots) \\\\
\text{Memories} & M & \in & \mathbb{A} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Mem})
\end{array}
\\]

### 쌍

쌍을 만들 때는 두 부분식을 차례로 계산하고, 쌍을 분해할 때는 두 값을 각각 \\(x\\)와 \\(y\\)에 묶어 본문을 계산합니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow v_1, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\LeftLabel{$\texttt{Pair}$}
\BinaryInfC{$\sigma, M \vdash q\ (e_1, e_2) \Rightarrow (v_1, v_2), M_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow (v_1, v_2), M_1$}
\AxiomC{$\sigma[x \mapsto v_1, y \mapsto v_2], M_1 \vdash e_2 \Rightarrow v, M_2$}
\LeftLabel{$\texttt{ValPair}$}
\BinaryInfC{$\sigma, M \vdash \texttt{val}\ (x, y)\ \texttt{=}\ e_1;\ e_2 \Rightarrow v, M_2$}
\end{prooftree}
\\]

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Pair(_, l, r) =>
    val (lv, m1) = interp(l, env, mem)
    val (rv, m2) = interp(r, env, m1)
    (PairV(lv, rv), m2)
  case ValPair(x, y, i, b) =>
    interp(i, env, mem) match
      case (PairV(lv, rv), m1) => interp(b, env + (x -> lv) + (y -> rv), m1)
      case (v, _)              => error(s"not a pair: ${v.str}")
```

### 상자 만들기, 읽기, 쓰기

`Box(e)`는 BFAE와 똑같이 새 칸을 할당합니다. 달라진 점은 읽기와 쓰기에 **\\(a \in \text{Dom}(M_1)\\)** 라는 전제가 붙었다는 것입니다. 이제는 칸이 해제될 수 있으므로, 상자 값 \\(a\\)를 가지고 있다고 해서 그 칸이 아직 메모리에 있다는 보장이 없습니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow v, M_1$}
\AxiomC{$a \notin \text{Dom}(M_1)$}
\LeftLabel{$\texttt{NewBox}$}
\BinaryInfC{$\sigma, M \vdash \texttt{Box}(e) \Rightarrow a, M_1[a \mapsto v]$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow a, M_1$}
\AxiomC{$a \in \text{Dom}(M_1)$}
\LeftLabel{$\texttt{GetBox}$}
\BinaryInfC{$\sigma, M \vdash e\texttt{.get} \Rightarrow (M_1(a), a), M_1$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow a, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v, M_2$}
\AxiomC{$a \in \text{Dom}(M_2)$}
\LeftLabel{$\texttt{SetBox}$}
\TrinaryInfC{$\sigma, M \vdash e_1\texttt{.set}(e_2) \Rightarrow a, M_2[a \mapsto v]$}
\end{prooftree}
\\]

`get`은 내용물과 상자(주소 \\(a\\))의 쌍을, `set`은 상자 자체를 돌려준다는 점을 확인하세요.

### 해제

`free(e)`는 상자의 칸을 메모리에서 **지우고** 마지막 내용물을 돌려줍니다. \\(M_1 \setminus a\\)는 \\(M_1\\)에서 주소 \\(a\\)의 칸을 지운 메모리입니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow a, M_1$}
\AxiomC{$a \in \text{Dom}(M_1)$}
\LeftLabel{$\texttt{Free}$}
\BinaryInfC{$\sigma, M \vdash \texttt{free}(e) \Rightarrow M_1(a), M_1 \setminus a$}
\end{prooftree}
\\]

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case NewBox(c) =>
    val (cv, m1) = interp(c, env, mem)
    val a = malloc(m1)
    (BoxV(a), m1 + (a -> cv))
  case GetBox(b) =>
    interp(b, env, mem) match
      case (BoxV(a), m1) =>
        if (!m1.contains(a)) error(s"use after free: $a")
        (PairV(m1(a), BoxV(a)), m1)
      case (v, _) => error(s"not a box: ${v.str}")
  case SetBox(b, c) =>
    interp(b, env, mem) match
      case (BoxV(a), m1) =>
        val (cv, m2) = interp(c, env, m1)
        if (!m2.contains(a)) error(s"use after free: $a")
        (BoxV(a), m2 + (a -> cv))
      case (v, _) => error(s"not a box: ${v.str}")
  case Free(b) =>
    interp(b, env, mem) match
      case (BoxV(a), m1) =>
        if (!m1.contains(a)) error(s"double free: $a")
        (m1(a), m1 - a)
      case (v, _) => error(s"not a box: ${v.str}")
```

`malloc`은 BFAE와 같이 메모리에서 가장 큰 주소에 1을 더합니다(메모리가 비어 있으면 0). 타입 검사 없이 앞의 거부되어야 할 프로그램들을 이 인터프리터로 직접 돌려 보면 각각 다음과 같이 됩니다.

```ltfae
/* LTFAE */
val b = Box(1); val n = free(b); b.get        // RUNTIME ERROR: use after free: 0
val b = Box(1); free(b) + free(b)             // RUNTIME ERROR: double free: 0
val b = Box(1); 42                            // 42, but memory is [0 -> 1]
```

그런데 해제 후 사용이 언제나 이렇게 친절하게 오류를 내는 것은 아닙니다. 다음 프로그램을 봅시다.

```ltfae
/* LTFAE */
val b = Box(1);
val n = free(b);         // address 0 is freed
val c = Box(2);          // address 0 is reused for `c`!
val (k, b2) = b.get;     // reads `c`'s content
k                        // 2, not 1
```

`free(b)`로 메모리가 비자 `malloc`이 주소 0을 다시 `c`에게 줍니다. 그러면 `b.get`의 전제 \\(0 \in \text{Dom}(M)\\)이 성립해 버려서, 오류 없이 **엉뚱한 상자** `c`의 내용물 2를 읽습니다. `NewBox` 규칙은 "\\(M_1\\)에 없는 아무 주소"를 고르라고만 하므로, 해제된 주소를 다시 쓰는 것도 규칙이 허락합니다. 실제 메모리 할당기도 해제된 칸을 다시 쓰기 때문에, 해제 후 사용은 이처럼 다른 객체의 내용을 몰래 읽거나 덮어쓰는 보안 취약점이 됩니다. 실행 중 검사로는 이런 경우를 잡을 수 없으니, 더더욱 타입 검사기가 미리 막아 주어야 합니다.

## 선형 타입 규칙

### 타입 환경 나누기

선형 변수를 "정확히 한 번" 쓰게 하려면 TFAE의 타입 규칙에서 두 가지를 고쳐야 합니다. 축약을 막기 위해 전제가 여럿인 규칙에서 선형 변수를 **한 전제에만** 넘겨주고, 약화를 막기 위해 공리 규칙(\\(\tau\texttt{-Num}\\), \\(\tau\texttt{-Id}\\))에서 **쓰지 않은 선형 변수가 남아 있지 않은지** 확인합니다.

첫 번째를 위해 <a id="g-context-splitting"></a>**타입 환경 나누기**(context splitting)를 정의합니다. \\(\Gamma = \Gamma_1 \circ \Gamma_2\\)는 "\\(\Gamma\\)를 \\(\Gamma_1\\)과 \\(\Gamma_2\\)로 나눌 수 있다"는 뜻이고, 다음 규칙으로 정의합니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Split-Empty}$}
\UnaryInfC{$[] = [] \circ []$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma = \Gamma_1 \circ \Gamma_2$}
\AxiomC{$\mathsf{un}(\tau)$}
\LeftLabel{$\texttt{Split-Un}$}
\BinaryInfC{$\Gamma[x : \tau] = \Gamma_1[x : \tau] \circ \Gamma_2[x : \tau]$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma = \Gamma_1 \circ \Gamma_2$}
\AxiomC{$\mathsf{lin}(\tau)$}
\LeftLabel{$\texttt{Split-LinL}$}
\BinaryInfC{$\Gamma[x : \tau] = \Gamma_1[x : \tau] \circ \Gamma_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma = \Gamma_1 \circ \Gamma_2$}
\AxiomC{$\mathsf{lin}(\tau)$}
\LeftLabel{$\texttt{Split-LinR}$}
\BinaryInfC{$\Gamma[x : \tau] = \Gamma_1 \circ \Gamma_2[x : \tau]$}
\end{prooftree}
\\]

비제한 변수는 **양쪽에 복사**되고(축약 허락), 선형 변수는 **둘 중 한쪽으로만** 갑니다(축약 금지). 예를 들어 \\(\Gamma = [n : \texttt{num}, b : \texttt{box}\ \texttt{num}, c : \texttt{box}\ \texttt{num}]\\)에서 `(n + free(b)) * (n + free(c))`를 검사할 때는 다음과 같이 나눕니다.

<div style="text-align:center">
<svg viewBox="0 0 600 250" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="타입 환경 나누기: 비제한 변수 n은 양쪽에 복사되고, 선형 변수 b는 왼쪽 Γ1에, c는 오른쪽 Γ2에만 간다. Γ1에서 n + free(b), Γ2에서 n + free(c)를 검사한다" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="linear-types-m3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="60" y="47" text-anchor="middle" font-style="italic" font-size="16">Γ</text>
<rect x="90" y="24" width="120" height="34" rx="3" fill="#2a408e"/>
<text x="150" y="46" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#fff">b : box num</text>
<rect x="245" y="24" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="46" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">n : num</text>
<rect x="390" y="24" width="120" height="34" rx="3" fill="#2a408e"/>
<text x="450" y="46" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#fff">c : box num</text>
<rect x="40" y="140" width="240" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="165" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">b : box num, n : num</text>
<rect x="320" y="140" width="240" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="440" y="165" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">n : num, c : box num</text>
<text x="20" y="165" text-anchor="middle" font-style="italic">Γ₁</text>
<text x="580" y="165" text-anchor="middle" font-style="italic">Γ₂</text>
<path d="M150,60 L130,136" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#linear-types-m3)"/>
<path d="M280,60 L220,136" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#linear-types-m3)"/>
<path d="M320,60 L380,136" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#linear-types-m3)"/>
<path d="M450,60 L470,136" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#linear-types-m3)"/>
<text x="300" y="104" text-anchor="middle" font-size="12">n은 복사</text>
<text x="160" y="212" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">Γ₁ ⊢ n + free(b) : num</text>
<text x="440" y="212" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">Γ₂ ⊢ n + free(c) : num</text>
<text x="300" y="240" text-anchor="middle" font-size="12">비제한 변수는 양쪽에, 선형 변수는 한쪽에만</text>
</svg>
</div>

두 번째를 위해 \\(\mathsf{un}(\Gamma)\\)를 "\\(\Gamma\\)의 모든 변수의 타입이 비제한이다"로 정의합니다. 또 한정자 \\(q\\)를 술어처럼 써서, \\(q(\tau)\\)는 \\(q = \mathsf{un}\\)이면 \\(\mathsf{un}(\tau)\\)를, \\(q = \mathsf{lin}\\)이면 항상 참을 뜻하기로 합니다. \\(q(\Gamma)\\)도 마찬가지입니다.

규칙을 간단히 쓰기 위해, 바인딩하는 이름은 \\(\Gamma\\)에 이미 있는 이름과 겹치지 않는다고 가정합니다. 겹치면 이름을 바꿔서 생각합니다. 예를 들어 `val (n, b) = b.get; e`의 새 `b`는 \\(b'\\)로 바꿔 읽습니다. 구현에서 이름이 겹치는 경우를 어떻게 다루는지는 뒤에서 봅니다.

### 변수와 상수: 약화 금지

\\[
\begin{prooftree}
\AxiomC{$\mathsf{un}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Num}$}
\UnaryInfC{$\Gamma \vdash n : \texttt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\mathsf{un}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Bool}$}
\UnaryInfC{$\Gamma \vdash b : \texttt{bool}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\mathsf{un}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma[x : \tau] \vdash x : \tau$}
\end{prooftree}
\\]

TFAE와 비교하면 전제 \\(\mathsf{un}(\Gamma)\\)만 늘었습니다. \\(\tau\texttt{-Id}\\)는 "\\(x\\) **말고** 남은 변수는 모두 비제한이어야 한다"는 뜻입니다. 쓰지 않은 상자 변수가 남아 있으면 유도가 막히므로, 유도 트리의 잎에 도달할 때까지 모든 선형 변수가 어딘가에서 **반드시** 쓰여야 합니다. 이것이 약화 금지입니다. 반면 \\(x\\) 자신의 타입 \\(\tau\\)는 선형이어도 됩니다. 바로 이 자리가 선형 변수를 "쓰는" 곳입니다.

### 전제가 여럿인 규칙: 축약 금지

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_1 : \texttt{num}$}
\AxiomC{$\Gamma_2 \vdash e_2 : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Add}$}
\BinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash e_1 + e_2 : \texttt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_1 : \texttt{num}$}
\AxiomC{$\Gamma_2 \vdash e_2 : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Lt}$}
\BinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash e_1 < e_2 : \texttt{bool}$}
\end{prooftree}
\\]

결론의 \\(\Gamma_1 \circ \Gamma_2\\)는 "\\(\Gamma_1\\)과 \\(\Gamma_2\\)로 나눌 수 있는 타입 환경"을 뜻합니다. 곱셈 \\(\tau\texttt{-Mul}\\)도 같습니다. 변수 정의와 함수 호출도 같은 방식입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_1 : \tau_1$}
\AxiomC{$\Gamma_2[x : \tau_1] \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-Val}$}
\BinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash \texttt{val}\ x\ \texttt{=}\ e_1;\ e_2 : \tau_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_0 : q\ (\tau_1 \to \tau_2)$}
\AxiomC{$\Gamma_2 \vdash e_1 : \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\BinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

\\(\tau\texttt{-App}\\)에서 인자 \\(e_1\\)이 선형 변수라면 그 변수는 \\(\Gamma_2\\)로 가고, 함수 쪽 \\(\Gamma_1\\)이나 이후의 식에서는 더 이상 쓸 수 없습니다. 함수에 넘기는 것이 곧 소유권을 **이동**하는 것입니다.

### 조건식: 두 갈래가 같은 자원을 써야 한다

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_0 : \texttt{bool}$}
\AxiomC{$\Gamma_2 \vdash e_1 : \tau$}
\AxiomC{$\Gamma_2 \vdash e_2 : \tau$}
\LeftLabel{$\tau\texttt{-If}$}
\TrinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash \texttt{if}\ (e_0)\ e_1\ \texttt{else}\ e_2 : \tau$}
\end{prooftree}
\\]

두 갈래는 **같은** \\(\Gamma_2\\)에서 검사합니다. 두 갈래 중 하나만 실행되므로 선형 변수를 두 갈래에 모두 주어도 축약이 아닙니다. 그런데 \\(\Gamma_2\\)의 선형 변수는 약화 금지 때문에 **각 갈래에서** 모두 쓰여야 합니다. 그래서 두 갈래는 정확히 같은 선형 변수들을 써야 합니다. 예를 들어 다음 식은 거부됩니다. 조건이 거짓이면 `b`가 해제되지 않고 버려지기 때문입니다.

```ltfae
/* LTFAE */
val b = Box(1);
if (0 < 1) free(b) else 0          // rejected: the else branch leaks `b`
```

`else` 갈래를 `free(b) + 1`로 고치면 통과합니다.

### 함수와 쌍: 담는 규칙

함수는 정의할 때 쓰는 바깥 변수를 클로저에 담아 둡니다. 그렇다면 상자를 담은 함수를 두 번 호출하면 어떻게 될까요?

```ltfae
/* LTFAE */
val b = Box(1);
val f = (x: Number) => x + free(b);   // f captures the box `b`
f(1) + f(2)                           // double free!
```

`f` 자신은 \\(\mathsf{un}\\) 함수이니 몇 번이든 쓸 수 있고, 호출할 때마다 `free(b)`가 실행되니 이중 해제가 생깁니다. 해결책은 <a id="g-containment-rule"></a>**담는 규칙**(containment rule)입니다. **비제한 값은 선형 값을 담을 수 없습니다.** 비제한 값은 복사되거나 버려질 수 있으므로, 그 안에 든 선형 값도 함께 복사되거나 버려지기 때문입니다.

\\[
\begin{prooftree}
\AxiomC{$q(\Gamma)$}
\AxiomC{$\Gamma[x : \tau] \vdash e : \tau'$}
\LeftLabel{$\tau\texttt{-Fun}$}
\BinaryInfC{$\Gamma \vdash q\ \lambda x\texttt{:}\tau.e : q\ (\tau \to \tau')$}
\end{prooftree}
\\]

\\(\mathsf{un}\\) 함수라면 \\(\mathsf{un}(\Gamma)\\), 즉 바깥의 선형 변수를 하나도 쓰지 않아야 합니다. \\(\mathsf{lin}\\) 함수는 바깥의 선형 변수를 담을 수 있지만, 함수 자신이 선형이 되어 정확히 한 번만 호출할 수 있습니다. 그래서 위 예에서 `f`를 `lin (x: Number) => x + free(b)`로 바꾸면 `f(1) + f(2)`는 `f`를 두 번 써서 거부되고, `f(1)` 한 번만 부르면 통과합니다. 매개변수 \\(x\\)의 타입 \\(\tau\\)는 선형이어도 괜찮다는 점도 눈여겨보세요. `(b: Box[Number]) => free(b)`는 상자를 받아 해제하는 \\(\mathsf{un}\\) 함수이고, 몇 번이든 호출할 수 있습니다. 호출할 때마다 **새** 상자를 받기 때문입니다.

쌍에도 같은 원리를 적용합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_1 : \tau_1$}
\AxiomC{$\Gamma_2 \vdash e_2 : \tau_2$}
\AxiomC{$q(\tau_1) \quad q(\tau_2)$}
\LeftLabel{$\tau\texttt{-Pair}$}
\TrinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash q\ (e_1, e_2) : q\ (\tau_1 \times \tau_2)$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_1 : q\ (\tau_1 \times \tau_2)$}
\AxiomC{$\Gamma_2[x : \tau_1, y : \tau_2] \vdash e_2 : \tau$}
\LeftLabel{$\tau\texttt{-ValPair}$}
\BinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash \texttt{val}\ (x, y)\ \texttt{=}\ e_1;\ e_2 : \tau$}
\end{prooftree}
\\]

\\(\mathsf{un}\\) 쌍의 두 성분은 모두 비제한이어야 합니다. 이 조건이 없다면 `val p = (b, 2)`로 상자를 \\(\mathsf{un}\\) 쌍에 넣은 뒤, `p`를 두 번 분해해서 같은 상자를 두 번 해제할 수 있습니다.

### 상자 연산

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \tau$}
\AxiomC{$\mathsf{un}(\tau)$}
\LeftLabel{$\tau\texttt{-NewBox}$}
\BinaryInfC{$\Gamma \vdash \texttt{Box}(e) : \texttt{box}\ \tau$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \texttt{box}\ \tau$}
\LeftLabel{$\tau\texttt{-GetBox}$}
\UnaryInfC{$\Gamma \vdash e\texttt{.get} : \mathsf{lin}\ (\tau \times \texttt{box}\ \tau)$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash e_1 : \texttt{box}\ \tau$}
\AxiomC{$\Gamma_2 \vdash e_2 : \tau$}
\LeftLabel{$\tau\texttt{-SetBox}$}
\BinaryInfC{$\Gamma_1 \circ \Gamma_2 \vdash e_1\texttt{.set}(e_2) : \texttt{box}\ \tau$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \texttt{box}\ \tau$}
\LeftLabel{$\tau\texttt{-Free}$}
\UnaryInfC{$\Gamma \vdash \texttt{free}(e) : \tau$}
\end{prooftree}
\\]

`get`의 결과는 상자를 담고 있으므로 담는 규칙에 따라 \\(\mathsf{lin}\\) 쌍이어야 합니다. `set`은 옛 내용물을 버리는데, 내용물이 비제한이므로 괜찮습니다. `free`만이 상자 타입을 받아서 상자가 없는 타입을 돌려주는, 즉 상자의 삶을 **끝내는** 유일한 연산입니다.

> **자주 하는 실수.** "선형 변수는 한 번만 쓴다"를 "선형 변수는 식에 한 번만 **나타난다**"로 오해하기 쉽습니다. 실제로 세는 것은 변수가 식에 나타나는 횟수가 아니라, 타입 환경 나누기에서 그 변수가 몇 갈래로 가느냐입니다. 그래서 `if`의 두 갈래에 `b`가 한 번씩, 모두 두 번 나타나도 괜찮습니다. 또 `(b: Box[Number]) => free(b)`처럼 함수 본문에 한 번 나타난 매개변수 `b`는 함수를 여러 번 불러도 괜찮습니다. 호출마다 다른 상자가 `b`에 묶이기 때문입니다.

## 예제

유도 트리를 짧게 쓰기 위해 \\(\texttt{box}\ \texttt{num}\\)을 \\(B\\)로 줄여 씁니다. 다음 프로그램의 타입을 유도해 봅시다.

```ltfae
/* LTFAE */
val b = Box(1);
val c = Box(2);
free(b) + free(c)        // 3
```

먼저 본문 `free(b) + free(c)`입니다. \\([b : B, c : B] = [b : B] \circ [c : B]\\)로 나눕니다(\\(\texttt{Split-LinL}\\), \\(\texttt{Split-LinR}\\)). \\(\tau\texttt{-Id}\\)의 전제 \\(\mathsf{un}([])\\)는 빈 타입 환경이므로 당연히 참입니다. 이 유도 트리를 \\(\mathcal{D}_1\\)이라고 부릅시다.

\\[
\begin{prooftree}
\AxiomC{$\mathsf{un}([])$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$[b : B] \vdash b : B$}
\LeftLabel{$\tau\texttt{-Free}$}
\UnaryInfC{$[b : B] \vdash \texttt{free}(b) : \texttt{num}$}
\AxiomC{$\mathsf{un}([])$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$[c : B] \vdash c : B$}
\LeftLabel{$\tau\texttt{-Free}$}
\UnaryInfC{$[c : B] \vdash \texttt{free}(c) : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Add}$}
\BinaryInfC{$[b : B, c : B] \vdash \texttt{free}(b) + \texttt{free}(c) : \texttt{num}$}
\end{prooftree}
\\]

다음은 두 번째 `val`입니다. \\([b : B] = [] \circ [b : B]\\)로 나누어 `Box(2)`는 빈 타입 환경에서, 본문은 \\(b\\)를 가진 채로 검사합니다. 이 유도 트리를 \\(\mathcal{D}_2\\)라고 부릅시다.

\\[
\begin{prooftree}
\AxiomC{$\mathsf{un}([])$}
\LeftLabel{$\tau\texttt{-Num}$}
\UnaryInfC{$[] \vdash 2 : \texttt{num}$}
\AxiomC{$\mathsf{un}(\texttt{num})$}
\LeftLabel{$\tau\texttt{-NewBox}$}
\BinaryInfC{$[] \vdash \texttt{Box}(2) : B$}
\AxiomC{$\mathcal{D}_1$}
\LeftLabel{$\tau\texttt{-Val}$}
\BinaryInfC{$[b : B] \vdash \texttt{val}\ c\ \texttt{=}\ \texttt{Box}(2);\ \texttt{free}(b) + \texttt{free}(c) : \texttt{num}$}
\end{prooftree}
\\]

마지막으로 첫 번째 `val`은 \\([] = [] \circ []\\)로 나누어, \\([] \vdash \texttt{Box}(1) : B\\)(\\(\mathcal{D}_2\\)의 왼쪽과 같은 모양)와 \\(\mathcal{D}_2\\)를 \\(\tau\texttt{-Val}\\)로 합치면 프로그램 전체의 타입 \\(\texttt{num}\\)을 얻습니다.

이번에는 거부되는 프로그램을 봅시다.

```ltfae
/* LTFAE */
val b = Box(1);
free(b) + free(b)
```

본문을 검사하려면 \\(\tau\texttt{-Add}\\)에 따라 \\([b : B]\\)를 둘로 나눠야 합니다. 그런데 \\(B\\)는 선형이므로 나누는 방법은 \\([b : B] \circ []\\)와 \\([] \circ [b : B]\\) 두 가지뿐입니다. 어느 쪽을 고르든 한쪽은 \\([] \vdash \texttt{free}(b) : \texttt{num}\\)을 유도해야 하는데, \\(b\\)가 빈 타입 환경에 없으므로 \\(\tau\texttt{-Id}\\)를 쓸 수 없습니다. 그래서 유도 트리가 존재하지 않고, 이중 해제 프로그램은 거부됩니다.

누수 프로그램 `val b = Box(1); 42`도 마찬가지입니다. 본문 `42`는 \\([b : B] \vdash 42 : \texttt{num}\\)을 유도해야 하는데, \\(\tau\texttt{-Num}\\)의 전제 \\(\mathsf{un}([b : B])\\)가 거짓입니다.

## 타입 검사기

### 입력 타입 환경과 출력 타입 환경

선언적인 규칙을 그대로 구현하려고 하면 곤란한 점이 있습니다. \\(\tau\texttt{-Add}\\)를 만났을 때 \\(\Gamma\\)를 어떻게 나눌지 **미리** 알 수 없습니다. 선형 변수가 \\(k\\)개면 나누는 방법이 \\(2^k\\)가지나 되고, 어느 쪽이 맞는지는 부분식을 검사해 봐야 압니다.

해결책은 나누기를 미리 정하지 않고, **왼쪽 부분식이 다 쓰고 남긴 것을 오른쪽에 넘기는** 것입니다. BFAE의 인터프리터가 메모리를 이어서 넘겼던 것과 똑같은 방식입니다. 타입 검사기가 타입 환경을 입력으로 받고, 타입과 함께 **입력에서 쓴 선형 변수를 뺀 타입 환경**을 출력으로 돌려줍니다.

```scala
type TypeEnv = Map[String, Type]
def typeCheck(expr: Expr, tenv: TypeEnv): (Type, TypeEnv) = ???
```

수식으로는 \\(\Gamma \vdash e : \tau \dashv \Gamma'\\)라고 씁니다. "입력 \\(\Gamma\\)에서 \\(e\\)의 타입은 \\(\tau\\)이고, \\(e\\)가 쓴 선형 변수를 빼면 \\(\Gamma'\\)가 남는다"는 뜻입니다. 비제한 변수는 출력에도 그대로 남습니다. 예를 들어 변수와 덧셈은 다음과 같습니다. \\(\Gamma \setminus x\\)는 \\(\Gamma\\)에서 \\(x\\)를 지운 타입 환경입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma(x) = \tau$}
\AxiomC{$\mathsf{un}(\tau)$}
\LeftLabel{$\texttt{A-IdUn}$}
\BinaryInfC{$\Gamma \vdash x : \tau \dashv \Gamma$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma(x) = \tau$}
\AxiomC{$\mathsf{lin}(\tau)$}
\LeftLabel{$\texttt{A-IdLin}$}
\BinaryInfC{$\Gamma \vdash x : \tau \dashv \Gamma \setminus x$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \texttt{num} \dashv \Gamma_1$}
\AxiomC{$\Gamma_1 \vdash e_2 : \texttt{num} \dashv \Gamma_2$}
\LeftLabel{$\texttt{A-Add}$}
\BinaryInfC{$\Gamma \vdash e_1 + e_2 : \texttt{num} \dashv \Gamma_2$}
\end{prooftree}
\\]

선형 변수를 쓰면 출력에서 사라지므로, 같은 변수를 두 번 쓰려 하면 두 번째에는 타입 환경에서 찾을 수 없습니다. 축약 금지가 이렇게 자연스럽게 구현됩니다. 약화 금지는 변수의 스코프가 끝나는 곳, 즉 `val`, 함수, 쌍 분해의 본문을 다 검사한 직후에 확인합니다. 그때 출력 타입 환경에 그 선형 변수가 아직 남아 있으면 한 번도 쓰지 않은 것입니다. 이 방식은 Walker의 정리에 나오는 알고리즘과 같은 생각이고, 선언적 규칙과 같은 프로그램을 받아들입니다.

`free(b) + free(c)`를 \\([b : B, c : B]\\)에서 검사하면 타입 환경이 다음과 같이 흘러갑니다.

\\[
[b : B, c : B] \xrightarrow{\ \texttt{free}(b)\ } [c : B] \xrightarrow{\ \texttt{free}(c)\ } []
\\]

`free(b) + free(b)`라면 두 번째 `free(b)`에 들어가는 타입 환경이 \\([]\\)이므로 `b`를 찾지 못해 오류가 납니다.

### 변수, 덧셈, 변수 정의

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): (Type, TypeEnv) = expr match
  case Num(_)  => (NumT, tenv)
  case Add(l, r) =>
    val (lty, tenv1) = typeCheck(l, tenv)
    mustSame(lty, NumT)
    val (rty, tenv2) = typeCheck(r, tenv1)
    mustSame(rty, NumT)
    (NumT, tenv2)
  case Id(x) =>
    val ty = tenv.getOrElse(x, error(s"free or already used identifier: $x"))
    if (isLin(ty)) (ty, tenv - x) else (ty, tenv)
  case Val(x, init, body) =>
    val (initTy, tenv1) = typeCheck(init, tenv)
    val (bodyTy, tenv2) = typeCheck(body, tenv1 + (x -> initTy))
    (bodyTy, leave(tenv2, x, initTy, tenv1))
  ...
```

`Id`에서 선형 변수를 쓰면 출력 타입 환경에서 지웁니다. `Val`은 초기값을 검사하고 **남은** 타입 환경 `tenv1`에 `x`를 더해 본문을 검사합니다. 본문을 다 검사하면 `leave`로 `x`의 스코프를 닫습니다.

```scala
def leave(out: TypeEnv, x: String, ty: Type, outer: TypeEnv): TypeEnv =
  if (isLin(ty) && out.contains(x)) error(s"unused linear variable: $x")
  outer.get(x) match
    case Some(t) => out + (x -> t)
    case None    => out - x
```

`leave`는 두 가지 일을 합니다. 첫째, `x`가 선형인데 출력에 아직 남아 있으면 한 번도 쓰지 않은 것이므로 오류를 냅니다(약화 금지). 둘째, 바인딩 전의 타입 환경 `outer`에 같은 이름이 있었다면 그것을 되돌려 놓습니다. 안쪽 `x`에 가려져 있던 바깥 `x`는 본문에서 쓸 수 없었으므로, 스코프가 끝나면 원래 상태 그대로 다시 보여야 하기 때문입니다. 덕분에 `val (n, b) = b.get; ...`처럼 같은 이름을 다시 묶는 프로그램도 처리할 수 있습니다. 초기값 `b.get`이 바깥 `b`를 이미 써 버렸으므로 `outer`에는 `b`가 없고, 스코프가 끝나면 `b`는 그냥 지워집니다.

### 함수와 함수 호출

```scala
  case Fun(q, x, ty, body) =>
    val (retTy, tenv1) = typeCheck(body, tenv + (x -> ty))
    val out = leave(tenv1, x, ty, tenv)
    if (q == Un && out != tenv)
      error("unrestricted function uses linear variables from outside")
    (ArrowT(q, ty, retTy), out)
  case App(f, a) =>
    val (fty, tenv1) = typeCheck(f, tenv)
    fty match
      case ArrowT(_, pty, rty) =>
        val (aty, tenv2) = typeCheck(a, tenv1)
        mustSame(aty, pty)
        (rty, tenv2)
      case ty => error(s"not a function type: ${ty.str}")
```

함수 본문을 검사한 뒤 출력 타입 환경 `out`이 입력 `tenv`와 다르다면, 본문이 바깥의 선형 변수를 썼다는 뜻입니다. \\(\mathsf{lin}\\) 함수라면 그 변수들은 함수 안에 담기고(그래서 `out`에서 빠진 채로 돌아가고), \\(\mathsf{un}\\) 함수라면 담는 규칙 위반이므로 오류입니다. 이것이 \\(\tau\texttt{-Fun}\\)의 전제 \\(q(\Gamma)\\)에 해당합니다.

### 조건식

```scala
  case If(c, t, e) =>
    val (cty, tenv1) = typeCheck(c, tenv)
    mustSame(cty, BoolT)
    val (tty, tenv2) = typeCheck(t, tenv1)
    val (ety, tenv3) = typeCheck(e, tenv1)
    mustSame(tty, ety)
    if (tenv2 != tenv3)
      error("branches use different linear variables")
    (tty, tenv2)
```

두 갈래를 **같은** 입력 `tenv1`에서 검사하고, 두 출력이 같은지 확인합니다. 다르다면 한 갈래에서만 쓴 선형 변수가 있다는 뜻입니다.

### 쌍과 상자

```scala
  case Pair(q, l, r) =>
    val (lty, tenv1) = typeCheck(l, tenv)
    val (rty, tenv2) = typeCheck(r, tenv1)
    if (q == Un && (isLin(lty) || isLin(rty)))
      error("unrestricted pair cannot contain linear values")
    (PairT(q, lty, rty), tenv2)
  case ValPair(x, y, init, body) =>
    if (x == y) error(s"duplicate name: $x")
    typeCheck(init, tenv) match
      case (PairT(_, lty, rty), tenv1) =>
        val (bodyTy, tenv2) =
          typeCheck(body, tenv1 + (x -> lty) + (y -> rty))
        (bodyTy, leave(leave(tenv2, y, rty, tenv1), x, lty, tenv1))
      case (ty, _) => error(s"not a pair type: ${ty.str}")
  case NewBox(c) =>
    val (cty, tenv1) = typeCheck(c, tenv)
    if (isLin(cty)) error(s"box content must be unrestricted: ${cty.str}")
    (BoxT(cty), tenv1)
  case GetBox(b) =>
    typeCheck(b, tenv) match
      case (BoxT(cty), tenv1) => (PairT(Lin, cty, BoxT(cty)), tenv1)
      case (ty, _)            => error(s"not a box type: ${ty.str}")
  case SetBox(b, c) =>
    typeCheck(b, tenv) match
      case (BoxT(cty), tenv1) =>
        val (ty, tenv2) = typeCheck(c, tenv1)
        mustSame(ty, cty)
        (BoxT(cty), tenv2)
      case (ty, _) => error(s"not a box type: ${ty.str}")
  case Free(b) =>
    typeCheck(b, tenv) match
      case (BoxT(cty), tenv1) => (cty, tenv1)
      case (ty, _)            => error(s"not a box type: ${ty.str}")
```

상자 연산에서는 상자 식 `b`를 검사하는 것만으로 상자 변수가 출력에서 빠집니다. `b.get`의 `b`가 `Id("b")`이고, `Id`가 선형 변수를 지우기 때문입니다. 상자 연산 자체는 상자를 "썼다"는 것을 따로 처리할 필요가 없습니다.

### 실행해 보기

프로그램 전체는 `typeCheck(e, Map())`으로 검사합니다. 앞에서 본 예제들을 타입 검사기와 인터프리터에 각각 넣어 보면 다음과 같습니다.

| 프로그램 | `typeCheck` | `interp` (타입 검사 없이) |
|---|---|---|
| `val b = Box(1); val (n, b) = b.get; val b = b.set(n + 1); free(b)` | `Number` | `2`, 메모리 `[]` |
| `val b = Box(1); val n = free(b); b.get` | 거부: `b`는 이미 씀 | 오류: use after free |
| `val b = Box(1); free(b) + free(b)` | 거부: `b`는 이미 씀 | 오류: double free |
| `val b = Box(1); 42` | 거부: 쓰지 않은 선형 변수 `b` | `42`, 메모리 `[0 -> 1]` |
| `val b = Box(1); if (0 < 1) free(b) else 0` | 거부: 두 갈래가 다름 | `1`, 메모리 `[]` |
| `val b = Box(1); val f = (x: Number) => x + free(b); f(1) + f(2)` | 거부: `un` 함수가 바깥 선형 변수를 씀 | 오류: double free |
| 위에서 `f`를 `lin`으로, 호출은 `f(1)` 한 번만 | `Number` | `2`, 메모리 `[]` |
| `val b = Box(1); val p = (b, 2); val (x, y) = p; val (z, w) = p; free(x) + free(z)` | 거부: `un` 쌍에 선형 값 | 오류: double free |

거부된 프로그램 중에는 실행해 보면 우연히 문제가 없는 것(조건이 늘 참인 `if`)도 있습니다. [타입 시스템](./type-systems.md) 장에서 본 것처럼 건전한 타입 검사기는 이런 거짓 경보를 피할 수 없습니다.

## LTFAE의 타입 안전성

### 무엇을 보장하는가

LTFAE에서는 실행 중 오류가 두 가지 늘었습니다. 상자를 읽거나 쓰려는데 칸이 없는 **해제 후 사용**과, 해제하려는데 칸이 없는 **이중 해제**입니다. 또 앞에서 보았듯이 해제된 주소가 다시 쓰이면 해제 후 사용이 오류 없이 엉뚱한 칸을 건드릴 수도 있습니다. LTFAE의 타입 안전성은 이 모든 것을 막는다는 약속입니다.

> **정리(LTFAE의 타입 안전성).** \\([] \vdash e : \tau\\)이면 \\(e\\)를 계산하는 동안
> 1. 타입 오류가 일어나지 않고,
> 2. 해제한 칸을 읽거나 쓰지 않으며(해제 후 사용 없음), 해제된 주소를 가리키는 상자 값이 계산에 다시 쓰이는 일도 없고,
> 3. 같은 칸을 두 번 해제하지 않습니다(이중 해제 없음).
>
> 또한 \\(\mathsf{un}(\tau)\\)이고 \\([], [] \vdash e \Rightarrow v, M\\)이면 \\(M = []\\)입니다(누수 없음).

마지막 성질은 선형 타입이기에 얻는 보장입니다. 결과 값이 수나 불처럼 비제한이면, 담는 규칙 때문에 그 안에 상자가 들어 있을 수 없습니다. 그런데 모든 상자는 정확히 한 번 쓰였고, 상자를 "끝내는" 연산은 `free`뿐입니다(`get`과 `set`은 상자를 돌려주고, 함수 호출과 쌍은 상자를 옮길 뿐입니다). 그러니 할당한 모든 칸은 해제된 상태로 계산이 끝납니다.

### 왜 성립하는가

증명의 핵심은 다음 <a id="g-invariant"></a>**불변식**(invariant)이 계산 내내 유지된다는 것입니다.

> 메모리의 각 칸 \\(a\\)마다, 앞으로의 계산에서 쓰일 수 있는 상자 값 \\(a\\)는 **정확히 하나**이고, 그 값은 선형 타입의 자리(선형 변수, \\(\mathsf{lin}\\) 쌍의 성분, \\(\mathsf{lin}\\) 클로저의 환경)에 있다. 그리고 앞으로 쓰일 수 있는 상자 값은 모두 메모리에 있는 칸을 가리킨다.

이것이 바로 Rust의 "소유자는 정확히 하나" 규칙입니다. 각 규칙이 이 불변식을 어떻게 지키는지 보면 다음과 같습니다.

- `Box(e)`는 새 칸과 그 칸의 유일한 소유자를 함께 만듭니다.
- 선형 변수는 쓰면 타입 환경에서 사라지므로(축약 금지), 소유자를 복사해서 둘로 만들 방법이 없습니다. 함수 호출, `val`, 쌍은 소유자를 **옮길** 뿐입니다.
- 비제한 값은 선형 값을 담을 수 없으므로(담는 규칙), 비제한 값을 복사하는 것으로 소유자를 몰래 늘릴 수도 없습니다.
- `free(e)`는 칸을 지우는 동시에 그 칸의 유일한 소유자 \\(e\\)를 써 버립니다. 그래서 칸이 사라진 뒤에 그 주소를 가진 상자 값은 앞으로 하나도 쓰이지 않습니다. 메모리의 칸이 없어지는 일과 그 칸을 가리키는 마지막 참조가 없어지는 일이 **한 번에** 일어나므로, 나중에 같은 주소가 다른 상자에 재사용되더라도 옛 상자로 그 칸을 건드릴 수 없습니다.

환경에는 이미 써 버린 선형 변수의 주소가 그대로 남아 있을 수 있다는 점에 주의하세요. 예를 들어 `val n = free(b); ...` 뒤에도 환경 \\(\sigma\\)에는 `b`가 주소 0에 묶인 채 남아 있습니다. 하지만 타입 검사기가 `b`를 다시 쓰지 못하게 하므로 이 매달린 주소는 절대 읽히지 않습니다. 불변식에서 "앞으로의 계산에서 쓰일 수 있는"이라는 말이 붙은 이유입니다.

### 규칙을 잘못 바꾸면

타입 안전성이 각 규칙에 얼마나 민감한지 살펴보는 것도 좋은 연습입니다.

- **축약을 허락하면**, 예를 들어 \\(\texttt{Split-LinL}\\)/\\(\texttt{Split-LinR}\\) 대신 선형 변수도 양쪽에 복사하면, `free(b) + free(b)`가 통과해 이중 해제가 생깁니다. 2번과 3번이 모두 깨집니다.
- **담는 규칙을 빼면**, 앞의 표에서 본 것처럼 \\(\mathsf{un}\\) 함수나 \\(\mathsf{un}\\) 쌍을 통해 상자가 복사되어 역시 이중 해제가 생깁니다.
- **약화를 허락하면**, 즉 \\(\tau\texttt{-Num}\\), \\(\tau\texttt{-Bool}\\), \\(\tau\texttt{-Id}\\)의 전제 \\(\mathsf{un}(\Gamma)\\)를 빼면, 1-3번은 그대로 성립하지만 누수 없음은 깨집니다. 이것이 바로 아핀 타입입니다. 구현에서는 `leave`의 검사를 빼고, `if`에서 두 출력 타입 환경의 공통 부분만 남기면 됩니다.
- **`get`이 상자를 돌려주지 않게 하면**, 즉 `e.get : τ`로 두면, 상자를 한 번 읽는 순간 상자를 다 써 버리므로 다시 해제할 수 없습니다. 안전성은 깨지지 않지만 누수가 생기는 프로그램만 쓸 수 있게 됩니다. 반대로 `get`만은 상자를 쓰지 않은 것으로 치면(상자를 비제한처럼 다루면) `val n = free(b); b.get`이 통과해 해제 후 사용이 생깁니다.

> **생각해 보기.** 아핀 타입에서 누수를 막으려면 어떻게 해야 할까요? 타입 검사기는 쓰지 않고 버려지는 선형 변수가 어디인지 정확히 압니다. `leave`에서 오류를 내는 대신 그 자리에 `free`를 **끼워 넣으면** 됩니다. Rust 컴파일러가 스코프 끝에 drop을 끼워 넣는 것이 바로 이것입니다.

## 빌림: 쓰지 않고 잠깐 빌려 쓰기

### 순수한 선형성은 너무 불편하다

LTFAE에서 상자의 값을 한 번 읽으려면 `val (n, b) = b.get;`처럼 상자를 넘겼다가 돌려받아야 했습니다. 함수가 상자를 읽기만 하는 경우에도 마찬가지입니다. 두 상자의 내용물을 더하는 함수를 쓰려면 상자를 받아서 다시 돌려줘야 합니다.

```ltfae
/* LTFAE */
val sum = (p: lin (Box[Number], Box[Number])) => {
  val (a, b) = p;
  val (x, a) = a.get;
  val (y, b) = b.get;
  lin (x + y, lin (a, b))       // the result and both boxes, returned
};
...
```

(설명을 위해 함수 본문을 중괄호로 묶었습니다.) 읽기만 하는데도 결과와 상자들을 다시 묶어 돌려줘야 하니 몹시 번거롭습니다. 그런데 생각해 보면 **읽기만 하는** 동안에는 상자를 여러 곳에서 동시에 보고 있어도 아무 문제가 없습니다. 위험한 것은 누군가 상자를 해제하거나 고치는 동안 다른 누군가가 그것을 보고 있을 때입니다.

### Rust의 공유 빌림과 가변 빌림

Rust는 소유권을 넘기지 않고 값을 잠깐 쓰게 해 주는 <a id="g-borrowing"></a>**빌림**(borrowing)을 제공합니다. 빌림에는 두 종류가 있습니다.

- <a id="g-shared-borrow"></a>**공유 빌림**(shared borrow) `&T`: 값을 읽기만 할 수 있는 참조입니다. 동시에 여러 개 있어도 됩니다.
- <a id="g-mutable-borrow"></a>**가변 빌림**(mutable borrow) `&mut T`: 값을 고칠 수 있는 참조입니다. 한 번에 하나만 있을 수 있고, 그동안은 소유자도 그 값을 쓸 수 없습니다.

```rust
// Rust
fn len(s: &String) -> usize {
    s.len()
}

fn push_world(s: &mut String) {
    s.push_str(" world");
}

fn main() {
    let mut s = String::from("hello");
    let n = len(&s);       // shared borrow: s is not moved
    push_world(&mut s);    // mutable borrow
    println!("{} {}", s, n);   // hello world 5
}
```

`len(&s)`는 `s`를 이동시키지 않습니다. 함수가 끝나면 빌림도 끝나고, `s`는 계속 `s`의 것입니다. LTFAE에서 `b.get`이 상자를 돌려주던 수고를 언어가 대신 해 주는 셈입니다.

두 종류의 빌림을 묶는 규칙은 흔히 <a id="g-aliasing-xor-mutability"></a>**별칭과 변경의 배타성**(aliasing xor mutability)이라고 부릅니다. 어떤 값에 대해 어느 시점이든 **여러 개의 읽기 전용 별칭**이 있거나 **단 하나의 변경 가능한 참조**가 있을 수 있지만, 둘이 동시에 있을 수는 없습니다. [변경 가능한 자료 구조](./mutable-data-structures.md) 장에서 별칭과 변경이 함께 있으면 프로그램을 이해하기 어려워진다고 했는데, Rust는 아예 둘이 동시에 존재하지 못하게 막는 것입니다. 다음은 이 규칙을 어긴 예입니다.

```rust
// Rust
fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];    // shared borrow of v
    v.push(4);            // error: mutable borrow while shared borrow is alive
    println!("{}", first);
}
```

```text
error[E0502]: cannot borrow `v` as mutable because it is also borrowed as immutable
 --> src/main.rs:4:5
  |
3 |     let first = &v[0];    // shared borrow of v
  |                  - immutable borrow occurs here
4 |     v.push(4);            // error: mutable borrow while shared borrow is alive
  |     ^^^^^^^^^ mutable borrow occurs here
5 |     println!("{}", first);
  |                    ----- immutable borrow later used here
```

이 규칙이 왜 필요할까요? `v.push(4)`는 벡터의 공간이 모자라면 더 큰 칸을 새로 할당하고 원소를 옮긴 뒤 **옛 칸을 해제**합니다. 그러면 `first`는 해제된 칸을 가리키게 되고, `println!`은 해제 후 사용이 됩니다. 가변 빌림 두 개를 동시에 만드는 것도 E0499(``cannot borrow `s` as mutable more than once at a time``)로 거부됩니다.

빌림이 "살아 있는" 기간은 코드 블록 전체가 아니라 그 참조를 **마지막으로 쓰는 곳**까지입니다. 그래서 다음 프로그램은 통과합니다.

```rust
// Rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &s;          // many shared borrows: OK
    println!("{} {}", r1, r2);
    let r3 = &mut s;      // OK: r1 and r2 are no longer used
    r3.push_str("!");
    println!("{}", s);
}
```

<div style="text-align:center">
<svg viewBox="0 0 640 230" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="빌림이 살아 있는 기간: r1과 r2는 3행과 4행부터 5행까지 공유 빌림으로 함께 살아 있고, r3는 6행에서 7행까지 혼자 가변 빌림으로 살아 있다. 두 구간은 겹치지 않는다" font-family="sans-serif" font-size="14" fill="currentColor">
<text x="410" y="22" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">r1 (&amp;)</text>
<text x="480" y="22" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">r2 (&amp;)</text>
<text x="570" y="22" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">r3 (&amp;mut)</text>
<g font-size="13" font-family="ui-monospace, Menlo, monospace">
<text x="14" y="50" opacity="0.6">2</text><text x="40" y="50">let mut s = String::from("hello");</text>
<text x="14" y="76" opacity="0.6">3</text><text x="40" y="76">let r1 = &amp;s;</text>
<text x="14" y="102" opacity="0.6">4</text><text x="40" y="102">let r2 = &amp;s;</text>
<text x="14" y="128" opacity="0.6">5</text><text x="40" y="128">println!("{} {}", r1, r2);</text>
<text x="14" y="154" opacity="0.6">6</text><text x="40" y="154">let r3 = &amp;mut s;</text>
<text x="14" y="180" opacity="0.6">7</text><text x="40" y="180">r3.push_str("!");</text>
<text x="14" y="206" opacity="0.6">8</text><text x="40" y="206">println!("{}", s);</text>
</g>
<rect x="402" y="62" width="16" height="72" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="472" y="88" width="16" height="46" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="562" y="140" width="16" height="46" rx="3" fill="#2a408e"/>
<line x1="370" y1="137" x2="626" y2="137" stroke="currentColor" stroke-dasharray="4 4" opacity="0.6"/>
<text x="626" y="118" text-anchor="end" font-size="12">읽기 전용 별칭 여럿</text>
<text x="626" y="210" text-anchor="end" font-size="12">변경 가능한 참조 하나</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 공유 빌림 구간과 가변 빌림 구간이 겹치지 않으므로 별칭과 변경의 배타성이 지켜집니다.</p>

### 수명

빌림에는 한 가지 조건이 더 있습니다. **빌린 참조는 원래 값보다 오래 살 수 없습니다.** 값이 해제된 뒤에도 참조가 남아 있으면 그것이 곧 해제 후 사용이기 때문입니다. Rust는 참조마다 그 참조가 유효한 구간인 **수명**(lifetime)을 따지고, 이 조건을 어기면 거부합니다.

```rust
// Rust
fn main() {
    let r;
    {
        let x = 5;
        r = &x;           // error[E0597]: `x` does not live long enough
    }
    println!("{}", r);
}
```

`x`는 안쪽 블록이 끝날 때 사라지는데, `r`은 그 뒤에도 쓰이므로 거부됩니다. 함수가 참조를 받아 참조를 돌려줄 때는, 돌려주는 참조가 어느 인자의 수명에 묶이는지를 수명 매개변수로 적어야 할 때가 있습니다.

```rust
// Rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

`'a`는 [매개변수 다형성](./parametric-polymorphism.md)의 타입 변수처럼 쓰는 **수명 변수**입니다. 이 시그니처는 "결과 참조는 `x`와 `y`가 둘 다 살아 있는 동안만 쓸 수 있다"고 말합니다. 그래서 호출하는 쪽은 함수 본문을 보지 않고도 결과를 언제까지 쓸 수 있는지 압니다.

빌림 검사기를 정확한 타입 규칙으로 쓰는 것은 이 장의 범위를 넘습니다. 실제 Rust의 빌림 검사는 "참조를 마지막으로 쓰는 곳"을 찾기 위해 제어 흐름 그래프 위에서 동작하는 정적 분석이고, 그 정확한 형식화는 지금도 연구가 이어지는 주제입니다. 이 절에서는 빌림이 선형 타입의 불편함을 덜기 위한 장치이며, 별칭과 변경의 배타성과 수명이라는 두 조건으로 해제 후 사용을 계속 막는다는 것만 기억하면 충분합니다.

## 실제 언어와의 연결

### Rust: 아핀 타입과 자동 해제

지금까지 본 것을 Rust의 용어와 짝지으면 다음과 같습니다.

| LTFAE | Rust |
|---|---|
| \\(\mathsf{un}\\) 타입(`Number`, `Boolean`) | `Copy` 트레이트를 구현한 타입(`i32`, `bool`, ...) |
| 선형 상자 `Box[Number]` | `Box<i32>`, `String`, `Vec<T>` 등 |
| 선형 변수를 쓰면 타입 환경에서 사라짐 | 이동한 변수를 쓰면 E0382 |
| `free(b)` | `drop(b)` 또는 스코프 끝의 자동 drop |
| \\(\mathsf{lin}\\) 함수(바깥 선형 변수를 담음) | `FnOnce` 클로저 |
| `b.get`이 상자를 돌려줌 | 공유 빌림 `&b` |

마지막에서 두 번째 줄을 확인해 봅시다. 바깥 상자를 담아서 해제하는 클로저는 한 번만 부를 수 있습니다.

```rust
// Rust
fn main() {
    let b = Box::new(1);
    let g = move || drop(b);   // consumes b: g is FnOnce
    g();
    g();                       // error[E0382]: use of moved value: `g`
}
```

컴파일러는 "closure cannot be invoked more than once because it moves the variable `b` out of its environment"라고 덧붙입니다. LTFAE에서 `lin` 함수 `f`를 두 번 부르면 거부되던 것과 똑같습니다.

Rust와 LTFAE의 가장 큰 차이는 Rust가 **아핀**이라는 점입니다. Rust에서는 값을 쓰지 않고 버려도 됩니다. 대신 컴파일러가 스코프 끝에 drop을 끼워 넣어 누수를 막습니다. 조건문의 한 갈래에서만 값을 이동하는 경우에는 실행 중에 "이미 이동했는지"를 기록하는 표시(drop flag)를 두어 처리합니다. 다만 Rust는 누수가 없다는 것을 **보장하지는 않습니다.** `std::mem::forget`은 안전한 함수이고, 참조 횟수 세기 포인터 `Rc`로 순환을 만들면 [쓰레기 수집](./garbage-collection.md) 장에서 본 참조 순환 문제가 그대로 생깁니다. Rust가 안전성의 일부로 보장하는 것은 해제 후 사용과 이중 해제가 없다는 것, 즉 LTFAE 정리의 1-3번에 해당하는 부분입니다.

### C++: `unique_ptr`와 이동

C++11의 `std::unique_ptr`도 "소유자는 하나"라는 생각을 따릅니다. 복사는 금지되어 있고, `std::move`로만 소유권을 넘길 수 있으며, 소유자가 스코프를 벗어나면 자동으로 `delete`됩니다.

```cpp
// C++
#include <memory>
#include <utility>
#include <cstdio>
struct Box { int k; Box(int k): k(k) {} };
int main() {
  std::unique_ptr<Box> p = std::make_unique<Box>(42);
  std::unique_ptr<Box> q = std::move(p);  // ownership moves to q
  // std::unique_ptr<Box> r = q;          // compile error: copy is deleted
  std::printf("%d\n", q->k);              // 42
  std::printf("%d\n", p == nullptr);      // 1: p is now empty
  return 0;
}   // q goes out of scope: the Box is deleted exactly once
```

주석 처리한 줄을 살리면 "call to implicitly-deleted copy constructor" 오류가 납니다. 축약 금지가 복사 생성자 삭제로 구현된 셈입니다. 하지만 C++은 이동한 **뒤의** `p`를 쓰는 것은 막지 않습니다. `p->k`라고 써도 컴파일은 되고, 실행하면 빈 포인터를 따라가게 됩니다. Rust에서는 이동한 변수를 타입 검사기가 잊어버리지만, C++에서 `p`는 여전히 `unique_ptr<Box>` 타입의 변수로 남아 있기 때문입니다. 이 장 처음의 질문, 즉 "타입이 `delete` 전후를 구별하지 못한다"는 문제가 반쯤만 해결된 것입니다.

### Haskell: 선형 화살표

GHC 9.0부터 `LinearTypes` 확장을 켜면 Haskell에서 선형 함수를 쓸 수 있습니다. `a %1 -> b`는 "인자를 정확히 한 번 쓰는 함수"의 타입입니다.

```haskell
-- Haskell
{-# LANGUAGE LinearTypes #-}

swap :: (a, b) %1 -> (b, a)
swap (x, y) = (y, x)          -- OK: x and y are each used once

dup :: a %1 -> (a, a)
dup x = (x, x)                -- error: x is used twice
```

`dup`은 "Couldn't match type 'Many with 'One"이라는 오류로 거부됩니다. 인자를 버리는 `discard x = ()`도 같은 이유로 거부되므로, Haskell의 선형성은 아핀이 아니라 정말 "정확히 한 번"입니다.

LTFAE와 다른 점은 선형성을 **타입**이 아니라 **화살표**에 붙인다는 것입니다. LTFAE에서는 `Box[Number]` 타입의 값이 어디서나 선형이지만, Linear Haskell에서는 같은 값이라도 `%1 ->` 함수에 넘길 때만 "이 함수가 정확히 한 번 쓴다"는 약속이 생깁니다. 덕분에 기존 라이브러리와 타입을 그대로 둔 채 선형성을 조금씩 도입할 수 있습니다.

### Clean: 유일성 타입

함수형 언어 Clean은 1990년대부터 <a id="g-uniqueness-type"></a>**유일성 타입**(uniqueness type)을 써 왔습니다. 타입에 `*`를 붙인 `*File`이나 `*World` 같은 타입의 값은 그 값을 가리키는 참조가 **하나뿐**임이 보장되고, 그래서 순수 함수형 언어에서도 파일이나 배열을 그 자리에서 고쳐 쓸 수 있습니다. 아무도 옛 값을 볼 수 없으니 고쳐도 순수성이 깨지지 않기 때문입니다. Wadler의 1990년 논문 제목 "선형 타입은 세상을 바꿀 수 있다(Linear types can change the world!)"도 같은 아이디어, 즉 선형 타입으로 배열 같은 "세상"을 제자리에서 안전하게 바꿀 수 있다는 데서 나왔습니다.

선형 타입과 유일성 타입은 비슷해 보이지만 보는 방향이 다릅니다. 선형 타입은 "이 값을 **앞으로** 복사하거나 버리지 않겠다"는 약속이고, 유일성 타입은 "이 값은 **지금까지** 아무와도 공유되지 않았다"는 보장입니다. Rust의 `&mut T`는 유일성 쪽에 가깝고, 소유권 이동은 선형(아핀) 쪽에 가깝습니다. Rust는 두 생각을 함께 쓰는 언어라고 볼 수 있습니다.

## 정리

- 수동 메모리 관리의 세 실수(해제 후 사용, 이중 해제, 누수)는 "같은 상자를 두 번 쓰거나 한 번도 쓰지 않는" 문제로 바꿔 말할 수 있습니다.
- 보통의 타입 시스템에는 약화(안 써도 됨), 축약(여러 번 써도 됨), 교환(순서 무관)이라는 구조 규칙이 숨어 있습니다. 이를 일부 빼면 아핀(많아야 한 번), 관련(적어도 한 번), 선형(정확히 한 번), 순서 타입 시스템이 됩니다.
- LTFAE는 TFAE에 조건식, 한정자 \\(\mathsf{un}\\)/\\(\mathsf{lin}\\)이 붙는 함수와 쌍, 그리고 선형 상자(`Box`, `get`, `set`, `free`)를 더한 언어입니다. 선형 상자의 `get`과 `set`은 상자를 돌려주고, `free`만이 상자를 끝냅니다.
- 선형 타입 규칙은 타입 환경 나누기 \\(\Gamma_1 \circ \Gamma_2\\)로 축약을 막고(선형 변수는 한쪽에만), 공리 규칙의 \\(\mathsf{un}(\Gamma)\\)로 약화를 막습니다. 조건식의 두 갈래는 같은 선형 변수를 써야 하고, 비제한 값은 선형 값을 담을 수 없습니다(담는 규칙).
- 타입 검사기는 입력 타입 환경을 받아 쓴 선형 변수를 뺀 출력 타입 환경을 돌려주는 방식으로 구현합니다.
- 타입이 맞는 LTFAE 프로그램은 해제 후 사용과 이중 해제를 일으키지 않고, 결과가 비제한 타입이면 모든 칸을 해제한 채로 끝납니다. 핵심은 "각 칸의 소유자는 정확히 하나"라는 불변식입니다.
- Rust는 아핀 타입에 자동 drop을 더하고, 빌림(`&T`, `&mut T`)과 수명으로 선형성의 불편함을 덜면서 별칭과 변경의 배타성을 지킵니다. C++의 `unique_ptr`, Haskell의 `LinearTypes`, Clean의 유일성 타입도 같은 생각에 뿌리를 둡니다.

## 연습 문제

1. 다음 LTFAE 프로그램이 타입 검사를 통과하는지 판정하고, 통과하지 않으면 어느 규칙에서 막히는지 설명하세요.
   - `val b = Box(3); val (n, b) = b.get; n + free(b)`
   - `val b = Box(3); val (n, c) = b.get; n + free(b)`
   - `val f = (b: Box[Number]) => free(b) + 1; f(Box(1)) + f(Box(2))`
   - `val b = Box(1); val f = lin (x: Number) => x + free(b); val g = f; g(1)`
   - `val b = Box(1); val p = lin (b, 2); val (x, y) = p; y`
2. 앞의 예제 프로그램의 본문을 `free(c) + free(b)`로 바꾸면 \\(\mathcal{D}_1\\)의 타입 환경 나누기가 어떻게 달라지는지 쓰세요. 또 \\([n : \texttt{num}, b : B, c : B] \vdash (n + \texttt{free}(b)) \times (n + \texttt{free}(c)) : \texttt{num}\\)의 유도 트리를 그리세요.
3. 관련 타입 시스템(약화 금지, 축약 허락)으로 LTFAE를 바꾸면 어떤 규칙을 고쳐야 할까요? 이 타입 시스템은 앞의 세 가지 메모리 실수 중 어느 것을 막고 어느 것을 막지 못하는지 설명하세요.
4. 타입 검사기에 아핀 모드를 구현하세요. `leave`에서 쓰지 않은 선형 변수를 허락하고, `if`에서 두 갈래의 출력 타입 환경 중 공통 부분만 남기면 됩니다. 그다음 아핀 모드에서 버려지는 상자를 찾아 그 자리에 `Free`를 끼워 넣는 변환을 만들어, 변환한 프로그램을 실행하면 메모리가 비어 있는지 확인하세요.
5. 상자의 내용물이 비제한이어야 한다는 제약을 풀어 봅시다. 새 내용물을 넣고 옛 내용물과 상자를 돌려주는 `e1.swap(e2)` 연산(타입 \\(\mathsf{lin}\ (\tau \times \texttt{box}\ \tau)\\))을 더하고, 내용물이 선형일 때는 `get`과 `set`을 금지하도록 타입 규칙과 `typeCheck`를 고치세요. 왜 `get`은 금지해야 하는지, `set`은 왜 문제가 되는지(옛 내용물은 어디로 가는지) 설명하세요.
6. 다음 Rust 프로그램이 거부되는 이유를 이 장의 용어(이동, 공유 빌림, 가변 빌림, 별칭과 변경의 배타성)로 설명하고, 통과하도록 고치세요.
   ```rust
   // Rust
   fn main() {
       let mut s = String::from("hello");
       let r1 = &mut s;
       let r2 = &mut s;      // error[E0499]
       r1.push_str("!");
       r2.push_str("?");
   }
   ```

## 더 읽을거리

- Philip Wadler, "Linear types can change the world!", *Programming Concepts and Methods*, North-Holland, 1990. 선형 타입으로 함수형 언어에서 배열 같은 자원을 제자리에서 안전하게 고치는 방법을 제안한 고전입니다.
- David Walker, "Substructural Type Systems", Benjamin C. Pierce (ed.), *Advanced Topics in Types and Programming Languages*, MIT Press, 2005, 1장. 이 장의 한정자 \\(\mathsf{un}\\)/\\(\mathsf{lin}\\), 타입 환경 나누기, 담는 규칙, 입력/출력 타입 환경을 쓰는 알고리즘은 모두 이 글을 따랐습니다. 아핀, 관련, 순서 타입 시스템도 함께 다룹니다.
- Jean-Yves Girard, "Linear logic", *Theoretical Computer Science* 50(1), 1987. 선형 타입의 뿌리인 선형 논리를 처음 제안한 논문입니다.
- Jean-Philippe Bernardy, Mathieu Boespflug, Ryan R. Newton, Simon Peyton Jones, Arnaud Spiwack, "Linear Haskell: Practical Linearity in a Higher-Order Polymorphic Language", POPL 2018. GHC의 `LinearTypes` 확장의 바탕이 된 논문입니다.
- Ralf Jung, Jacques-Henri Jourdan, Robbert Krebbers, Derek Dreyer, "RustBelt: Securing the Foundations of the Rust Programming Language", POPL 2018. Rust의 소유권과 빌림이 안전하다는 것을 형식적으로 증명한 연구입니다.
- Steve Klabnik, Carol Nichols, *The Rust Programming Language*, No Starch Press. 4장이 소유권, 이동, 빌림을, 10장이 수명을 다룹니다.

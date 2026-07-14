# Layout과 Partial

이 프로젝트의 `lab:*` 문법은 브라우저에서 동작하는 Web Component가 아닙니다.
빌드할 때 공용 HTML을 조립한 뒤 일반 HTML로 완전히 사라지는 최소 문법입니다.

## Page

Page는 `src/pages/{slug}/index.html` 한 파일입니다. metadata, style, body, script를 함께 둡니다.

```html
<!-- layout: base.html -->
<!-- title: Page title -->
<!-- description: One-line description -->

<style>
    /* Page-only styles */
</style>

<!-- lab:template -->
<body>
    <!-- Page markup -->
</body>

<script>
    // Page-only behavior
</script>
```

`layout`과 `title`은 필수입니다. `<!-- lab:template -->`은 Page 본문의 시작을 알리는 컴파일러 예약 표식입니다.
표식은 정확히 한 번만 작성하고, 바로 다음에 명시적인 여는 태그와 닫는 태그를 갖춘 `body`를 둡니다.
표식이 없거나 중복되거나 표식과 `body` 사이에 다른 내용이 있으면 빌드가 실패합니다.

## Layout

Layout은 `src/layouts`에 위치한 최종 문서 골격입니다. Page가 지정한 파일명과 일치해야 합니다.

```html
<!DOCTYPE html>
<html>
<head>
    <lab:slot name="title"></lab:slot>
    <lab:slot name="global-style"></lab:slot>
    <lab:slot name="style"></lab:slot>
</head>
<body>
    <lab:slot name="body"></lab:slot>
    <lab:use partial="page-tools"></lab:use>
    <lab:slot name="global-script"></lab:slot>
    <lab:slot name="script"></lab:slot>
</body>
</html>
```

`title`과 `body` slot은 필수입니다. 같은 이름의 slot을 두 번 선언할 수 없습니다.

## Slot

Slot은 컴파일러가 내용을 넣는 위치입니다. Layout 또는 Partial에서만 선언합니다.

```html
<lab:slot name="body"></lab:slot>
```

컴파일러가 해당 이름의 값을 제공하지 않으면 내부 HTML을 기본값으로 유지할 수 있습니다.

```html
<lab:slot name="footer">
    <footer>Design Lab by BaeJino</footer>
</lab:slot>
```

## Partial

Partial은 `src/partials/{name}.html`에 위치하는 정적 HTML 조각입니다.

```html
<lab:use partial="page-tools"></lab:use>
```

Partial 안에서 다른 Partial을 사용할 수 있습니다. 컴파일러는 중첩 관계를 추적하며 순환 참조를 오류로 처리합니다.

```text
Partial cycle detected: page-tools → prompt-editor → page-tools
```

Partial 이름에는 영문, 숫자, `_`, `-`만 사용합니다. 상대 경로 이동이나 동적 파일명은 허용하지 않습니다.

## 데이터

빌드 데이터는 템플릿 표현식으로 치환하지 않습니다. 필요한 Page에 안전하게 escape한 JSON을 제공합니다.

```html
<script id="lab-page-data" type="application/json">
    {"pages":[]}
</script>
```

Page script에서 읽습니다.

```js
var element = document.getElementById('lab-page-data');
var data = JSON.parse(element.textContent || '{}');
```

## 지원하지 않는 문법

- 변수 보간
- 조건문과 반복문
- 필터와 Partial 인자
- 런타임 Custom Element
- Shadow DOM과 component lifecycle

새 문법은 동일한 문제가 실제로 두 곳 이상에서 반복되고, 기존 Slot과 Partial로 표현할 수 없으며, 의존성과 오류 위치를 정적으로 계산할 수 있을 때만 검토합니다.

## 빌드 순서

```text
Page 검색
  → metadata와 Page 블록 파싱
  → Page/Global 자산 컴파일
  → Layout 해석
  → Partial 확장
  → Slot 채우기
  → 최종 HTML 검증
  → 개발 클라이언트 연결(개발 빌드만)
  → 결과물과 해시 자산 기록
```

최종 프로덕션 HTML에는 `lab:*`, 개발 클라이언트, Socket.IO 참조가 남지 않습니다.


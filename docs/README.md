# 페이지 작성 가이드

- [디자인 트렌드 페이지](./design-trend.md)
- [컨셉 페이지](./concept.md)
- [Layout과 Partial](./template-system.md)
- [개발 서버](./dev-server.md)

두 종류 모두 `src/pages` 아래에 HTML 파일 하나로 작성합니다. 스타일과 스크립트도 같은 파일 안에 둡니다.

파일 상단에는 아래 정보가 필요합니다.

```html
<!-- layout: base.html -->
<!-- title: 페이지 이름 -->
<!-- description: 목록에서 보일 한 문장 -->
```

현재 페이지 본문은 영어로 작성합니다. 새 페이지도 특별한 이유가 없다면 기존 언어를 따릅니다.

작업이 끝나면 `npm run build`로 확인합니다.

컴파일러, lint, 전체 Page 빌드를 한 번에 확인하려면 `npm run check`를 실행합니다.

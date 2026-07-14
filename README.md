# Design Lab

예전 UI를 직접 다시 만들어보면서 무엇이 좋았고 무엇이 불편했는지 정리합니다.
직접 만든 컨셉 디자인도 함께 기록합니다.

페이지 작성 기준은 [docs](./docs/README.md)에 정리되어 있습니다.

## 실행

```bash
npm i
npx playwright install chromium
npm run dev
```

빌드:

```bash
npm run build
```

전체 검증:

```bash
npm run check
```

각 페이지는 HTML 파일 안에 스타일과 스크립트를 함께 작성합니다.
공용 HTML은 빌드 타임 Layout과 Partial로 조립하며, 개발 서버는 변경된 범위만 다시 빌드하고 갱신합니다.

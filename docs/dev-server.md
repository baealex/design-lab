# 개발 서버

```bash
npm run dev
```

기본 주소는 `http://localhost:8888`입니다.

개발 서버는 Compiler, Watcher, Server, Protocol, Client 역할을 분리합니다. Watcher는 파일 경로를 직접 전체 rebuild 규칙으로 바꾸지 않고 컴파일러가 만든 의존성 그래프에서 영향받는 Page를 찾습니다.

## 변경별 동작

| 변경 | 빌드 범위 | 브라우저 동작 |
| --- | --- | --- |
| Page style | 해당 Page | stylesheet 교체 |
| Page body 또는 script | 해당 Page와 index data | 해당 Page만 reload |
| Partial | 의존하는 Page | 영향받은 Page만 reload |
| Layout | 의존하는 Page | 영향받은 Page만 reload |
| Global style | Global style | 모든 열린 화면의 stylesheet 교체 |
| Global script | Global script | 전체 reload |
| Public asset | 해당 asset | 전체 reload |

index에서 미리보는 Page가 바뀌면 index 전체를 새로고침하지 않습니다. iframe의 stylesheet를 교체하거나 iframe만 reload합니다. Page metadata가 바뀌면 `/__lab/pages.json`을 다시 읽어 목록을 갱신합니다.

## 개발 전용 경로

```text
/__lab/client.js
/__lab/pages.json
/socket.io/socket.io.js
```

개발 클라이언트는 HTML 안에 인라인으로 복사되지 않습니다. 위 경로는 프로덕션 결과물에 포함되지 않습니다.

## 소켓 프로토콜

```text
lab:connected
lab:build-start
lab:build-complete
lab:update
lab:error
```

`lab:update`는 변경 종류, 영향받은 Page, 적용 전략을 전달합니다.

```ts
interface LabUpdate {
    buildId: string;
    kind: 'style' | 'page' | 'global' | 'layout' | 'partial' | 'public';
    pages: string[];
    strategy: 'patch-style' | 'reload-page' | 'reload-all';
    indexDataChanged?: boolean;
}
```

빠르게 이어진 파일 변경은 build transaction으로 묶어 순서대로 처리합니다. 컴파일이나 조립이 실패하면 결과물을 기록하거나 reload 이벤트를 보내지 않으므로 마지막 정상 화면이 유지됩니다. 브라우저 우측 하단 상태 UI에서 오류 단계와 파일 위치를 확인할 수 있습니다.

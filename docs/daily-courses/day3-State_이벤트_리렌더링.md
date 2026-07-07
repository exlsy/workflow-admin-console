# Day 3 — State / 이벤트 / 리렌더링

> WorkFlow Admin Console 2주 코스의 셋째 날입니다.  
> Day 2에서 만든 정적 화면에 **state(상태), 이벤트, 불변성**을 입혀 데이터가 화면 위에서 "살아 움직이게" 만듭니다.  
> 이 문서 하나만 따라 하면 검색어 입력·상태 필터·실시간 목록 필터링을 갖춘 **업무 요청 목록 화면**을 완성합니다.

---

## 0. 이 문서를 마치면

- `useState`로 컴포넌트의 상태를 만들고, 상태가 바뀌면 화면이 자동으로 다시 그려지는(리렌더링) 원리를 이해합니다.
- `onChange`, `onClick` 등 이벤트를 처리하고 이벤트 객체(`e.target.value`)를 다룰 수 있습니다.
- **제어 컴포넌트(controlled component)** 로 입력값을 상태와 동기화할 수 있습니다.
- **불변성(immutability)** — 배열/객체를 직접 수정하지 않고 새로 만들어 교체하는 원칙 — 을 이해하고 지킬 수 있습니다.
- state에서 계산해내는 **파생 값(derived value)** 개념을 이해하고, 필터링된 목록을 별도 state로 중복 저장하지 않습니다.
- 검색어·상태 필터에 따라 실시간으로 걸러지는 업무 요청 목록을 완성합니다.

### Day 3에서 다루지 않는 것 (혼동 방지)

- **antd Table / Select / Input** → Day 4. 오늘은 순수 HTML `<input>`, `<select>`, `<ul>`로 만듭니다.
- **API 호출 / 서버 데이터** → Day 6. 오늘 데이터는 컴포넌트 안의 **정적 초기값**입니다.
- **Redux 전역 상태** → Day 9. 오늘 상태는 컴포넌트 안의 **지역 상태(local state)** 입니다.
- **라우팅** → Day 8. 오늘은 `App`이 대시보드와 요청 목록을 함께 렌더링합니다.

### 최종 산출물 폴더 구조 (Day 3 기준)

```txt
workflow-admin-console/
  src/
    components/
      common/
        PageTitle.jsx        (재사용)
        StatusTag.jsx        (재사용)
    features/
      dashboard/
        DashboardPage.jsx    (변경 없음)
        SummaryCard.jsx      (변경 없음)
      requests/
        RequestListPage.jsx  (신규 - 상태/이벤트 담당)
        RequestSearchBar.jsx (신규 - 제어 컴포넌트)
    styles/
      global.css             (스타일 추가)
    App.jsx                  (요청 목록 페이지 추가 렌더링)
```

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 State란 무엇인가 (props와의 차이)

Day 2의 **props**는 부모가 내려주는 "읽기 전용 입력값"이었습니다. 반면 **state**는 **컴포넌트가 스스로 소유하고, 시간이 지나며 바뀌는 데이터**입니다.

- **props**: 부모 → 자식. 자식은 못 바꿈(읽기 전용).
- **state**: 컴포넌트 내부 소유. 컴포넌트가 직접 바꿈. **바뀌면 화면이 다시 그려짐.**

예를 들어 "검색창에 입력한 글자"는 시간이 지나며 바뀌고, 그 컴포넌트가 소유하는 값이므로 state입니다.

### 1.2 useState 해부

React 16.8+ 의 함수형 컴포넌트는 **Hook**으로 상태를 다룹니다. 가장 기본이 `useState`입니다.

```jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  //     ▲현재값  ▲변경함수        ▲초기값

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}번 클릭됨
    </button>
  );
}
```

- `useState(0)` — 초기값 `0`으로 상태를 만들고, `[현재값, 변경함수]` 배열을 돌려줍니다.
- `const [count, setCount] = ...` — 배열 구조 분해로 받습니다. 이름은 관례적으로 `x` / `setX`.
- `setCount(newValue)` — 상태를 바꾸고 **리렌더링을 예약**합니다.

> **중요**: `count = count + 1`처럼 변수를 직접 바꾸면 화면이 갱신되지 않습니다. 반드시 **변경 함수(`setCount`)** 를 통해 바꿔야 React가 리렌더링합니다.

### 1.3 리렌더링의 흐름

1. 사용자가 버튼을 클릭 → 이벤트 핸들러 실행
2. 핸들러가 `setCount(1)` 호출
3. React가 "이 컴포넌트의 상태가 바뀌었다"고 인지 → 컴포넌트 함수를 **다시 실행**
4. 새 `count`로 새 JSX를 만들고, 바뀐 부분만 실제 DOM에 반영

즉, 우리는 "DOM을 직접 조작"하지 않습니다. **상태를 바꾸면 → 화면은 알아서 따라옵니다.** 이것이 React의 핵심 사고방식입니다.

### 1.4 Hook 사용 규칙 (반드시 지킬 것)

`useState` 같은 Hook은 두 가지 규칙이 있습니다.

1. **컴포넌트 함수의 최상위에서만 호출한다.** `if`문, 반복문, 중첩 함수 안에서 호출하면 안 됩니다.
   ```jsx
   // 잘못됨
   if (something) {
     const [x, setX] = useState(0); // X
   }

   // 올바름: 항상 최상위에서
   const [x, setX] = useState(0);
   ```
2. **React 함수형 컴포넌트(또는 커스텀 Hook) 안에서만 호출한다.** 일반 함수에서 호출 금지.

이유: React는 Hook이 **매번 같은 순서로 호출**된다는 전제로 상태를 추적하기 때문입니다.

### 1.5 이벤트 처리

React 이벤트는 HTML과 비슷하지만 camelCase이고, 값으로 **함수**를 넘깁니다.

```jsx
<button onClick={handleClick}>클릭</button>
<input onChange={handleChange} />
```

이벤트 핸들러는 **이벤트 객체(`e`)** 를 받습니다. 입력값은 `e.target.value`로 꺼냅니다.

```jsx
function handleChange(e) {
  console.log(e.target.value); // 입력한 문자열
}
```

#### ⚠️ 핸들러에 인자를 넘길 때 — 화살표로 감싸기

```jsx
// 잘못됨: 렌더링 시점에 즉시 호출되어 버림 (함수가 아니라 "호출 결과"를 넘김)
<button onClick={handleDelete(req.id)}>삭제</button>

// 올바름: 클릭될 때 실행되도록 화살표 함수로 감싼다
<button onClick={() => handleDelete(req.id)}>삭제</button>
```

- 인자가 필요 없으면 `onClick={handleClick}`처럼 함수 자체를 넘깁니다.
- 인자가 필요하면 `onClick={() => handleClick(id)}`처럼 화살표로 감싸 "클릭 시 실행될 함수"를 만듭니다.

### 1.6 제어 컴포넌트 (controlled component)

입력 요소(`input`, `select`)의 값을 **state가 관리**하도록 묶는 방식입니다.

```jsx
const [keyword, setKeyword] = useState('');

<input
  value={keyword}                              // 화면 값 = state
  onChange={e => setKeyword(e.target.value)}   // 입력 시 state 갱신
/>
```

- `value`를 state에 묶고, `onChange`에서 state를 갱신합니다.
- 이렇게 하면 **state가 유일한 진실의 출처(single source of truth)** 가 됩니다. 입력값을 코드로 읽고·바꾸고·초기화하기 쉬워집니다.
- 주의: `value`만 주고 `onChange`를 빼면 입력이 **먹통**이 됩니다(값이 state에 고정되어 타이핑이 반영 안 됨).

### 1.7 불변성 (immutability) — Day 3의 핵심

**state를 바꿀 때는 기존 값을 직접 수정하지 말고, 새 값을 만들어 교체**해야 합니다.

```js
// 잘못된 방식: 기존 배열을 직접 수정
requests.push(newRequest);
setRequests(requests);        // 같은 배열 참조 → React가 "안 바뀌었다"고 판단 → 리렌더 누락

// 올바른 방식: 새 배열을 만들어 교체
setRequests([...requests, newRequest]);  // 새 배열 참조 → 리렌더 발생
```

**왜?** React는 성능을 위해 "이전 state와 새 state가 **같은 참조인지**"만 빠르게 비교합니다. `push`처럼 내용만 바꾸면 참조가 그대로라 "안 바뀐 걸로" 착각해 화면을 갱신하지 않을 수 있습니다. 또한 원본을 훼손하면 버그 추적이 어려워집니다.

불변 업데이트 관용구:

- **배열 추가**: `[...arr, newItem]` 또는 `[newItem, ...arr]`
- **배열 삭제**: `arr.filter(item => item.id !== id)`
- **배열 수정**: `arr.map(item => item.id === id ? { ...item, done: true } : item)`
- **객체 수정**: `{ ...obj, status: 'DONE' }`

`push`, `splice`, `obj.x = ...`, `sort`(원본 정렬) 같은 **원본을 바꾸는 연산은 피합니다.**

### 1.8 파생 값 (derived value) — 필터링 결과를 state로 두지 마라

검색/필터 결과처럼 **다른 state로부터 계산되는 값**은 별도의 state로 저장하지 않습니다. **렌더링할 때마다 계산**하면 됩니다.

```jsx
const [requests, setRequests] = useState(INITIAL);
const [keyword, setKeyword] = useState('');

// 파생 값: state로부터 매 렌더링마다 계산 (state 아님!)
const filtered = requests.filter(r => r.title.includes(keyword));
```

`filtered`를 또 다른 state로 만들면 "원본과 필터 결과를 동기화"하는 코드가 필요해지고, 둘이 어긋나는 버그가 생깁니다. **원천 state는 최소한으로, 나머지는 계산으로.** 이것이 실무에서 매우 중요한 원칙입니다.

---

## 2. 사전 준비 — Day 2 완료 상태 확인

Day 2가 끝난 상태여야 합니다. `PageTitle`, `StatusTag`가 있고 대시보드가 정상적으로 보이는지 확인하세요.

```bash
npm start
```

- `http://localhost:3000`에 대시보드가 에러 없이 보이면 준비 완료입니다.
- 개발 서버는 켜 둔 채로 진행하면 저장할 때마다 결과를 바로 확인할 수 있습니다.

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. 폴더 만들기

```bash
mkdir -p src/features/requests
```

### Step 2. 제어 컴포넌트 — RequestSearchBar

검색어 입력과 상태 필터 `select`를 담은 **표시 전용(presentational)** 컴포넌트입니다. 스스로 상태를 갖지 않고, 부모가 내려준 값(`keyword`, `status`)과 콜백(`onKeywordChange`, `onStatusChange`)만으로 동작합니다. 이것이 Day 2의 props와 Day 3의 이벤트를 잇는 지점입니다.

**`src/features/requests/RequestSearchBar.jsx`**

```jsx
import React from 'react';

// 상태 필터 옵션 (StatusTag의 상태값과 일치시킨다)
const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'REQUESTED', label: '요청됨' },
  { value: 'IN_PROGRESS', label: '처리중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'DONE', label: '완료' },
];

function RequestSearchBar({ keyword, status, onKeywordChange, onStatusChange }) {
  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-bar__input"
        placeholder="제목으로 검색"
        value={keyword}
        onChange={e => onKeywordChange(e.target.value)}
      />
      <select
        className="search-bar__select"
        value={status}
        onChange={e => onStatusChange(e.target.value)}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default RequestSearchBar;
```

핵심 포인트:
- **이 컴포넌트는 state가 없습니다.** 값과 변경 방법을 모두 props로 받습니다. 상태의 소유권은 부모(`RequestListPage`)에 있습니다 — 이를 **상태 끌어올리기(lifting state up)** 라고 합니다.
- `value`와 `onChange`가 짝을 이루는 **제어 컴포넌트**입니다.

### Step 3. 상태를 소유하는 페이지 — RequestListPage

이 화면이 상태(검색어·필터·요청 목록)를 소유하고, 필터링(파생 값)과 불변 업데이트를 담당합니다.

**`src/features/requests/RequestListPage.jsx`**

```jsx
import React, { useState } from 'react';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import RequestSearchBar from './RequestSearchBar';

// 컴포넌트 바깥에 초기 데이터를 둔다 (렌더링마다 새로 만들 필요 없음).
// Day 6에서 이 값이 API 응답으로 대체된다.
const INITIAL_REQUESTS = [
  { id: 1, title: '계정 권한 신청', requester: '홍길동', status: 'REQUESTED' },
  { id: 2, title: '장비 교체 요청', requester: '김철수', status: 'IN_PROGRESS' },
  { id: 3, title: '휴가 시스템 오류 접수', requester: '이영희', status: 'DONE' },
  { id: 4, title: 'VPN 접속 계정 요청', requester: '박민수', status: 'REQUESTED' },
  { id: 5, title: '사내 메신저 권한 요청', requester: '최지은', status: 'REJECTED' },
];

function RequestListPage() {
  // 원천 상태 3개
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');

  // 파생 값: 원천 상태로부터 매 렌더링마다 계산 (별도 state로 저장하지 않는다)
  const filtered = requests.filter(req => {
    const matchKeyword = req.title.includes(keyword.trim());
    const matchStatus = status === 'ALL' || req.status === status;
    return matchKeyword && matchStatus;
  });

  // 불변성 실습 1) 삭제: filter로 새 배열을 만들어 교체
  const handleDelete = id => {
    setRequests(prev => prev.filter(req => req.id !== id));
  };

  // 불변성 실습 2) 추가: spread로 새 배열을 만들어 교체
  const handleAddSample = () => {
    const nextId = Math.max(0, ...requests.map(r => r.id)) + 1;
    const newReq = {
      id: nextId,
      title: `임시 요청 ${nextId}`,
      requester: '테스트',
      status: 'REQUESTED',
    };
    setRequests(prev => [newReq, ...prev]);
  };

  return (
    <div className="request-list-page">
      <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />

      {/* 자식에게 값과 콜백을 내려준다 (상태 소유는 이 컴포넌트) */}
      <RequestSearchBar
        keyword={keyword}
        status={status}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
      />

      <div className="request-toolbar">
        <span className="request-toolbar__count">총 {filtered.length}건</span>
        <button type="button" className="btn" onClick={handleAddSample}>
          임시 요청 추가
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-box">조건에 맞는 요청이 없습니다.</p>
      ) : (
        <ul className="request-list">
          {filtered.map(req => (
            <li key={req.id} className="request-list__item">
              <div className="request-list__main">
                <span className="request-list__title">{req.title}</span>
                <span className="request-list__requester">{req.requester}</span>
              </div>
              <div className="request-list__side">
                <StatusTag status={req.status} />
                <button
                  type="button"
                  className="btn btn--text"
                  onClick={() => handleDelete(req.id)}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RequestListPage;
```

핵심 포인트(꼭 확인):
- **원천 상태는 3개**(`requests`, `keyword`, `status`)뿐이고, 화면에 보이는 `filtered`는 파생 값입니다.
- `setRequests(prev => ...)` — **함수형 업데이트**. "이전 상태(`prev`)를 기반으로 새 상태를 계산"할 때 안전한 형태입니다(연속 갱신 시 최신값 보장).
- `handleDelete`는 `filter`, `handleAddSample`은 spread(`[...]`)로 **새 배열을 만들어** 교체합니다. 어디서도 원본을 `push`/`splice`하지 않습니다.
- `onChange={e => onKeywordChange(e.target.value)}`(값 전달)와 `onClick={() => handleDelete(req.id)}`(인자 전달)의 차이를 관찰하세요.

### Step 4. App.jsx — 요청 목록 페이지 추가

아직 라우터가 없으므로, 대시보드 아래에 요청 목록을 함께 렌더링합니다(Day 8에서 라우팅으로 분리됩니다).

**`src/App.jsx`** (전체 교체)

```jsx
import React from 'react';
import DashboardPage from '@/features/dashboard/DashboardPage';
import RequestListPage from '@/features/requests/RequestListPage';

function App() {
  return (
    <div className="app-shell">
      <DashboardPage />
      <RequestListPage />
    </div>
  );
}

export default App;
```

### Step 5. 스타일 추가

`src/styles/global.css`에 아래를 **추가**합니다.

```css
/* ===== Day 3: 검색바 / 요청 목록 ===== */
.request-list-page {
  margin-top: 40px;
}

/* 검색바 */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.search-bar__input,
.search-bar__select {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
}
.search-bar__input {
  flex: 1;
}

/* 툴바 */
.request-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.request-toolbar__count {
  color: #666;
  font-size: 14px;
}

/* 버튼 */
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #1890ff;
  background: #1890ff;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn:hover {
  opacity: 0.9;
}
.btn--text {
  height: auto;
  padding: 0;
  border: none;
  background: none;
  color: #f5222d;
}

/* 목록 */
.request-list {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.request-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  list-style: none;
}
.request-list__item:last-child {
  border-bottom: none;
}
.request-list__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.request-list__title {
  font-weight: 600;
}
.request-list__requester {
  font-size: 13px;
  color: #999;
}
.request-list__side {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 빈 상태 */
.empty-box {
  padding: 40px;
  text-align: center;
  color: #999;
  background: #fff;
  border-radius: 8px;
}
```

### Step 6. 실행 확인

개발 서버가 켜져 있으면 저장 즉시 갱신됩니다.

동작을 하나씩 확인하세요.

- **검색**: 검색창에 "권한"을 입력 → 제목에 "권한"이 든 항목만 남고, "총 N건"이 즉시 줄어듭니다.
- **필터**: 상태 드롭다운에서 "요청됨" 선택 → `REQUESTED` 항목만 남습니다. 검색어와 **함께** 적용됩니다.
- **삭제**: 아무 항목의 "삭제"를 클릭 → 그 항목만 사라지고 카운트가 줄어듭니다(불변 삭제).
- **추가**: "임시 요청 추가" 클릭 → 목록 맨 위에 새 항목이 생깁니다(불변 추가).
- **빈 상태**: 존재하지 않는 단어를 검색 → "조건에 맞는 요청이 없습니다." 표시.

이 모든 것을 **DOM을 직접 만지지 않고 state만 바꿔서** 구현했다는 점을 음미하세요. 이것이 React식 사고입니다.

---

## 4. 개념 심화

### 4.1 상태를 어디에 둘 것인가 (lifting state up)

`keyword`/`status`를 `RequestSearchBar`가 아니라 `RequestListPage`가 소유합니다. 왜냐하면 **필터링(목록)도 그 값을 알아야 하기 때문**입니다. 두 컴포넌트가 같은 데이터를 공유해야 하면, 그 데이터를 **가장 가까운 공통 부모**로 끌어올립니다. 자식은 값을 props로 받고, 변경은 콜백으로 부모에 요청합니다. 이 패턴은 Day 9의 Redux(전역 상태)로 자연스럽게 확장됩니다.

### 4.2 함수형 업데이트 `setX(prev => ...)`를 언제 쓰나

새 상태가 **이전 상태에 의존**할 때 씁니다. 예: `setRequests(prev => [newReq, ...prev])`. 이전 값을 직접 참조(`[newReq, ...requests]`)해도 대개 동작하지만, 짧은 시간에 여러 번 갱신하거나 비동기 상황에서는 최신값이 보장되지 않을 수 있습니다. **"이전 값 기반 계산"이면 함수형 업데이트가 안전**합니다.

### 4.3 왜 원천 상태를 최소화하나

`filtered`를 state로 두지 않은 이유(1.8)를 다시 봅니다. 상태가 많을수록 "동기화해야 할 것"이 늘고 버그가 생깁니다. **바꿀 수 있는 최소한의 값만 state로 두고, 나머지는 계산**하세요. 좋은 React 코드의 핵심 습관입니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 입력창에 타이핑이 안 됨

- **원인**: `value`만 주고 `onChange`를 뺀 제어 컴포넌트. 값이 state에 고정됩니다.
- **해결**: `onChange={e => setKeyword(e.target.value)}`를 반드시 함께 지정.

### 5.2 버튼이 클릭 전에 저절로 실행됨 / 무한 루프

- **원인**: `onClick={handleDelete(id)}`처럼 함수를 **호출**해서 넘김. 렌더링 시 즉시 실행되고, 그게 setState라면 리렌더 → 또 실행 → `Too many re-renders`.
- **해결**: `onClick={() => handleDelete(id)}`로 감싸 "클릭 시 실행"으로 만들기.

### 5.3 state를 바꿨는데 화면이 안 바뀜

- **원인**: 원본을 직접 수정(`requests.push(...)`, `req.status = ...`) 후 `setRequests(requests)`. 참조가 같아 리렌더 누락.
- **해결**: 새 배열/객체를 만들어 교체(`[...]`, `filter`, `map`, `{ ...obj }`).

### 5.4 `React Hook "useState" is called conditionally`

- **원인**: `if`문/반복문/중첩 함수 안에서 `useState` 호출.
- **해결**: 항상 컴포넌트 함수 **최상위**에서 호출(1.4 규칙).

### 5.5 `Too many re-renders`

- **원인**: 렌더링 중에 `setState`를 직접 호출(예: `onClick={setCount(1)}` 또는 JSX 본문에서 setState 호출).
- **해결**: setState는 **이벤트 핸들러나 effect 안에서만**. JSX에는 "실행될 함수"를 넘기기.

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. props와 state의 차이는?

props는 부모가 내려주는 읽기 전용 입력값이고, state는 컴포넌트가 소유하며 시간에 따라 바뀌는 값입니다. state가 바뀌면 컴포넌트가 리렌더링됩니다.

### Q2. `requests.push(x); setRequests(requests);`가 왜 문제인가?

기존 배열을 직접 수정해 참조가 그대로이므로, React가 "상태가 안 바뀌었다"고 판단해 리렌더링을 건너뛸 수 있고 원본도 훼손됩니다. `setRequests([...requests, x])`처럼 새 배열로 교체해야 합니다.

### Q3. `onClick={handleDelete(id)}`와 `onClick={() => handleDelete(id)}`의 차이는?

앞은 렌더링 시 `handleDelete(id)`를 즉시 호출해 그 반환값을 넘깁니다(오작동). 뒤는 "클릭 시 `handleDelete(id)`를 실행하는 함수"를 넘깁니다(정상).

### Q4. 제어 컴포넌트란?

입력 요소의 `value`를 state에 묶고 `onChange`로 state를 갱신해, state를 값의 유일한 출처로 삼는 방식입니다.

### Q5. 필터링된 목록을 왜 별도 state로 저장하지 않나?

원천 state(요청 목록·검색어·필터)로부터 매 렌더링마다 계산할 수 있는 파생 값이기 때문입니다. 별도 state로 두면 동기화 부담과 불일치 버그가 생깁니다.

---

## 7. Day 3 완료 체크리스트

- [ ] `useState`로 `keyword`, `status`, `requests` 세 상태를 만들었다.
- [ ] `RequestSearchBar`를 제어 컴포넌트(`value` + `onChange`)로 작성했다.
- [ ] 검색어와 상태 필터가 **함께** 적용되는 필터링을 파생 값으로 구현했다.
- [ ] 삭제(`filter`)와 추가(`spread`)를 불변 방식으로 구현했다.
- [ ] 원본을 직접 수정하는 코드(`push`, 속성 직접 대입)가 없다.
- [ ] 상태 소유를 부모(`RequestListPage`)에 두고 자식에 값/콜백을 내려주는 구조를 이해했다.
- [ ] 검색·필터·삭제·추가·빈 상태가 화면에서 모두 동작한다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 4 예고)

Day 4에서는 오늘 순수 HTML로 만든 화면을 **antd 컴포넌트**로 바꿉니다. `Layout`/`Menu`로 관리자 레이아웃을 잡고, 목록을 `Table`로, 검색·필터를 `Input`/`Select`로, 상세를 `Modal`로 표현합니다. 오늘 익힌 state·이벤트·제어 컴포넌트 개념은 antd에서도 그대로 쓰이며, antd의 `Table`/`Form`은 그 개념 위에 편의를 얹은 것임을 확인하게 됩니다. (antd v3와 v4는 API가 다르므로 설치된 버전 확인이 중요합니다 — Day 4에서 다룹니다.)

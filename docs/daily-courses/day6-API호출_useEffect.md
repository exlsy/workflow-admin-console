# Day 6 — API 호출과 useEffect

> WorkFlow Admin Console 2주 코스의 여섯째 날입니다.  
> Day 5까지 브라우저 메모리로만 다루던 데이터를 **실제 API(json-server)** 와 연결합니다.  
> 이 문서 하나만 따라 하면 `axios`로 요청 목록·상세를 조회하고, `useEffect`로 화면 진입 시 데이터를 불러오며, **로딩/에러/성공** 상태를 화면에 표시하는 것까지 완성합니다.

---

## 0. 이 문서를 마치면

- 컴포넌트가 화면에 나타날 때(마운트) `useEffect`로 API를 호출하는 흐름을 이해합니다.
- `useEffect`의 **의존성 배열**(`[]` vs `[id]`)과 **정리(cleanup) 함수**의 역할을 이해합니다.
- **loading / error / success** 세 가지 상태를 관리해 로딩 스피너와 에러 메시지를 표시합니다.
- `axios` 인스턴스(`api/client.js`)와 도메인 API 모듈(`api/requestApi.js`)을 만들어 서버와 통신합니다.
- Day 5에서 메모리에만 추가하던 등록/삭제를 **서버 요청(POST/DELETE)** 으로 바꾸고 목록을 다시 불러옵니다.

### 앞선 Day와의 연결

- **Day 1**: webpack `devServer.proxy`에 넣어 둔 `/api` → `:4000` 프록시와 `pathRewrite`가 **오늘 진가를 발휘**합니다.
- **Day 3**: 목록은 여전히 `useState`로 관리하지만, 초기값이 하드코딩에서 **서버 응답**으로 바뀝니다.
- **Day 4**: 상세 `Modal`을 유지하되, 저장된 행을 그냥 보여주던 것에서 **상세를 서버에서 다시 조회**하도록 바꿉니다.
- **Day 5**: `handleCreate`가 메모리 추가에서 **`POST` 요청 + 재조회**로 바뀝니다(Day 5 예고대로).

### Day 6에서 다루지 않는 것 (혼동 방지)

- **Redux/redux-thunk로 API 상태 관리** → Day 9~10. 오늘의 loading/error는 컴포넌트 지역 상태로 둡니다.
- **로그인/인증** → Day 8~9. 오늘은 요청(requests) 리소스만 다룹니다.
- **서버 사이드 페이징/검색** → Day 12. 오늘은 전체를 받아 **클라이언트에서** 필터링합니다(Day 3 방식 유지).
- **상태 변경/승인/반려(PATCH)** → Day 13. 오늘은 조회(GET)·등록(POST)·삭제(DELETE)까지.

### 최종 산출물 폴더 구조 (Day 6 기준)

```txt
workflow-admin-console/
  db.json                       (신규 - mock DB, 프로젝트 루트)
  package.json                  (mock 스크립트 추가)
  src/
    api/
      client.js                 (신규 - axios 인스턴스)
      requestApi.js             (신규 - 요청 도메인 API)
    features/
      requests/
        RequestListPage.jsx     (API 연동으로 교체)
        RequestDetailModal.jsx  (신규 - 상세 조회 + 처리 이력)
        RequestForm.jsx         (변경 없음)
        RequestSearchBar.jsx    (변경 없음)
```

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 부수 효과(side effect)와 useEffect

React 컴포넌트 함수의 본체는 **"현재 state/props로 화면을 계산"** 하는 순수한 일만 해야 합니다. API 호출, 타이머, 구독처럼 **바깥 세계와 상호작용하는 일(부수 효과)** 을 렌더링 도중에 하면 안 됩니다(리렌더마다 중복 실행되고 예측 불가).

이런 부수 효과는 `useEffect` 안에서 합니다. `useEffect`는 **"렌더링이 끝난 뒤 실행할 일"** 을 예약합니다.

```jsx
import React, { useEffect } from 'react';

useEffect(() => {
  // 렌더링 후 실행 (여기서 API 호출)
}, []); // 의존성 배열
```

### 1.2 의존성 배열이 실행 시점을 결정한다

`useEffect`의 두 번째 인자(의존성 배열)가 **언제 다시 실행할지**를 정합니다.

- **`[]` (빈 배열)** — **마운트(최초 등장) 시 1회만** 실행. 목록을 처음 불러올 때 사용.
- **`[id]`** — `id` 값이 바뀔 때마다 실행. 상세 조회처럼 "특정 값이 바뀌면 다시 불러와야" 할 때.
- **생략** — **매 렌더링마다** 실행. API 호출에 쓰면 무한 루프의 지름길이니 거의 쓰지 않습니다.

```jsx
useEffect(() => { loadList(); }, []);        // 마운트 시 목록 조회
useEffect(() => { loadDetail(id); }, [id]);  // id 바뀔 때 상세 조회
```

### 1.3 useEffect 안에서 async 쓰는 법

`useEffect(async () => {...})`처럼 **콜백 자체를 async로 만들면 안 됩니다**(effect는 정리 함수를 반환해야 하는데 async 함수는 Promise를 반환하기 때문). 안쪽에 async 함수를 정의해 호출합니다.

```jsx
useEffect(() => {
  const load = async () => {
    const data = await requestApi.fetchRequests();
    setRequests(data);
  };
  load();
}, []);
```

### 1.4 loading / error / success 3-상태 패턴

비동기 조회는 세 가지 상태를 갖습니다. 이 셋을 명시적으로 관리하는 것이 실무의 기본입니다.

```jsx
const [data, setData] = useState(null);      // success 결과
const [loading, setLoading] = useState(false); // 진행 중?
const [error, setError] = useState(null);      // 실패 메시지

const load = async () => {
  setLoading(true);   // 시작: 로딩 on, 에러 초기화
  setError(null);
  try {
    const result = await requestApi.fetchRequests();
    setData(result);  // 성공
  } catch (e) {
    setError('불러오지 못했습니다.'); // 실패
  } finally {
    setLoading(false); // 성공/실패 무관하게 로딩 off
  }
};
```

- `try`에서 성공 처리, `catch`에서 에러 처리, `finally`에서 **반드시** 로딩 종료.
- 화면은 이 상태에 따라 스피너(`Spin`)·에러(`Alert`)·데이터(`Table`)를 나눠 그립니다.

### 1.5 axios 기본

`axios`는 HTTP 클라이언트입니다. 공통 설정(기본 URL, 타임아웃)을 담은 **인스턴스**를 만들어 재사용합니다.

```jsx
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',   // 모든 요청 앞에 /api 가 붙는다
  timeout: 5000,     // 5초 넘으면 실패 처리
});
```

주요 메서드:

- `client.get('/requests')` — 목록/단건 조회
- `client.get('/requests/1')` — 특정 id 조회
- `client.post('/requests', payload)` — 생성
- `client.delete('/requests/1')` — 삭제
- `client.patch('/requests/1', partial)` — 부분 수정(Day 13)

응답 본문은 **`res.data`** 에 들어 있습니다. 실패(4xx/5xx/네트워크)는 `catch`로 던져집니다.

```jsx
const data = await client.get('/requests').then(res => res.data);
```

### 1.6 baseURL은 '/api'인데 왜 json-server(:4000)로 갈까

`client`의 `baseURL`은 `http://localhost:4000`이 **아니라** `/api`입니다. 서버 주소를 코드에 박지 않는 이유는 Day 1에서 깔아 둔 **개발 서버 프록시** 때문입니다.

```txt
브라우저(axios): GET /api/requests
   ↓ webpack-dev-server(:3000) proxy
   ↓ pathRewrite: '^/api' → ''  (Day 1 설정)
json-server(:4000): GET /requests
```

이 구조 덕분에 **CORS 문제가 없고**, 나중에 실제 서버로 바꿀 때 프록시 설정만 고치면 됩니다. `baseURL`에 `http://localhost:4000`을 직접 쓰면 CORS 에러가 나기 쉬우니, **`/api`를 그대로** 씁니다.

### 1.7 경쟁 상태(race condition)와 정리(cleanup) 함수

상세 조회처럼 `id`가 빠르게 바뀌면, **먼저 보낸 요청이 나중에 도착**해 엉뚱한 데이터를 덮어쓸 수 있습니다. `useEffect`가 반환하는 **정리 함수**로 "이전 요청 결과 무시" 플래그를 세워 막습니다.

```jsx
useEffect(() => {
  let ignore = false;                 // 이 실행의 결과가 유효한가
  const load = async () => {
    const data = await requestApi.fetchRequest(id);
    if (!ignore) setDetail(data);     // 무시 플래그가 없을 때만 반영
  };
  load();
  return () => { ignore = true; };    // 다음 실행/언마운트 직전 호출됨
}, [id]);
```

정리 함수는 **다음 effect 실행 직전**과 **컴포넌트 언마운트 직전**에 호출됩니다.

---

## 2. 설치와 mock 서버 준비

### 2.1 패키지 설치

```bash
npm install axios
npm install -D json-server
```

- `axios` — 런타임 의존성(앱 코드에서 사용)
- `json-server` — 개발용 mock API 서버(개발 의존성)

### 2.2 mock 데이터 파일 만들기

프로젝트 **루트**에 `db.json`을 만듭니다. json-server는 이 파일의 최상위 key(`requests`, `users`)를 각각 하나의 리소스 엔드포인트로 제공합니다.

**`db.json`** (프로젝트 루트)

```json
{
  "requests": [
    {
      "id": 1,
      "title": "계정 권한 신청",
      "requester": "홍길동",
      "department": "개발팀",
      "priority": "HIGH",
      "status": "REQUESTED",
      "content": "운영 시스템 접근 권한이 필요합니다.",
      "createdAt": "2026-07-01",
      "history": [
        { "message": "요청이 등록되었습니다.", "createdAt": "2026-07-01 09:30" }
      ]
    },
    {
      "id": 2,
      "title": "장비 교체 요청",
      "requester": "김철수",
      "department": "인프라팀",
      "priority": "MEDIUM",
      "status": "IN_PROGRESS",
      "content": "노트북 배터리 불량으로 교체가 필요합니다.",
      "createdAt": "2026-07-02",
      "history": [
        { "message": "요청이 등록되었습니다.", "createdAt": "2026-07-02 10:00" },
        { "message": "처리를 시작했습니다.", "createdAt": "2026-07-02 14:20" }
      ]
    },
    {
      "id": 3,
      "title": "휴가 시스템 오류 접수",
      "requester": "이영희",
      "department": "인사팀",
      "priority": "HIGH",
      "status": "DONE",
      "content": "휴가 신청 화면이 로딩되지 않습니다.",
      "createdAt": "2026-07-03",
      "history": [
        { "message": "요청이 등록되었습니다.", "createdAt": "2026-07-03 09:10" },
        { "message": "완료 처리되었습니다.", "createdAt": "2026-07-03 17:40" }
      ]
    },
    {
      "id": 4,
      "title": "VPN 접속 계정 요청",
      "requester": "박민수",
      "department": "영업팀",
      "priority": "LOW",
      "status": "REQUESTED",
      "content": "재택근무용 VPN 계정을 신청합니다.",
      "createdAt": "2026-07-04",
      "history": [
        { "message": "요청이 등록되었습니다.", "createdAt": "2026-07-04 11:05" }
      ]
    },
    {
      "id": 5,
      "title": "사내 메신저 권한 요청",
      "requester": "최지은",
      "department": "디자인팀",
      "priority": "MEDIUM",
      "status": "REJECTED",
      "content": "외부 협력사 채널 접근 권한 요청.",
      "createdAt": "2026-07-05",
      "history": [
        { "message": "요청이 등록되었습니다.", "createdAt": "2026-07-05 13:30" },
        { "message": "반려되었습니다.", "createdAt": "2026-07-05 15:00" }
      ]
    }
  ],
  "users": [
    { "id": 1, "username": "admin", "name": "관리자", "role": "ADMIN" }
  ]
}
```

> json-server는 `POST` 시 `id`를 **자동 부여**하고, 변경 사항을 `db.json`에 **실제로 기록**합니다(파일이 바뀜). 그래서 새로고침해도 데이터가 유지됩니다.

### 2.3 mock 스크립트 추가

`package.json`의 `scripts`에 `mock`을 추가합니다(Day 1의 start/build는 그대로 둡니다).

```json
{
  "scripts": {
    "start": "cross-env NODE_OPTIONS=--openssl-legacy-provider webpack-dev-server --mode development",
    "build": "cross-env NODE_OPTIONS=--openssl-legacy-provider NODE_ENV=production webpack --mode production",
    "mock": "json-server --watch db.json --port 4000"
  }
}
```

### 2.4 두 개의 터미널로 실행

**mock 서버와 개발 서버는 각각 다른 터미널에서** 실행합니다.

```bash
# 터미널 A — mock API (먼저 실행)
npm run mock
# → http://localhost:4000/requests 에서 데이터 확인 가능

# 터미널 B — 개발 서버
npm start
```

브라우저에서 `http://localhost:4000/requests`를 직접 열어 JSON이 보이면 mock 서버가 정상입니다.

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. axios 인스턴스 — api/client.js

**`src/api/client.js`** (신규)

```jsx
import axios from 'axios';

// 공통 설정을 담은 axios 인스턴스.
// baseURL '/api' 는 개발 서버 프록시(Day 1)를 통해 json-server(:4000)로 전달된다.
const client = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export default client;
```

### Step 2. 도메인 API 모듈 — api/requestApi.js

컴포넌트가 axios 세부사항을 몰라도 되도록, **요청(requests) 관련 호출을 함수로 감쌉니다.** 화면은 "무엇을 하는지"(`fetchRequests`)만 알면 됩니다.

**`src/api/requestApi.js`** (신규)

```jsx
import client from './client';

// 목록 조회
export function fetchRequests() {
  return client.get('/requests').then(res => res.data);
}

// 단건(상세) 조회
export function fetchRequest(id) {
  return client.get(`/requests/${id}`).then(res => res.data);
}

// 등록 (id는 서버가 자동 부여)
export function createRequest(payload) {
  return client.post('/requests', payload).then(res => res.data);
}

// 삭제
export function deleteRequest(id) {
  return client.delete(`/requests/${id}`).then(res => res.data);
}
```

### Step 3. 목록 페이지를 API 연동으로 교체

Day 5의 `RequestListPage`에서 하드코딩 초기값을 없애고, 마운트 시 서버에서 목록을 불러옵니다. 등록/삭제도 서버 요청 후 목록을 다시 조회합니다.

**`src/features/requests/RequestListPage.jsx`** (전체 교체)

```jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Space, message, Spin, Alert } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import RequestSearchBar from './RequestSearchBar';
import RequestForm from './RequestForm';
import RequestDetailModal from './RequestDetailModal';
import * as requestApi from '@/api/requestApi';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };

function RequestListPage() {
  // 서버 데이터 + 조회 상태
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 화면 상태 (Day 3~5)
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null); // 상세 조회 대상 id
  const [createOpen, setCreateOpen] = useState(false);

  // 목록 조회 (마운트 시 + 등록/삭제 후 재사용)
  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestApi.fetchRequests();
      setRequests(data);
    } catch (e) {
      setError('요청 목록을 불러오지 못했습니다. mock 서버(:4000)가 실행 중인지 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  // 최초 마운트 시 1회
  useEffect(() => {
    loadRequests();
  }, []);

  // 파생 값: 클라이언트 필터 (Day 3)
  const filtered = requests.filter(req => {
    const matchKeyword = req.title.includes(keyword.trim());
    const matchStatus = status === 'ALL' || req.status === status;
    return matchKeyword && matchStatus;
  });

  // 등록: POST 후 재조회 (Day 5의 handleCreate가 API 호출로 진화)
  const handleCreate = async values => {
    try {
      await requestApi.createRequest({
        ...values,
        status: 'REQUESTED',
        createdAt: new Date().toISOString().slice(0, 10),
        history: [
          { message: '요청이 등록되었습니다.', createdAt: new Date().toISOString() },
        ],
      });
      setCreateOpen(false);
      message.success('업무 요청이 등록되었습니다.');
      loadRequests();
    } catch (e) {
      message.error('등록에 실패했습니다.');
    }
  };

  // 삭제: DELETE 후 재조회
  const handleDelete = record => {
    Modal.confirm({
      title: '요청 삭제',
      content: `"${record.title}" 요청을 삭제할까요?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await requestApi.deleteRequest(record.id);
          message.success('삭제되었습니다.');
          loadRequests();
        } catch (e) {
          message.error('삭제에 실패했습니다.');
        }
      },
    });
  };

  const columns = [
    { title: '제목', dataIndex: 'title', key: 'title' },
    { title: '요청자', dataIndex: 'requester', key: 'requester' },
    { title: '부서', dataIndex: 'department', key: 'department' },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      render: value => PRIORITY_LABEL[value] || value,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: value => <StatusTag status={value} />,
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelectedId(record.id)}>상세</Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>삭제</Button>
        </Space>
      ),
    },
  ];

  // 에러가 나면 목록 대신 에러 + 다시 시도 버튼
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="불러오기 실패"
        description={error}
        action={<Button onClick={loadRequests}>다시 시도</Button>}
      />
    );
  }

  return (
    <div>
      <div className="page-head">
        <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />
        <Button type="primary" onClick={() => setCreateOpen(true)}>신규 요청</Button>
      </div>

      <RequestSearchBar
        keyword={keyword}
        status={status}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
      />

      {/* 로딩 중에는 Table 위에 스피너 오버레이 */}
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 5 }}
        />
      </Spin>

      {/* 상세: id를 넘기면 모달이 스스로 조회 */}
      <RequestDetailModal id={selectedId} onClose={() => setSelectedId(null)} />

      {/* 등록 폼 (Day 5) */}
      <Modal
        title="신규 업무 요청"
        visible={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <RequestForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

export default RequestListPage;
```

핵심 포인트:
- 초기값이 `[]`입니다. **처음엔 비어 있고**, `useEffect`가 서버에서 채웁니다.
- `loadRequests`를 한 번 만들어 **마운트/등록 후/삭제 후/재시도** 모두에서 재사용합니다.
- 검색·필터는 여전히 **클라이언트에서** 처리(Day 3). 서버 페이징은 Day 12.
- 상세는 저장된 행을 넘기지 않고 **`id`만** 넘깁니다. 모달이 그 id로 직접 조회합니다(Step 4).

### Step 4. 상세 조회 모달 — RequestDetailModal

`id`를 받아 **서버에서 상세를 조회**하고, 처리 이력(`history`)까지 보여주는 모달입니다. 상세 조회의 loading/error를 이 컴포넌트가 스스로 관리합니다. `useEffect`의 의존성 배열 `[id]`와 정리 함수(경쟁 상태 방지)를 여기서 실습합니다.

**`src/features/requests/RequestDetailModal.jsx`** (신규)

```jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Descriptions, Spin, Alert, Timeline } from 'antd';
import StatusTag from '@/components/common/StatusTag';
import * as requestApi from '@/api/requestApi';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };

function RequestDetailModal({ id, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id == null) return;        // 닫힌 상태(id 없음)면 아무것도 하지 않음

    let ignore = false;            // 경쟁 상태 방지 플래그
    const load = async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const data = await requestApi.fetchRequest(id);
        if (!ignore) setDetail(data);
      } catch (e) {
        if (!ignore) setError('상세 정보를 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();

    return () => { ignore = true; }; // 다음 조회/언마운트 시 이전 결과 무시
  }, [id]);                          // id가 바뀔 때마다 재조회

  return (
    <Modal
      title="요청 상세"
      visible={id != null}
      onCancel={onClose}
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {error && <Alert type="error" showIcon message={error} />}

      {detail && (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="제목">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="요청자">{detail.requester}</Descriptions.Item>
            <Descriptions.Item label="부서">{detail.department}</Descriptions.Item>
            <Descriptions.Item label="우선순위">
              {PRIORITY_LABEL[detail.priority] || detail.priority}
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <StatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="내용">{detail.content}</Descriptions.Item>
          </Descriptions>

          <h4 style={{ margin: '16px 0 8px' }}>처리 이력</h4>
          <Timeline>
            {(detail.history || []).map((h, index) => (
              <Timeline.Item key={index}>
                {h.message}{' '}
                <span style={{ color: '#999' }}>({h.createdAt})</span>
              </Timeline.Item>
            ))}
          </Timeline>
        </>
      )}
    </Modal>
  );
}

export default RequestDetailModal;
```

핵심 포인트:
- `visible={id != null}` — 부모가 `selectedId`를 넣으면 열리고, `null`로 만들면 닫힙니다.
- `useEffect(..., [id])` — 다른 행의 상세를 열면 `id`가 바뀌어 **자동으로 재조회**됩니다.
- 정리 함수(`return () => { ignore = true; }`)로 빠르게 여닫을 때 이전 응답이 새 화면을 덮어쓰는 문제를 막습니다.
- `Timeline`으로 처리 이력을 시간순으로 표시합니다(Day 13에서 승인/반려 시 이 이력이 늘어납니다).

### Step 5. 실행 확인

**두 터미널**이 모두 떠 있어야 합니다(`npm run mock`, `npm start`). 사이드바에서 **업무 요청** 화면으로 이동해 확인하세요.

- 화면 진입 시 잠깐 **스피너** → json-server의 5개 요청이 Table에 표시
- 검색어/상태 필터가 그대로 동작(클라이언트 필터)
- **상세** 클릭 → 모달이 열리며 스피너 → 서버 상세 + **처리 이력(Timeline)** 표시
- **신규 요청** 등록 → 성공 메시지 → 목록 재조회로 새 항목 반영(`db.json`에도 기록됨)
- **삭제** → 확인 → 목록에서 사라짐(`db.json`에서도 삭제)
- **에러 확인**: 터미널 A의 mock 서버를 잠깐 끄고 새로고침 → "불러오기 실패" 에러 + **다시 시도** 버튼. 서버를 다시 켜고 "다시 시도"를 누르면 복구됩니다.

`db.json` 파일을 열어 보면 등록/삭제가 실제로 파일에 반영된 것을 확인할 수 있습니다.

---

## 4. 개념 심화

### 4.1 API 계층을 왜 따로 두나 (client.js / requestApi.js)

컴포넌트가 `axios.get('http://...')`를 직접 호출하지 않고 `requestApi.fetchRequests()`를 부릅니다. 이렇게 **API 접근을 한 겹 감싸면**:
- 화면 코드가 깔끔해지고(HTTP 세부사항 숨김), 같은 호출을 여러 곳에서 재사용합니다.
- baseURL·타임아웃·인증 헤더·에러 처리 같은 공통 정책을 `client.js` 한 곳에서 바꿉니다.
- Day 10에서 이 API 함수들을 **redux-thunk** 액션이 그대로 호출하게 됩니다. 오늘 만든 계층이 그때 재사용됩니다.

### 4.2 "등록 후 재조회" vs "낙관적 업데이트"

오늘은 등록/삭제 후 `loadRequests()`로 **서버에서 다시 받아** 화면을 맞췄습니다(단순·정확). 대안으로 서버 응답을 기다리지 않고 화면 state를 먼저 바꾸는 **낙관적 업데이트**도 있지만, 실패 시 되돌리는 처리가 필요해 더 복잡합니다. 학습 단계에서는 **재조회 방식이 안전**합니다.

### 4.3 왜 상세를 다시 조회하나 (목록에 이미 있는데)

목록 응답은 화면에 필요한 최소 정보만, 상세 응답은 `history` 같은 **더 풍부한 정보**를 담는 경우가 많습니다(실제 API 설계에서 흔함). 그래서 상세 화면에서 별도 조회로 전체 데이터를 받는 패턴을 연습합니다. 지금은 mock이라 내용이 같아 보이지만, 구조는 실무와 동일합니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 `GET /api/requests 404`

- **원인**: (a) Day 1의 `pathRewrite: { '^/api': '' }`가 없어서 `/api/requests`가 그대로 json-server에 감, 또는 (b) mock 서버 미실행.
- **해결**: `webpack.config.js`의 프록시에 `pathRewrite` 확인(Day 1). 터미널 A에서 `npm run mock` 실행 확인.

### 5.2 `Network Error` / `ECONNREFUSED`

- **원인**: json-server(:4000)가 꺼져 있음.
- **해결**: `npm run mock`을 별도 터미널에서 실행. `http://localhost:4000/requests`가 열리는지 확인.

### 5.3 CORS 에러

- **원인**: `baseURL`에 `http://localhost:4000`을 직접 씀(프록시 우회 → 교차 출처).
- **해결**: `baseURL: '/api'`로 두고 개발 서버 프록시를 통하게 함(1.6).

### 5.4 화면이 무한 로딩 / 요청이 계속 나감

- **원인**: `useEffect`에 의존성 배열을 안 줬거나(매 렌더 실행), effect 안에서 매번 새 값이 되는 것을 의존성에 넣음.
- **해결**: 목록 조회는 `[]`(마운트 1회), 상세는 `[id]`. 함수/객체를 의존성에 넣을 땐 주의.

### 5.5 `useEffect must not return a promise` / async 관련 경고

- **원인**: `useEffect(async () => {...})`처럼 콜백을 async로 만듦.
- **해결**: effect 안에서 async 함수를 정의해 호출(1.3).

### 5.6 등록/삭제했는데 목록이 안 바뀜

- **원인**: 요청 후 재조회(`loadRequests()`)를 호출하지 않음.
- **해결**: POST/DELETE 성공 후 `loadRequests()` 호출(또는 낙관적 업데이트).

### 5.7 상세를 빠르게 여러 번 열면 엉뚱한 데이터가 보임

- **원인**: 경쟁 상태. 먼저 보낸 요청이 늦게 도착해 덮어씀.
- **해결**: `useEffect` 정리 함수 + `ignore` 플래그로 이전 결과 무시(1.7).

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. API 호출을 왜 렌더링 본문이 아니라 `useEffect`에서 하나?

렌더링 본문은 화면을 계산하는 순수한 일만 해야 합니다. API 호출 같은 부수 효과를 본문에서 하면 매 렌더마다 중복 실행되고 예측이 어렵습니다. `useEffect`는 렌더링 후 실행을 예약하고 실행 시점을 제어할 수 있습니다.

### Q2. 의존성 배열 `[]`와 `[id]`는 어떻게 다른가?

`[]`는 마운트 시 1회만 실행합니다(목록 최초 조회). `[id]`는 `id`가 바뀔 때마다 실행합니다(상세 재조회). 배열을 생략하면 매 렌더마다 실행됩니다.

### Q3. loading/error/success는 어떻게 관리하나?

`loading`/`error`/`data` 상태를 두고, 호출 시작에 `loading=true`·`error=null`, `try`에서 성공 데이터, `catch`에서 에러, `finally`에서 `loading=false`로 처리합니다. 화면은 이 상태에 따라 스피너/에러/데이터를 나눠 그립니다.

### Q4. `baseURL`이 `/api`인데 어떻게 json-server(:4000)로 도달하나?

webpack-dev-server의 프록시가 `/api` 요청을 `:4000`으로 전달하고, `pathRewrite`로 `/api` 접두사를 제거하기 때문입니다(Day 1 설정). 덕분에 CORS 없이 통신합니다.

### Q5. `useEffect`의 정리(cleanup) 함수는 왜 필요한가?

다음 effect 실행/언마운트 직전에 정리를 수행합니다. 비동기 조회에서 `ignore` 플래그를 세워, 빠르게 여닫을 때 이전 요청 결과가 새 화면을 덮어쓰는 경쟁 상태를 막는 데 사용합니다.

---

## 7. Day 6 완료 체크리스트

- [ ] `axios`와 `json-server`를 설치했다.
- [ ] 루트에 `db.json`을 만들고 `mock` 스크립트를 추가했다.
- [ ] `npm run mock`(:4000)과 `npm start`(:3000)를 각각 실행했다.
- [ ] `api/client.js`(baseURL `/api`)와 `api/requestApi.js`를 만들었다.
- [ ] `RequestListPage`가 마운트 시 `useEffect`로 목록을 조회한다.
- [ ] loading(스피너)·error(Alert + 다시 시도)·success(Table)를 화면에 표시한다.
- [ ] `RequestDetailModal`이 `id`로 상세를 조회하고 처리 이력을 보여준다.
- [ ] 등록(POST)·삭제(DELETE) 후 목록을 재조회한다.
- [ ] mock 서버를 껐을 때 에러 화면이 뜨고, 켜고 재시도 시 복구된다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 7 예고)

Day 7은 **1주차 통합**입니다. 지금까지 만든 Webpack 기반 React 16 앱, antd 레이아웃, 대시보드, 요청 목록(검색/필터), 상세 모달, 등록 폼, mock API 연동을 하나의 동작하는 앱으로 점검·정리합니다. 코드 중복을 줄이고(공통 로딩/에러 컴포넌트 정리 등), 1주차 복습 체크리스트로 개념을 다집니다. 이후 2주차(Day 8~)에서는 **React Router**로 화면을 URL 기반으로 분리하고, **Redux**로 상태를 전역화하며, 오늘 만든 API 계층을 **redux-thunk** 위로 끌어올립니다.

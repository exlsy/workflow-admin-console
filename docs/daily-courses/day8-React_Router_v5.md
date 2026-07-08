# Day 8 — React Router v5

> WorkFlow Admin Console 2주 코스의 여덟째 날, 2주차의 시작입니다.  
> Day 4~7까지 사이드바 메뉴를 **state로** 전환하던 방식을, **URL 기반 라우팅**으로 바꿉니다.  
> 이 문서 하나만 따라 하면 `react-router-dom@5`로 `/dashboard`·`/requests`·`/requests/new`·`/requests/:id`·`/login`·404 라우트를 구성하고, 상세 모달을 상세 **페이지**로 승격시키는 것까지 완성합니다.

---

## 0. 이 문서를 마치면

- React Router v5의 구조(`BrowserRouter`/`Switch`/`Route`)를 이해하고 화면을 URL로 분리합니다.
- `Link`/`NavLink`로 새로고침 없는 이동을, `useHistory`로 코드에서의 이동을 구현합니다.
- `useParams`로 URL 파라미터(`:id`)를 읽어 상세 페이지를 만듭니다.
- `Redirect`와 catch-all 라우트로 기본 경로 이동과 404 페이지를 처리합니다.
- Day 4~7의 "메뉴 state 전환"과 "상세/등록 모달"을 **라우트 기반 페이지**로 재구성합니다.

### 앞선 Day와의 연결

- **Day 1**: webpack `devServer.historyApiFallback: true`가 **오늘 필수**가 됩니다(주소로 직접 들어가거나 새로고침해도 앱이 뜨게).
- **Day 4/7**: 사이드바 메뉴 `state` 전환 → `useHistory`/`useLocation` 기반 라우팅으로 교체.
- **Day 5**: 등록 폼 `RequestForm`을 **`/requests/new` 페이지**에서 재사용(모달 대신).
- **Day 6/7**: 상세 모달(`RequestDetailModal`)을 **`/requests/:id` 페이지**(`RequestDetailPage`)로 승격(예고대로).

### Day 8에서 다루지 않는 것 (혼동 방지)

- **실제 로그인 인증 / `PrivateRoute` 접근 제어** → Day 9. 오늘 로그인은 **임시로 통과**시켜 라우팅 골격에만 집중합니다.
- **Redux 전역 상태** → Day 9~10. 목록/상세 데이터는 여전히 각 페이지의 지역 상태로 조회합니다.
- **라우터 v6/v7 문법** → 이 코스는 **v5**입니다(1.9의 버전 주의 참고).

### 최종 산출물 폴더 구조 (Day 8 기준)

```txt
workflow-admin-console/
  src/
    routes/
      AppRouter.jsx          (신규 - 라우트 정의)
    components/
      common/
        NotFoundPage.jsx     (신규 - 404)
      layout/
        AppLayout.jsx        (라우터 대응으로 수정)
        Sidebar.jsx          (라우터 대응으로 수정)
    features/
      auth/
        LoginPage.jsx        (신규 - 임시 로그인)
      requests/
        RequestListPage.jsx    (모달 제거 → 페이지 이동)
        RequestCreatePage.jsx  (신규 - /requests/new)
        RequestDetailPage.jsx  (신규 - /requests/:id, 모달 대체)
        RequestForm.jsx        (변경 없음)
        RequestSearchBar.jsx   (변경 없음)
    App.jsx                    (BrowserRouter로 감쌈)
    styles/
      global.css              (로그인 화면 스타일 추가)
```

> `RequestDetailModal.jsx`는 상세 **페이지**로 대체되어 더 이상 쓰지 않습니다(삭제해도 됩니다). `routes/PrivateRoute.jsx`는 Day 9에서 만듭니다.

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 왜 라우팅인가 — 메뉴 state의 한계

Day 4~7에서는 `const [menu, setMenu] = useState('dashboard')`로 화면을 바꿨습니다. 잘 동작했지만 결정적 한계가 있습니다.

- **URL이 안 바뀝니다.** 어떤 화면을 봐도 주소는 `/`. 특정 요청 상세를 **링크로 공유**할 수 없습니다.
- **새로고침하면** 항상 처음 화면으로 돌아갑니다.
- **브라우저 뒤로/앞으로 가기**가 동작하지 않습니다.

**라우팅**은 "URL과 화면을 연결"합니다. `/requests/3`이면 3번 요청 상세를 보여주고, 그 주소를 공유·북마크·새로고침해도 같은 화면이 뜹니다. SPA에서는 페이지를 새로 내려받지 않고 **클라이언트에서** URL에 맞는 컴포넌트를 갈아 끼웁니다.

### 1.2 BrowserRouter — 라우팅의 뿌리

앱 전체를 `BrowserRouter`로 감싸면, 그 안의 모든 라우팅 기능을 쓸 수 있습니다. `BrowserRouter`는 HTML5 History API를 사용해 **주소창을 바꾸되 페이지는 새로 안 받는** 방식으로 동작합니다.

```jsx
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <App />
</BrowserRouter>
```

> **Day 1과의 연결**: `/requests/3`으로 직접 들어오거나 새로고침하면, 개발 서버는 실제로 `/requests/3` 파일을 찾습니다(없음 → 404). Day 1에서 넣은 `historyApiFallback: true`가 "없는 경로는 `index.html`을 돌려주라"고 해서, 그때 React Router가 URL을 보고 알맞은 화면을 그립니다. 이 설정이 없으면 새로고침 시 404가 납니다.

### 1.3 Route와 Switch

- **`Route`** — "이 경로일 때 이 컴포넌트를 보여줘".
  ```jsx
  <Route exact path="/dashboard" component={DashboardPage} />
  ```
- **`Switch`** — 여러 `Route` 중 **위에서부터 처음 매칭되는 하나만** 렌더링. 없으면 없이 지나가지 않고 첫 매칭에서 멈춥니다.
  ```jsx
  <Switch>
    <Route exact path="/dashboard" component={DashboardPage} />
    <Route exact path="/requests" component={RequestListPage} />
    <Route component={NotFoundPage} />   {/* path 없음 = 위 어느 것도 안 맞으면 = 404 */}
  </Switch>
  ```

### 1.4 exact와 라우트 순서 — 흔한 함정

`path`는 기본적으로 **접두사 매칭**입니다. `/requests`는 `/requests/new`, `/requests/3`에도 매칭됩니다. 그래서 두 가지가 중요합니다.

1. **`exact`** — 경로가 정확히 일치할 때만 매칭. `/requests`에 `exact`가 없으면 `/requests/new`에서도 목록이 떠 버립니다.
2. **순서** — `Switch`는 첫 매칭에서 멈추므로, **더 구체적인 경로를 위에** 둡니다. 특히 `/requests/new`는 `/requests/:id`(id가 "new"로 매칭됨)보다 **먼저** 와야 합니다.

```jsx
<Route exact path="/requests/new" component={RequestCreatePage} />  {/* 먼저 */}
<Route exact path="/requests/:id" component={RequestDetailPage} />  {/* 나중 */}
```

### 1.5 Link / NavLink — `<a>`를 쓰면 안 되는 이유

화면 이동은 `<a href>`가 아니라 `Link`로 합니다.

- `<a href="/requests">` — **페이지 전체를 새로 내려받아** SPA 상태가 초기화됩니다(느리고, state 날아감).
- `Link to="/requests"` — 페이지를 새로 받지 않고 URL만 바꿔 컴포넌트를 교체합니다.
- `NavLink` — `Link`에 더해, **현재 경로와 일치하면 활성 스타일**(`activeClassName`)을 자동 적용. 내비게이션 메뉴에 유용.

```jsx
import { Link, NavLink } from 'react-router-dom';

<Link to="/requests/new">신규 요청</Link>
<NavLink to="/dashboard" activeClassName="active">대시보드</NavLink>
```

### 1.6 URL 파라미터와 useParams

`:id`처럼 콜론으로 시작하는 부분은 **동적 파라미터**입니다. 컴포넌트에서 `useParams`로 읽습니다.

```jsx
// 라우트: <Route exact path="/requests/:id" component={RequestDetailPage} />
import { useParams } from 'react-router-dom';

function RequestDetailPage() {
  const { id } = useParams(); // '/requests/3' 이면 id === '3' (문자열)
  // 이 id로 상세를 조회
}
```

> `useParams`가 주는 값은 **항상 문자열**입니다(`'3'`). 숫자가 필요하면 `Number(id)`로 변환하세요. 우리 API 호출(`/requests/3`)에는 문자열 그대로 써도 됩니다.

### 1.7 useHistory — 코드에서 이동하기

버튼 클릭·등록 완료 후처럼 **코드로** 이동할 때는 `useHistory`(v5)를 씁니다.

```jsx
import { useHistory } from 'react-router-dom';

const history = useHistory();
history.push('/requests');       // 이동(뒤로가기 가능)
history.push(`/requests/${id}`); // 상세로 이동
history.goBack();                // 뒤로
```

### 1.8 Redirect — 기본 경로 처리

특정 경로에 왔을 때 다른 경로로 자동 이동시킵니다. `/`로 들어오면 `/dashboard`로 보내는 데 씁니다.

```jsx
import { Redirect } from 'react-router-dom';

<Route exact path="/" render={() => <Redirect to="/dashboard" />} />
```

### 1.9 ⚠️ v5 vs v6/v7 — 반드시 확인

2026년 현재 `npm install react-router-dom`은 **v7**을 설치합니다. 이 코스는 **v5**이며 API가 크게 다릅니다. 반드시 버전을 고정하세요.

- **설치**: `npm install react-router-dom@5`
- 주요 차이(v5 → v6/v7):
  - `<Switch>` → `<Routes>`
  - `<Route component={X}>` / `render` → `<Route element={<X/>}>`
  - `<Redirect>` → `<Navigate>`
  - `useHistory()` → `useNavigate()`
  - 중첩/정확 매칭 규칙 변경(`exact` 개념 사라짐)

> 구형 프로젝트는 대부분 v5입니다. v6 문서를 보고 `element`나 `useNavigate`를 쓰면 v5에서 동작하지 않습니다. Day 4에서 강조한 "버전 먼저 확인"이 라우터에도 그대로 적용됩니다.

---

## 2. 설치

```bash
npm install react-router-dom@5
```

확인:

```bash
npm ls react-router-dom   # react-router-dom@5.3.x 면 정상
```

Day 1에서 넣은 `historyApiFallback: true`가 `webpack.config.js`의 `devServer`에 있는지 확인하세요(없으면 새로고침 시 404).

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. 404 페이지 — NotFoundPage

**`src/components/common/NotFoundPage.jsx`** (신규)

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Result, Button } from 'antd';

function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="요청하신 페이지를 찾을 수 없습니다."
      extra={
        <Link to="/dashboard">
          <Button type="primary">대시보드로</Button>
        </Link>
      }
    />
  );
}

export default NotFoundPage;
```

### Step 2. 임시 로그인 페이지 — LoginPage

Day 9에서 실제 인증으로 대체할 자리표시자입니다. 지금은 로그인 버튼을 누르면 `/dashboard`로 보냅니다(Day 5의 Form 지식 재사용).

**`src/features/auth/LoginPage.jsx`** (신규)

```jsx
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Form, Input, Button, Card } from 'antd';

function LoginPage() {
  const history = useHistory();

  // Day 9에서 실제 인증(서버 확인 + 전역 상태 저장)으로 대체된다.
  const handleFinish = () => {
    history.push('/dashboard');
  };

  return (
    <div className="login-shell">
      <Card title="WorkFlow Admin Console" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={handleFinish} initialValues={{ username: 'admin' }}>
          <Form.Item
            name="username"
            label="아이디"
            rules={[{ required: true, message: '아이디를 입력하세요.' }]}
          >
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호"
            rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
          >
            <Input.Password placeholder="비밀번호" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>로그인</Button>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
```

### Step 3. 등록 페이지 — RequestCreatePage

Day 5의 등록 모달을 `/requests/new` **페이지**로 옮깁니다. `RequestForm`은 그대로 재사용하고, 제출·취소 시 목록으로 이동합니다.

**`src/features/requests/RequestCreatePage.jsx`** (신규)

```jsx
import React from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import RequestForm from './RequestForm';
import * as requestApi from '@/api/requestApi';

function RequestCreatePage() {
  const history = useHistory();

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
      message.success('업무 요청이 등록되었습니다.');
      history.push('/requests'); // 등록 후 목록으로 이동
    } catch (e) {
      message.error('등록에 실패했습니다.');
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <PageTitle title="신규 업무 요청" subtitle="필수 항목을 입력해 요청을 등록하세요." />
      <RequestForm
        onSubmit={handleCreate}
        onCancel={() => history.push('/requests')}
      />
    </div>
  );
}

export default RequestCreatePage;
```

### Step 4. 상세 페이지 — RequestDetailPage (모달 대체)

`useParams`로 URL의 `:id`를 읽어 상세를 조회합니다. Day 6 상세 모달의 조회 로직(loading/error, 정리 함수)을 그대로 가져오되, 모달이 아니라 **페이지**로 만듭니다.

**`src/features/requests/RequestDetailPage.jsx`** (신규)

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Descriptions, Timeline, Button } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import LoadingBox from '@/components/common/LoadingBox';
import ErrorBox from '@/components/common/ErrorBox';
import * as requestApi from '@/api/requestApi';
import { PRIORITY_LABEL } from './constants';

function RequestDetailPage() {
  const { id } = useParams(); // URL의 :id (문자열)
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
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
    return () => { ignore = true; };
  }, [id]); // URL의 id가 바뀌면 재조회

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;
  if (!detail) return null;

  return (
    <div>
      <PageTitle title="요청 상세" subtitle={`#${detail.id}`} />

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="제목">{detail.title}</Descriptions.Item>
        <Descriptions.Item label="요청자">{detail.requester}</Descriptions.Item>
        <Descriptions.Item label="부서">{detail.department}</Descriptions.Item>
        <Descriptions.Item label="우선순위">
          {PRIORITY_LABEL[detail.priority] || detail.priority}
        </Descriptions.Item>
        <Descriptions.Item label="상태"><StatusTag status={detail.status} /></Descriptions.Item>
        <Descriptions.Item label="내용">{detail.content}</Descriptions.Item>
      </Descriptions>

      <h4 style={{ margin: '16px 0 8px' }}>처리 이력</h4>
      <Timeline>
        {(detail.history || []).map((h, index) => (
          <Timeline.Item key={index}>
            {h.message} <span style={{ color: '#999' }}>({h.createdAt})</span>
          </Timeline.Item>
        ))}
      </Timeline>

      <div style={{ marginTop: 16 }}>
        <Link to="/requests"><Button>목록으로</Button></Link>
      </div>
    </div>
  );
}

export default RequestDetailPage;
```

### Step 5. 목록 페이지에서 모달 제거 → 페이지 이동

Day 6/7의 `RequestListPage`에서 **상세 모달·등록 모달을 걷어내고**, "상세"/"신규 요청"을 **라우트 이동**으로 바꿉니다. 목록 조회·삭제·검색/필터는 그대로 둡니다.

**`src/features/requests/RequestListPage.jsx`** (전체 교체)

```jsx
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Table, Button, Modal, Space, message, Spin } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import ErrorBox from '@/components/common/ErrorBox';
import RequestSearchBar from './RequestSearchBar';
import * as requestApi from '@/api/requestApi';
import { PRIORITY_LABEL } from './constants';

function RequestListPage() {
  const history = useHistory();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');

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

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = requests.filter(req => {
    const matchKeyword = req.title.includes(keyword.trim());
    const matchStatus = status === 'ALL' || req.status === status;
    return matchKeyword && matchStatus;
  });

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
          <Button size="small" onClick={() => history.push(`/requests/${record.id}`)}>
            상세
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  if (error) {
    return <ErrorBox message="불러오기 실패" description={error} onRetry={loadRequests} />;
  }

  return (
    <div>
      <div className="page-head">
        <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />
        <Button type="primary" onClick={() => history.push('/requests/new')}>
          신규 요청
        </Button>
      </div>

      <RequestSearchBar
        keyword={keyword}
        status={status}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
      />

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 5 }}
        />
      </Spin>
    </div>
  );
}

export default RequestListPage;
```

> `RequestDetailModal` import와 등록 `Modal`이 사라졌습니다. 상세는 `/requests/:id`로, 등록은 `/requests/new`로 **이동**합니다.

### Step 6. 라우트 정의 — routes/AppRouter.jsx

레이아웃 안쪽 본문에 그려질 라우트를 모읍니다. **순서와 `exact`에 주의**(1.4).

**`src/routes/AppRouter.jsx`** (신규)

```jsx
import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import DashboardPage from '@/features/dashboard/DashboardPage';
import RequestListPage from '@/features/requests/RequestListPage';
import RequestCreatePage from '@/features/requests/RequestCreatePage';
import RequestDetailPage from '@/features/requests/RequestDetailPage';
import NotFoundPage from '@/components/common/NotFoundPage';

function AppRouter() {
  return (
    <Switch>
      {/* 기본 경로는 대시보드로 */}
      <Route exact path="/" render={() => <Redirect to="/dashboard" />} />

      <Route exact path="/dashboard" component={DashboardPage} />
      <Route exact path="/requests" component={RequestListPage} />

      {/* /requests/new 는 /requests/:id 보다 먼저! (id='new'로 잡히는 것 방지) */}
      <Route exact path="/requests/new" component={RequestCreatePage} />
      <Route exact path="/requests/:id" component={RequestDetailPage} />

      {/* 위 어느 것도 안 맞으면 404 */}
      <Route component={NotFoundPage} />
    </Switch>
  );
}

export default AppRouter;
```

### Step 7. 사이드바를 라우터 대응으로 수정

메뉴 클릭 시 `useHistory`로 이동하고, 현재 경로(`useLocation`)로 선택 상태를 표시합니다. 더 이상 부모의 state가 필요 없습니다.

**`src/components/layout/Sidebar.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, FileTextOutlined } from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';

const { Sider } = Layout;

// 메뉴 key를 라우트 경로로 사용
const MENU_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '대시보드' },
  { key: '/requests', icon: <FileTextOutlined />, label: '업무 요청' },
];

function Sidebar() {
  const history = useHistory();
  const location = useLocation();

  // /requests/3, /requests/new 도 '업무 요청' 메뉴가 선택된 것으로 표시
  const selectedKey = location.pathname.startsWith('/requests')
    ? '/requests'
    : location.pathname;

  return (
    <Sider collapsible>
      <div className="app-logo">WorkFlow</div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={({ key }) => history.push(key)}
      >
        {MENU_ITEMS.map(item => (
          <Menu.Item key={item.key} icon={item.icon}>
            {item.label}
          </Menu.Item>
        ))}
      </Menu>
    </Sider>
  );
}

export default Sidebar;
```

### Step 8. AppLayout에서 메뉴 props 제거

이제 `Sidebar`가 스스로 라우터를 읽으므로, `AppLayout`은 `children`만 받으면 됩니다.

**`src/components/layout/AppLayout.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';

const { Content } = Layout;

function AppLayout({ children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <HeaderBar />
        <Content style={{ margin: 24, padding: 24, background: '#fff' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default AppLayout;
```

### Step 9. App.jsx — BrowserRouter로 감싸기

로그인은 레이아웃(사이드바/헤더) **없이** 전체 화면으로, 나머지는 레이아웃 **안에서** 라우팅합니다. 최상위 `Switch`에서 `/login`을 먼저 처리하고, 그 외 경로는 `AppLayout` + `AppRouter`로 보냅니다.

**`src/App.jsx`** (전체 교체)

```jsx
import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import AppRouter from '@/routes/AppRouter';
import LoginPage from '@/features/auth/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Switch>
        {/* 로그인: 레이아웃 없이 전체 화면 */}
        <Route exact path="/login" component={LoginPage} />

        {/* 그 외 모든 경로: 레이아웃 안에서 라우팅 */}
        <Route
          path="/"
          render={() => (
            <AppLayout>
              <AppRouter />
            </AppLayout>
          )}
        />
      </Switch>
    </BrowserRouter>
  );
}

export default App;
```

> **Day 9 미리보기**: 두 번째 `<Route path="/">`가 Day 9에서 **`<PrivateRoute path="/">`** 로 바뀝니다. 로그인 안 했으면 `/login`으로 돌려보내는 문지기가 바로 이 자리에 들어갑니다.

### Step 10. 로그인 화면 스타일 추가

`src/styles/global.css`에 추가합니다.

```css
/* 로그인 화면: 중앙 정렬 */
.login-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
```

### Step 11. 실행 확인

**두 터미널**(`npm run mock`, `npm start`)을 켠 상태에서 확인합니다.

- `http://localhost:3000/` 접속 → **`/dashboard`로 자동 이동**(Redirect), 주소창이 `/dashboard`로 바뀜.
- 사이드바 **업무 요청** 클릭 → 주소가 `/requests`로 바뀌고 목록 표시.
- 목록의 **상세** → 주소가 `/requests/3` 등으로 바뀌고 상세 페이지 + 처리 이력 표시. **목록으로** 버튼으로 복귀.
- **신규 요청** → `/requests/new` 페이지의 폼. 등록하면 `/requests`로 이동 + 새 항목 반영.
- 주소창에 **직접 `/requests/2` 입력 후 이동/새로고침** → 해당 상세가 바로 뜸(historyApiFallback 동작 확인).
- 브라우저 **뒤로/앞으로 가기**가 화면 전환과 일치.
- 존재하지 않는 주소(`/abcd`) 입력 → **404 페이지**.
- `http://localhost:3000/login` → 사이드바 없는 로그인 화면. 로그인 버튼 → `/dashboard`로 이동(임시).

---

## 4. 개념 심화

### 4.1 "모달"에서 "페이지"로 바꾸며 얻은 것

상세를 페이지로 만들자 URL(`/requests/3`)이 생겼습니다. 이제 특정 요청을 **링크로 공유**하고, 새로고침해도 유지되며, 뒤로가기로 목록에 돌아갑니다. 모달은 "현재 화면 위 임시 표시"라 이런 특성이 없습니다. 화면이 독립적으로 접근 가능해야 하면 **라우트/페이지**, 잠깐 확인하고 닫는 보조 정보면 **모달**이 적합합니다.

### 4.2 레이아웃 라우트 패턴

`App`에서 `/login`은 레이아웃 밖, 나머지는 `AppLayout` 안에서 라우팅했습니다. 이렇게 "공통 껍데기(레이아웃)를 두르는 구역"과 "두르지 않는 구역"을 나누는 것이 **레이아웃 라우트** 패턴입니다. 관리자 콘솔에서 로그인/에러 페이지를 제외한 대부분을 한 레이아웃으로 감쌀 때 흔히 씁니다. Day 9의 인증 게이트가 자연스럽게 이 경계에 얹힙니다.

### 4.3 지금은 페이지마다 다시 조회한다 (Day 9에서 개선)

목록 → 상세 → 목록으로 오갈 때마다 각 페이지가 마운트되어 **API를 다시 호출**합니다. 지금 구조(페이지별 지역 상태)에서는 자연스러운 동작입니다. Day 9~10에서 Redux로 상태를 전역화하면, 이미 받은 데이터를 재사용해 불필요한 재조회를 줄일 수 있습니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 새로고침하면 404 (또는 빈 화면)

- **원인**: `historyApiFallback` 미설정. 서버가 `/requests/3` 실제 파일을 찾다 실패.
- **해결**: `webpack.config.js`의 `devServer.historyApiFallback: true` 확인(Day 1). 설정 변경 후 dev-server 재시작.

### 5.2 `/requests/new`에서 상세 페이지가 뜸

- **원인**: 라우트 순서 문제. `/requests/:id`가 `/requests/new`보다 위에 있어 id='new'로 매칭.
- **해결**: `/requests/new`를 `/requests/:id`보다 **위에** 배치(1.4).

### 5.3 `/requests`에서 목록이 아니라 다른 게 뜨거나 항상 매칭됨

- **원인**: `exact` 누락. `/requests`가 하위 경로에도 매칭.
- **해결**: 정확 매칭이 필요한 라우트에 `exact` 추가.

### 5.4 `useHistory is not a function` / `useNavigate` 관련 오류

- **원인**: react-router-dom v6/v7이 설치됨(v5 훅과 다름).
- **해결**: `npm install react-router-dom@5`. `npm ls react-router-dom`로 5.x 확인.

### 5.5 클릭 시 화면이 깜빡이며 전체 새로고침됨

- **원인**: `<a href>`로 이동(SPA 라우팅 우회).
- **해결**: `Link`/`NavLink` 또는 `history.push` 사용.

### 5.6 `useParams()`가 `undefined`를 줌

- **원인**: 파라미터 이름 불일치(라우트 `:id` ↔ `useParams().requestId`), 또는 라우트 밖에서 호출.
- **해결**: 라우트의 `:id`와 구조 분해 이름(`const { id } = useParams()`)을 일치. 훅은 `Route`로 렌더된 컴포넌트 안에서 호출.

### 5.7 `<Route>`/`useHistory`가 `Router` 밖에서 쓰였다는 오류

- **원인**: `BrowserRouter`로 감싸지 않음.
- **해결**: 최상위를 `BrowserRouter`로 감쌈(Step 9).

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. 메뉴 state 전환 대신 라우팅을 쓰면 무엇이 좋아지나?

URL과 화면이 연결되어, 특정 화면을 링크로 공유·북마크할 수 있고, 새로고침해도 유지되며, 브라우저 뒤로/앞으로 가기가 동작합니다.

### Q2. `Switch`와 `exact`는 각각 무슨 역할인가?

`Switch`는 여러 `Route` 중 위에서부터 처음 매칭되는 하나만 렌더링합니다. `exact`는 경로가 정확히 일치할 때만 매칭시켜, 접두사 매칭으로 인한 오작동을 막습니다.

### Q3. `/requests/new`를 `/requests/:id`보다 위에 둬야 하는 이유는?

`Switch`는 첫 매칭에서 멈추는데, `/requests/new`는 `/requests/:id`에도 매칭(id='new')됩니다. 구체적 경로를 먼저 둬야 등록 페이지가 정상으로 뜹니다.

### Q4. `<a href>` 대신 `Link`를 쓰는 이유는?

`<a>`는 페이지 전체를 새로 내려받아 SPA 상태가 초기화됩니다. `Link`는 페이지를 새로 받지 않고 URL만 바꿔 컴포넌트를 교체합니다.

### Q5. 새로고침 시 라우트가 유지되려면 무엇이 필요한가?

개발 서버의 `historyApiFallback`(Day 1)이 없는 경로에 `index.html`을 돌려줘야, React Router가 URL을 보고 알맞은 화면을 그립니다.

---

## 7. Day 8 완료 체크리스트

- [ ] `react-router-dom@5`를 설치했다(v6/v7 아님).
- [ ] `App`을 `BrowserRouter`로 감싸고, 로그인/레이아웃 구역을 나눴다.
- [ ] `AppRouter`에 `/dashboard`·`/requests`·`/requests/new`·`/requests/:id`·404 라우트를 정의했다.
- [ ] `/requests/new`를 `/requests/:id`보다 위에 두고 `exact`를 지정했다.
- [ ] 사이드바가 `useHistory`/`useLocation`으로 이동·선택 표시를 한다.
- [ ] 상세 모달을 `RequestDetailPage`(`useParams`)로 대체했다.
- [ ] 등록을 `RequestCreatePage`(`/requests/new`)로 옮기고 등록 후 목록으로 이동한다.
- [ ] `/`가 `/dashboard`로 리다이렉트되고, 없는 경로는 404가 뜬다.
- [ ] 새로고침·직접 URL 입력·뒤로가기가 모두 정상 동작한다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 9 예고)

Day 9에서는 **Redux**를 도입해 상태를 전역으로 끌어올립니다. 지금은 로그인 여부를 아무도 기억하지 못하고(임시 통과), 목록 데이터는 페이지마다 다시 조회합니다. Redux로 **로그인 사용자·요청 목록·필터 상태**를 전역 store에 두고, `connect`/`mapStateToProps` 패턴과 hooks(`useSelector`/`useDispatch`)를 익힙니다. 그리고 오늘 자리만 잡아 둔 **`PrivateRoute`** 를 만들어, 로그인하지 않으면 `/login`으로 돌려보내는 접근 제어를 완성합니다. Day 8의 라우팅 골격 위에 "상태"와 "인증"이 얹히는 단계입니다.

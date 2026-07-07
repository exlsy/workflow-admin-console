# Day 4 — antd 기본 컴포넌트

> WorkFlow Admin Console 2주 코스의 넷째 날입니다.  
> Day 3까지 순수 HTML로 만든 화면을 **antd(Ant Design)** 컴포넌트로 바꿔 실제 관리자 콘솔의 모습을 갖춥니다.  
> 이 문서 하나만 따라 하면 `Layout`/`Menu` 기반 관리자 레이아웃, `Table` 요청 목록, 상세 보기 `Modal`, `Card`/`Tag`/`Button`/`Input`/`Select`까지 완성합니다.

---

## 0. 이 문서를 마치면

- 관리자 화면에서 자주 쓰는 antd 컴포넌트(`Layout`, `Menu`, `Card`, `Table`, `Button`, `Tag`, `Input`, `Select`, `Modal`)를 이해하고 사용할 수 있습니다.
- `Table` 중심의 목록 화면을 구성할 수 있습니다(`columns`, `dataSource`, `rowKey`, `render`).
- `Layout` + `Sider` + `Header` + `Content`로 관리자 골격을 만들고, `Menu`로 사이드바를 구성할 수 있습니다.
- 제어형 `Modal`(상세 보기)과 명령형 `Modal.confirm`(삭제 확인)을 구분해서 쓸 수 있습니다.
- Day 3에서 배운 state·이벤트·제어 컴포넌트 개념이 antd 위에서도 그대로 적용됨을 확인합니다.

### ⚠️ 이 코스는 antd v4를 사용합니다 (가장 먼저 확인)

antd는 버전마다 API가 크게 다릅니다. **이 코스는 React 16 + antd v4 기준**입니다.

- **v3 vs v4**: `Form` API가 완전히 다릅니다(v3 `Form.create()`/`getFieldDecorator` ↔ v4 `Form.useForm()`/`onFinish`). 이건 Day 5에서 직접 겪습니다.
- **v4 vs v5**: v5는 전역 CSS 파일(`antd/dist/antd.css`)이 없고 CSS-in-JS로 바뀌었으며, `Modal`의 `visible` prop이 `open`으로 개명되는 등 차이가 있습니다. 또 v5는 React 18을 전제로 최적화되어 있어, **React 16 프로젝트에서는 v4가 안전**합니다.

> 실제 회사 프로젝트에 투입되면 **`package.json`에서 antd 버전을 가장 먼저 확인**하세요. 버전을 모른 채 문서만 보고 코드를 쓰면 "왜 안 되지"의 늪에 빠집니다.

### Day 4에서 다루지 않는 것 (혼동 방지)

- **신규 요청 등록 Form** → Day 5 (antd Form v4 패턴)
- **API 호출** → Day 6. 데이터는 여전히 정적 초기값입니다.
- **라우팅** → Day 8. 오늘은 사이드바 메뉴를 **state로** 전환합니다(Day 3의 state 활용).
- **Table 고급 기능**(정렬/필터/페이징 커스텀/서버 페이징) → Day 12. 오늘은 기본 Table + 기본 페이징까지.

### 최종 산출물 폴더 구조 (Day 4 기준)

```txt
workflow-admin-console/
  src/
    components/
      common/
        StatusTag.jsx          (antd Tag로 교체)
        PageTitle.jsx          (재사용)
      layout/
        AppLayout.jsx          (신규)
        Sidebar.jsx            (신규)
        HeaderBar.jsx          (신규)
    features/
      dashboard/
        DashboardPage.jsx      (antd Card/Row/Col로 교체)
        SummaryCard.jsx        (antd Card/Statistic로 교체)
      requests/
        RequestListPage.jsx    (antd Table + Modal로 교체)
        RequestSearchBar.jsx   (antd Input/Select로 교체)
    index.jsx                  (antd CSS import 추가)
    App.jsx                    (AppLayout + 메뉴 전환)
    styles/
      global.css               (antd가 대신하므로 대폭 축소)
```

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 antd란, 그리고 설치

antd는 관리자/대시보드 화면에 특화된 React UI 컴포넌트 라이브러리입니다. 버튼 하나부터 Table·Form·Modal까지 실무에 필요한 것이 다 들어 있어, 구형 엔터프라이즈 React 프로젝트에서 사실상 표준처럼 쓰입니다.

**설치 (버전 고정 필수)** — 런타임 의존성이므로 `-D` 없이 설치합니다.

```bash
npm install antd@4 @ant-design/icons@4
```

- `antd@4` — React 16 호환 마지막 메이저. 버전을 생략하면 v5가 설치되어 `antd/dist/antd.css`가 없고 React 16과 궁합이 어긋납니다.
- `@ant-design/icons@4` — antd v4는 아이콘이 별도 패키지입니다(메뉴 아이콘 등에 사용).

> antd v4는 `moment`를 내부 의존성으로 함께 설치합니다(DatePicker 등에서 사용). Day 4에서는 직접 쓰지 않으니 신경 쓰지 않아도 됩니다.

### 1.2 antd 스타일 불러오기 (v4 필수)

antd v4는 **전역 CSS 파일을 한 번 import**해야 컴포넌트가 제대로 보입니다. 진입점에서 불러옵니다.

**`src/index.jsx`** 수정 — antd CSS를 우리 `global.css`보다 **먼저** import합니다(우리 스타일이 antd를 덮어쓸 수 있도록).

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';   // ← Day 4에서 추가 (v4 필수)
import App from './App';
import './styles/global.css';

ReactDOM.render(<App />, document.getElementById('root'));
```

> v5에는 이 파일이 없습니다. `Cannot find module 'antd/dist/antd.css'` 오류가 나면 v5가 설치된 것이니 `npm install antd@4`로 다시 맞추세요.

### 1.3 Layout 시스템

antd `Layout`은 관리자 화면의 뼈대입니다. 네 조각으로 구성합니다.

- **`Layout`** — 전체를 감싸는 컨테이너
- **`Layout.Sider`** — 좌측 사이드바(메뉴 영역)
- **`Layout.Header`** — 상단 바
- **`Layout.Content`** — 본문(페이지가 그려질 곳)

```jsx
import { Layout } from 'antd';
const { Sider, Header, Content } = Layout;

<Layout style={{ minHeight: '100vh' }}>
  <Sider>사이드바</Sider>
  <Layout>
    <Header>상단바</Header>
    <Content>본문</Content>
  </Layout>
</Layout>
```

### 1.4 Menu

`Menu`는 사이드바 네비게이션입니다. 핵심 prop:

- `mode="inline"` — 세로 목록형(사이드바용)
- `theme="dark"` — 어두운 테마(Sider와 어울림)
- `selectedKeys={[key]}` — **현재 선택된 메뉴 key들의 배열**(문자열 배열)
- `onClick={({ key }) => ...}` — 메뉴 클릭 시 `key`를 받아 처리

각 항목은 `<Menu.Item key="...">라벨</Menu.Item>`입니다. 오늘은 이 `key`와 state를 연결해 **어떤 페이지를 보여줄지**를 결정합니다(라우터 대신, Day 8까지).

### 1.5 Table — 오늘의 핵심

`Table`은 관리자 목록 화면의 심장입니다. 두 가지만 이해하면 됩니다: **`columns`(열 정의)** 와 **`dataSource`(행 데이터)**.

```jsx
const columns = [
  { title: '제목', dataIndex: 'title', key: 'title' },
  {
    title: '상태',
    dataIndex: 'status',
    key: 'status',
    render: (value, record) => <StatusTag status={value} />, // 셀을 커스텀 렌더링
  },
];

<Table rowKey="id" columns={columns} dataSource={rows} />
```

- **`dataIndex`** — 이 열이 각 행에서 꺼내 보여줄 필드 이름.
- **`render(value, record)`** — 셀을 직접 그릴 때. `value`는 `dataIndex` 값, `record`는 그 행 전체 객체. 상태 뱃지·버튼 같은 걸 넣을 때 씁니다.
- **`rowKey`** — 각 행의 고유 key(보통 `"id"`). **꼭 지정**하세요. 없으면 "unique key" 경고가 나고 렌더링이 불안정해집니다(Day 2의 `.map` + key와 같은 이유).
- **`dataSource`** — 배열. 우리는 Day 3의 **필터링된 파생 배열**을 그대로 넘깁니다. 검색/필터가 Table에 자동 반영됩니다.
- 페이징은 기본으로 켜져 있고, `pagination={{ pageSize: 5 }}`로 페이지당 개수를 정할 수 있습니다(고급 설정은 Day 12).

### 1.6 Modal — 제어형과 명령형

antd `Modal`은 두 가지 방식으로 씁니다.

**(1) 제어형 Modal** — state로 열림/닫힘을 제어. 상세 보기처럼 "내용이 있는" 모달에 적합.

```jsx
const [selected, setSelected] = useState(null);

<Button onClick={() => setSelected(record)}>상세</Button>

<Modal
  title="요청 상세"
  visible={!!selected}              // ← v4는 visible (v5는 open)
  onCancel={() => setSelected(null)} // 닫기(X, 배경 클릭, ESC)
  footer={null}
>
  {selected && <div>{selected.title}</div>}
</Modal>
```

- `visible`이 antd **v4의 prop**입니다. v5에서는 `open`으로 바뀌었습니다.
- `onCancel`에서 state를 되돌리지 않으면 모달이 안 닫힙니다(제어형의 기본 원리 — Day 3의 제어 컴포넌트와 동일).

**(2) 명령형 Modal.confirm** — 확인창을 함수 호출로 즉석에서 띄움. 삭제 확인처럼 "예/아니오"만 필요할 때 적합.

```jsx
Modal.confirm({
  title: '요청 삭제',
  content: '정말 삭제할까요?',
  okText: '삭제',
  okType: 'danger',
  cancelText: '취소',
  onOk: () => doDelete(),
});
```

### 1.7 Card / Tag / Button / Input / Select 빠르게

- **`Card`** — 내용을 담는 카드. `title` prop으로 헤더. 대시보드 요약·박스에 사용.
- **`Statistic`** — 큰 숫자 지표 표시(`title`, `value`, `suffix`). Card와 조합.
- **`Tag color="blue"`** — 색깔 뱃지. `StatusTag`를 이걸로 교체합니다.
- **`Button`** — `type="primary"`(파랑), `danger`(빨강), `size="small"` 등.
- **`Input`** — 텍스트 입력. `allowClear`로 지우기 버튼. **여전히 제어 컴포넌트**(`value` + `onChange`, `onChange`는 이벤트 객체).
- **`Select`** — 드롭다운. `options` prop으로 목록 지정. **주의**: antd `Select`의 `onChange`는 네이티브와 달리 **선택된 값 자체**를 넘깁니다(`e.target.value`가 아님 — 1.8 참고).

### 1.8 antd 컴포넌트와 우리 state의 관계

antd 입력 컴포넌트도 결국 **제어 컴포넌트**입니다. Day 3에서 배운 그대로 `value`를 state에 묶고 변경 콜백으로 갱신합니다. 다만 콜백이 값을 넘기는 방식이 조금씩 다릅니다.

- 네이티브 `<input onChange={e => set(e.target.value)}>` — **이벤트 객체**
- antd `<Input onChange={e => set(e.target.value)}>` — **이벤트 객체**(네이티브와 동일)
- antd `<Select onChange={value => set(value)}>` — **값 자체**(이벤트 아님!)

이 차이만 기억하면 antd 폼 다루기가 쉬워집니다.

---

## 2. 사전 준비

Day 3까지 완료된 상태여야 합니다. 그다음 antd를 설치합니다.

```bash
# 1) antd 설치 (버전 고정)
npm install antd@4 @ant-design/icons@4

# 2) 개발 서버 실행 (이미 켜져 있으면 재시작 권장 - 새 의존성 반영)
npm start
```

설치 확인:

```bash
npm ls antd    # antd@4.x.x 로 나오면 정상
```

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. antd CSS import 추가

1.2를 참고해 `src/index.jsx`에 `import 'antd/dist/antd.css';`를 추가합니다.

### Step 2. StatusTag를 antd Tag로 교체

Day 2에 만든 커스텀 뱃지를 antd `Tag`로 바꿉니다. 색은 antd 프리셋 색상명을 씁니다.

**`src/components/common/StatusTag.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Tag } from 'antd';

// 상태값(영문 상수) → 한글 라벨 + antd 프리셋 색
const STATUS_MAP = {
  REQUESTED:   { label: '요청됨', color: 'blue' },
  IN_PROGRESS: { label: '처리중', color: 'gold' },
  APPROVED:    { label: '승인',   color: 'green' },
  REJECTED:    { label: '반려',   color: 'red' },
  DONE:        { label: '완료',   color: 'default' },
};

function StatusTag({ status }) {
  const info = STATUS_MAP[status] || { label: status, color: 'default' };
  return <Tag color={info.color}>{info.label}</Tag>;
}

export default StatusTag;
```

> 인터페이스(`status` prop)는 그대로라, 이 컴포넌트를 쓰던 대시보드·목록 코드는 **한 줄도 안 바꿔도** 됩니다. 이것이 Day 2에서 컴포넌트를 잘 분리해 둔 보상입니다.

### Step 3. 레이아웃 3종 만들기

**`src/components/layout/Sidebar.jsx`** (신규)

```jsx
import React from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, FileTextOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const MENU_ITEMS = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '대시보드' },
  { key: 'requests', icon: <FileTextOutlined />, label: '업무 요청' },
];

function Sidebar({ selectedKey, onSelectMenu }) {
  return (
    <Sider collapsible>
      <div className="app-logo">WorkFlow</div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={({ key }) => onSelectMenu(key)}
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

**`src/components/layout/HeaderBar.jsx`** (신규)

```jsx
import React from 'react';
import { Layout } from 'antd';

const { Header } = Layout;

function HeaderBar() {
  return (
    <Header style={{ background: '#fff', padding: '0 24px' }}>
      <span className="header-title">WorkFlow Admin Console</span>
    </Header>
  );
}

export default HeaderBar;
```

**`src/components/layout/AppLayout.jsx`** (신규) — 골격을 조립하고, 본문은 `children`으로 받습니다(Day 2의 children prop 활용).

```jsx
import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';

const { Content } = Layout;

function AppLayout({ selectedKey, onSelectMenu, children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar selectedKey={selectedKey} onSelectMenu={onSelectMenu} />
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

### Step 4. 대시보드를 antd로 (Card / Row / Col / Statistic)

**`src/features/dashboard/SummaryCard.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Card, Statistic } from 'antd';

function SummaryCard({ title, count, suffix = '건' }) {
  return (
    <Card>
      <Statistic title={title} value={count} suffix={suffix} />
    </Card>
  );
}

export default SummaryCard;
```

**`src/features/dashboard/DashboardPage.jsx`** (전체 교체) — antd `Row`/`Col` 그리드로 카드를 배치하고, 최근 요청은 `Card` + `List`로.

```jsx
import React from 'react';
import { Row, Col, Card, List } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import SummaryCard from './SummaryCard';

const summary = [
  { key: 'requested', title: '신규 요청', count: 8 },
  { key: 'inProgress', title: '처리중', count: 5 },
  { key: 'done', title: '완료', count: 23 },
];

const recentRequests = [
  { id: 1, title: '계정 권한 신청', status: 'REQUESTED' },
  { id: 2, title: '장비 교체 요청', status: 'IN_PROGRESS' },
  { id: 3, title: '휴가 시스템 오류 접수', status: 'DONE' },
];

function DashboardPage() {
  return (
    <div>
      <PageTitle title="대시보드" subtitle="업무 요청 현황을 한눈에 확인합니다." />

      <Row gutter={16}>
        {summary.map(item => (
          <Col span={8} key={item.key}>
            <SummaryCard title={item.title} count={item.count} />
          </Col>
        ))}
      </Row>

      <Card title="최근 요청" style={{ marginTop: 24 }}>
        <List
          dataSource={recentRequests}
          renderItem={req => (
            <List.Item extra={<StatusTag status={req.status} />}>
              {req.title}
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}

export default DashboardPage;
```

- `Row gutter={16}` — 열 사이 간격 16px.
- `Col span={8}` — antd 그리드는 24칸 기준. `8 × 3 = 24`이므로 카드 3개가 한 줄에 균등 배치됩니다.

### Step 5. 검색바를 antd Input/Select로 교체

**`src/features/requests/RequestSearchBar.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Input, Select } from 'antd';

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
      <Input
        placeholder="제목으로 검색"
        allowClear
        value={keyword}
        onChange={e => onKeywordChange(e.target.value)}  // Input: 이벤트 객체
        style={{ width: 240 }}
      />
      <Select
        value={status}
        onChange={onStatusChange}                         // Select: 값 자체를 넘김
        options={STATUS_OPTIONS}
        style={{ width: 160 }}
      />
    </div>
  );
}

export default RequestSearchBar;
```

- `onChange={onStatusChange}` — antd `Select`는 값 자체를 넘기므로 `setStatus`를 그대로 연결하면 됩니다(`e.target.value` 불필요).

### Step 6. 요청 목록을 antd Table + Modal로 교체

**`src/features/requests/RequestListPage.jsx`** (전체 교체)

```jsx
import React, { useState } from 'react';
import { Table, Button, Modal, Space, Descriptions } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import RequestSearchBar from './RequestSearchBar';

const INITIAL_REQUESTS = [
  { id: 1, title: '계정 권한 신청', requester: '홍길동', department: '개발팀', status: 'REQUESTED', content: '운영 시스템 접근 권한이 필요합니다.' },
  { id: 2, title: '장비 교체 요청', requester: '김철수', department: '인프라팀', status: 'IN_PROGRESS', content: '노트북 배터리 불량으로 교체가 필요합니다.' },
  { id: 3, title: '휴가 시스템 오류 접수', requester: '이영희', department: '인사팀', status: 'DONE', content: '휴가 신청 화면이 로딩되지 않습니다.' },
  { id: 4, title: 'VPN 접속 계정 요청', requester: '박민수', department: '영업팀', status: 'REQUESTED', content: '재택근무용 VPN 계정을 신청합니다.' },
  { id: 5, title: '사내 메신저 권한 요청', requester: '최지은', department: '디자인팀', status: 'REJECTED', content: '외부 협력사 채널 접근 권한 요청.' },
];

function RequestListPage() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null); // 상세 모달 대상 (null이면 닫힘)

  // 파생 값: 검색 + 상태 필터 (Day 3과 동일)
  const filtered = requests.filter(req => {
    const matchKeyword = req.title.includes(keyword.trim());
    const matchStatus = status === 'ALL' || req.status === status;
    return matchKeyword && matchStatus;
  });

  // 삭제: 명령형 Modal.confirm으로 확인 후 불변 삭제
  const handleDelete = record => {
    Modal.confirm({
      title: '요청 삭제',
      content: `"${record.title}" 요청을 삭제할까요?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => setRequests(prev => prev.filter(r => r.id !== record.id)),
    });
  };

  // Table 열 정의
  const columns = [
    { title: '제목', dataIndex: 'title', key: 'title' },
    { title: '요청자', dataIndex: 'requester', key: 'requester' },
    { title: '부서', dataIndex: 'department', key: 'department' },
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
          <Button size="small" onClick={() => setSelected(record)}>상세</Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>삭제</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />

      <RequestSearchBar
        keyword={keyword}
        status={status}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 5 }}
      />

      {/* 제어형 Modal: selected 유무로 열림/닫힘 */}
      <Modal
        title="요청 상세"
        visible={!!selected}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>닫기</Button>}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="제목">{selected.title}</Descriptions.Item>
            <Descriptions.Item label="요청자">{selected.requester}</Descriptions.Item>
            <Descriptions.Item label="부서">{selected.department}</Descriptions.Item>
            <Descriptions.Item label="상태"><StatusTag status={selected.status} /></Descriptions.Item>
            <Descriptions.Item label="내용">{selected.content}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default RequestListPage;
```

핵심 포인트:
- **상태 관리는 Day 3 그대로**입니다. antd는 표시만 바꿨을 뿐, `useState`·파생 필터·불변 삭제 원리는 동일합니다.
- `render: value => <StatusTag .../>` 와 `render: (_, record) => <Space>...</Space>` — 셀에 컴포넌트/버튼을 넣는 전형적 패턴.
- `visible={!!selected}` — `selected`가 객체면 열림, `null`이면 닫힘. 하나의 state로 "열림 여부 + 무엇을 보여줄지"를 동시에 표현.
- `Descriptions` — 라벨-값 쌍을 정갈하게 보여주는 상세용 컴포넌트.

### Step 7. App.jsx — 레이아웃 + 메뉴 전환

라우터가 없으니 **메뉴 선택 state**로 페이지를 전환합니다(Day 3의 state 활용). Day 8에서 이 부분이 라우터로 대체됩니다.

**`src/App.jsx`** (전체 교체)

```jsx
import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import RequestListPage from '@/features/requests/RequestListPage';

function App() {
  const [menu, setMenu] = useState('dashboard');

  return (
    <AppLayout selectedKey={menu} onSelectMenu={setMenu}>
      {menu === 'dashboard' ? <DashboardPage /> : <RequestListPage />}
    </AppLayout>
  );
}

export default App;
```

### Step 8. global.css 정리

antd가 대부분의 스타일을 담당하므로, Day 2~3에서 만든 커스텀 CSS는 대부분 필요 없어집니다. `src/styles/global.css`를 아래로 **교체**합니다(레이아웃 로고·헤더·검색바·페이지 타이틀만 남김).

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
}

/* 사이드바 로고 */
.app-logo {
  height: 48px;
  margin: 8px;
  color: #fff;
  font-weight: 700;
  text-align: center;
  line-height: 48px;
  letter-spacing: 1px;
}

/* 헤더 타이틀 */
.header-title {
  font-size: 18px;
  font-weight: 700;
}

/* 페이지 타이틀 (Day 2 컴포넌트용) */
.page-title {
  margin-bottom: 16px;
}
.page-title__text {
  font-size: 22px;
  font-weight: 700;
}
.page-title__subtitle {
  margin-top: 4px;
  color: #888;
  font-size: 14px;
}

/* 검색바 */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
```

### Step 9. 실행 확인

```bash
npm start
```

`http://localhost:3000`에서 다음을 확인하세요.

- 좌측에 **어두운 사이드바**(대시보드 / 업무 요청 메뉴, 접기 버튼), 상단 **헤더 바**, 우측 흰 본문 영역
- 사이드바에서 **업무 요청** 클릭 → 본문이 요청 목록으로 전환(선택된 메뉴 하이라이트)
- 요청 목록이 **antd Table**로 표시되고 하단에 페이징(5개씩)
- 검색어·상태 필터가 Table에 즉시 반영
- 각 행 **상세** 클릭 → 상세 정보 **Modal** 오픈, **닫기**/배경/ESC로 닫힘
- **삭제** 클릭 → 확인창(`Modal.confirm`) → 확인 시 행 제거
- **대시보드** 메뉴 → antd Card 요약 3개 + 최근 요청 리스트

---

## 4. 개념 심화

### 4.1 antd를 써도 React 원리는 그대로다

Table·Modal·Select가 화려해 보여도, 그 안은 우리가 Day 3에서 배운 것과 같습니다. `dataSource`는 우리 state(파생 배열)이고, Modal의 열림/닫힘은 우리 state이며, Select는 제어 컴포넌트입니다. **antd는 "잘 만든 컴포넌트 모음"일 뿐, 상태 관리 주체는 여전히 우리 코드**입니다. 이 관점을 가지면 어떤 UI 라이브러리를 만나도 흔들리지 않습니다.

### 4.2 인터페이스를 지키면 갈아끼우기 쉽다

`StatusTag`의 내부를 커스텀 `<span>`에서 antd `Tag`로 통째로 바꿨지만, `status` prop이라는 **인터페이스**는 유지했습니다. 그래서 이 컴포넌트를 쓰던 어떤 코드도 수정할 필요가 없었습니다. 좋은 컴포넌트 경계는 이렇게 "내부 교체 비용"을 낮춥니다(OCP — 확장에는 열려 있고 변경에는 닫혀 있음).

### 4.3 왜 메뉴 전환을 state로 했나 (그리고 왜 곧 버릴 건가)

지금은 라우터가 없어 `menu` state로 화면을 바꿉니다. 하지만 이 방식은 **URL이 안 바뀝니다** — 새로고침하면 대시보드로 돌아가고, 특정 화면을 링크로 공유할 수 없습니다. 이 한계를 몸으로 느끼는 것이 Day 8(React Router) 학습의 동기가 됩니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 컴포넌트가 스타일 없이 밋밋하게 나옴

- **원인**: `import 'antd/dist/antd.css'` 누락.
- **해결**: `src/index.jsx`에 추가(1.2). 추가 후에도 안 되면 dev-server 재시작.

### 5.2 `Cannot find module 'antd/dist/antd.css'`

- **원인**: antd v5가 설치됨(v5엔 이 파일이 없음).
- **해결**: `npm install antd@4`로 버전을 맞춤. `npm ls antd`로 4.x 확인.

### 5.3 설치 시 `ERESOLVE` 충돌

- **원인**: 버전 미고정으로 v5나 최신 icons가 React 16과 어긋남.
- **해결**: `npm install antd@4 @ant-design/icons@4`처럼 고정 설치.

### 5.4 Table에 `Each record ... unique "key"` 경고

- **원인**: `rowKey` 미지정.
- **해결**: `<Table rowKey="id" ...>`. 데이터의 고유 필드를 지정.

### 5.5 Modal이 안 닫힘

- **원인**: 제어형 Modal에서 `onCancel`이 state를 되돌리지 않음.
- **해결**: `onCancel={() => setSelected(null)}`. 열림 조건(`visible`)이 그 state에 묶여 있어야 함.

### 5.6 Select를 골라도 값이 안 바뀜 / `undefined`

- **원인**: antd `Select`의 `onChange`를 `e => set(e.target.value)`로 처리. antd는 값 자체를 넘김.
- **해결**: `onChange={value => set(value)}` 또는 `onChange={set}`.

### 5.7 아이콘에서 `Module not found: @ant-design/icons`

- **원인**: 아이콘 패키지 미설치.
- **해결**: `npm install @ant-design/icons@4`.

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. antd `Layout`을 구성하는 네 조각은?

`Layout`(컨테이너), `Sider`(사이드바), `Header`(상단바), `Content`(본문).

### Q2. Table의 `columns.render`와 `rowKey`는 각각 무슨 역할인가?

`render(value, record)`는 셀을 커스텀으로 그릴 때 씁니다(뱃지·버튼 등). `rowKey`는 각 행을 구별하는 고유 key로, React가 목록을 안정적으로 렌더링하기 위해 필요합니다.

### Q3. antd `Select`의 `onChange`는 네이티브 `<select>`와 어떻게 다른가?

네이티브는 이벤트 객체를 넘겨 `e.target.value`로 값을 읽지만, antd `Select`는 **선택된 값 자체**를 콜백 인자로 넘깁니다.

### Q4. 제어형 Modal과 `Modal.confirm`의 차이는?

제어형 Modal은 `visible` state로 열림/닫힘을 직접 제어하며 임의의 내용을 담습니다(상세 보기). `Modal.confirm`은 함수 호출로 즉석에서 예/아니오 확인창을 띄웁니다(삭제 확인 등).

### Q5. 실제 프로젝트에서 antd 버전을 먼저 확인해야 하는 이유는?

v3/v4/v5의 API가 크게 다르기 때문입니다. 특히 Form(v3 `getFieldDecorator` ↔ v4 `onFinish`), CSS 로딩(v4 전역 CSS ↔ v5 CSS-in-JS), Modal prop(`visible` ↔ `open`) 등이 달라, 버전을 모르면 예제가 그대로 동작하지 않습니다.

---

## 7. Day 4 완료 체크리스트

- [ ] `antd@4`, `@ant-design/icons@4`를 설치했다.
- [ ] `src/index.jsx`에 `antd/dist/antd.css`를 import했다.
- [ ] `StatusTag`를 antd `Tag`로 교체했다(인터페이스 유지).
- [ ] `AppLayout`/`Sidebar`/`HeaderBar`로 관리자 골격을 만들었다.
- [ ] 사이드바 `Menu` 선택으로 대시보드/요청 목록이 전환된다.
- [ ] 대시보드를 `Row`/`Col`/`Card`/`Statistic`/`List`로 구성했다.
- [ ] 요청 목록을 antd `Table`(columns/dataSource/rowKey/render)로 표시했다.
- [ ] 검색바를 antd `Input`/`Select`로 바꾸고 필터가 Table에 반영된다.
- [ ] 상세 보기 제어형 `Modal`과 삭제 `Modal.confirm`이 동작한다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 5 예고)

Day 5에서는 **antd Form**으로 신규 업무 요청 등록 화면을 만듭니다. 제목·요청자·부서·우선순위·내용을 입력받아 검증(validation)하고, 등록하면 목록에 반영합니다. 이때 **antd v4의 Form API**(`Form.useForm()`, `<Form.Item name rules>`, `onFinish`)를 사용합니다 — v3의 `getFieldDecorator` 방식과 어떻게 다른지 직접 비교하며, "버전 확인이 왜 중요한지"를 코드로 체감하게 됩니다.

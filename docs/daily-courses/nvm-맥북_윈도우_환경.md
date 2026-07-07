현재 Node 22가 깔려 있는 상태에서 nvm으로 20을 추가 설치하고 기본으로
전환하는 과정을, 맥(로컬)과 윈도우10(사내) 각각으로 안내드립니다.

중요한 전제 하나: 맥의 nvm(nvm-sh)과 윈도우의 nvm(nvm-windows)은 이름만
같을 뿐 완전히 다른 프로그램입니다. 설치 방법과 주의사항이 다릅니다.

---
1. 맥북 (로컬) — nvm-sh

1-1. 기존 설치 상태 확인

먼저 지금 Node 22가 어떻게 깔려 있는지, nvm이 이미 있는지 확인합니다.

command -v nvm      # 출력 있으면 nvm 이미 설치됨 / 없으면 미설치
which node          # 예) /opt/homebrew/bin/node 또는 
/usr/local/bin/node → 설치형/brew
node -v             # v22.23.0

- which node가 ~/.nvm/... 경로면 이미 nvm으로 관리 중 → 1-3으로 
건너뛰어도 됩니다.
- /opt/homebrew/bin(Apple Silicon) 또는 /usr/local/bin(Intel)이면
Homebrew/공식 설치본입니다. 이 경우 nvm 설치 후 PATH 우선순위 문제가
생길 수 있어 1-4의 주의사항을 꼭 확인하세요.

1-2. nvm 설치

공식 설치 스크립트를 실행합니다. (버전 번호는 nvm-sh 릴리스에서 최신을
확인하세요. 아래는 예시 버전입니다.)

curl -o-
https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

설치 스크립트가 셸 프로필(맥 기본 zsh면 ~/.zshrc)에 아래 같은 로딩
코드를 자동으로 추가합니다.

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

터미널을 새로 열거나 아래로 즉시 반영합니다.

source ~/.zshrc
command -v nvm      # 'nvm' 이 출력되면 성공

1-3. Node 20 설치 및 기본 지정

nvm install 20          # 20.x 최신 LTS 설치 (npm도 함께 설치됨)
nvm use 20              # 현재 셸에서 20 사용
nvm alias default 20    # 새 터미널에서도 항상 20이 기본이 되도록 고정

확인:

node -v     # v20.x.x
npm -v      # 10.x (Node 20에 번들된 npm)
nvm ls      # 설치된 버전 목록 (default → 20 인지 확인)

버전을 자유롭게 오갈 수 있습니다.

nvm use 22    # 다시 22로
nvm use 20    # 20으로

1-4. ⚠️  맥에서 자주 겪는 함정

- Homebrew/공식 설치본과 충돌: 기존 Node 22가 brew나 공식 pkg로
설치됐다면, nvm use 20 후에도 which node가 여전히 brew 경로를 가리킬 수
있습니다. nvm은 보통 PATH 앞에 자기 경로를 넣지만, 확실히 하려면 기존
것을 정리하는 편이 깔끔합니다.
  - brew 설치본 제거: brew uninstall node
  - 공식 pkg 설치본은 별도 제거가 번거로우니, 최소한 which node가
~/.nvm/versions/node/v20...을 가리키는지 확인하세요.
- 프로젝트 고정용 .nvmrc: 프로젝트 루트에 .nvmrc 파일을 만들어 20만
적어두면, 폴더에서 nvm use만 쳐도 20으로 자동 전환됩니다. 팀원 간 버전
통일에 유용합니다.

echo "20" > .nvmrc
nvm use          # .nvmrc 를 읽어 20으로 전환

---
2. 윈도우 10 (사내) — nvm-windows

윈도우는 coreybutler/nvm-windows를 씁니다. 맥용 스크립트는 동작하지
않습니다.

2-1. ⭐ 가장 중요: 기존 Node를 먼저 제거

윈도우에서 Node 22가 공식 설치 마법사(.msi)로 설치돼 있다면,
nvm-windows와 충돌하므로 반드시 먼저 제거해야 합니다. (맥과 달리 이
단계를 건너뛰면 버전 전환이 꼬입니다.)

1. 설정 → 앱 → 앱 및 기능(또는 제어판 → 프로그램 제거)에서 Node.js 제거
2. 아래 폴더가 남아 있으면 삭제(있을 때만):
  - C:\Program Files\nodejs
  - C:\Users\<사용자>\AppData\Roaming\npm
  - C:\Users\<사용자>\AppData\Roaming\npm-cache
3. 시스템 환경 변수 편집 → 환경 변수 → Path에서 위 nodejs/npm 관련
항목이 남아 있으면 제거

▎ 사내 PC라 관리자 권한이나 소프트웨어 설치 정책이 있을 수 있습니다. 
▎ 제거·설치가 막히면 IT/인프라 담당에게 nvm-windows 설치 승인을 
▎ 요청하세요.

2-2. nvm-windows 설치

1. nvm-windows 릴리스 페이지에서 최신 nvm-setup.exe 다운로드 (예: 1.2.2)
2. 설치 마법사 실행 → nvm 설치 경로와 symlink 경로(예: C:\Program 
Files\nodejs)를 확인하며 진행
3. 설치 완료 후, 새 터미널을 "관리자 권한으로 실행" 합니다.
  - nvm-windows는 버전 전환 시 symlink를 만드는데, 이 작업에 관리자
권한이 필요합니다.

확인:
nvm version     # 설치된 nvm 버전 출력되면 성공

2-3. Node 20 설치 및 사용
관리자 권한 터미널(PowerShell 또는 CMD)에서:
nvm install 20.19.0     # 20.x 특정 버전 설치 (버전 번호는 아래 참고)
nvm use 20.19.0         # 20으로 전환 (관리자 권한 필요)

확인:
node -v     # v20.19.0
npm -v      # 10.x
nvm list    # 설치 목록, * 표시가 현재 활성 버전

▎ 버전 지정 팁: nvm-windows는 맥 nvm과 달리 nvm install 20처럼 major만 
▎ 주면 버전에 따라 최신 20.x를 자동으로 못 고를 수 있습니다. 확실하게 
▎ 하려면 nodejs.org에서 원하는 20 LTS 패치 버전(예: 20.19.0)을 확인해 
▎ 전체 버전 번호로 설치하는 것을 권장합니다. nvm list available로 설치 
▎ 가능한 목록도 볼 수 있습니다.

2-4. ⚠️  윈도우에서 자주 겪는 함정
- nvm use가 반영 안 됨 / node를 못 찾음: 관리자 권한 터미널이 아니어서
symlink 생성이 실패한 경우입니다. 관리자 권한으로 다시 nvm use 20.19.0
실행.
- 전역 npm 패키지는 버전 간 공유되지 않습니다: 20에서 설치한 전역
패키지(npm i -g ...)는 22로 바꾸면 사라진 것처럼 보입니다. 버전마다
따로 설치해야 합니다.
- 기존 Node 잔재로 여전히 옛 버전이 뜰 때: where node로 경로를 확인해
nvm이 관리하는 symlink 경로(설치 시 지정한 C:\Program Files\nodejs 등)
하나만 잡히는지 확인하세요. 다른 경로가 함께 잡히면 2-1의 잔재 제거가
덜 된 것입니다.

---
3. 설치 후 프로젝트 검증 (맥·윈도우 공통)

Node 20으로 전환됐으면, 이 프로젝트가 요구하는 환경이 맞춰진 것입니다.

node -v     # v20.x 확인

Day 1 문서대로 진행하면 Webpack 4가 Node 20에서
--openssl-legacy-provider 옵션(이미 package.json scripts에 반영됨)
덕분에 정상 실행됩니다.

---
정리하면:

- 맥: nvm-sh 설치 → nvm install 20 → nvm alias default 20. 기존 22와
자유롭게 병행 가능.
- 윈도우: 기존 Node 제거 먼저 → nvm-windows 설치 → 관리자 터미널에서
nvm install 20.19.0 → nvm use 20.19.0.

원하시면 이 내용을 docs/daily-courses/day0-개발환경_구성.md(또는
docs/setup/) 형태로 저장해 Day 1 앞단 준비 문서로 만들어 둘까요? 사내
윈도우 환경 공유용으로도 쓰기 좋습니다.
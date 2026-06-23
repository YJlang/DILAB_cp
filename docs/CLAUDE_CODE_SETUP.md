# Claude Code 환경 설정 가이드 (DILAB)

> 새 팀원이 본인 노트북에서 DILAB 프로젝트에 Claude Code로 합류하기 위한 단계별 가이드. Windows·macOS·Linux 공통.

---

## 0. 사전 준비물

| 항목 | 비고 |
|---|---|
| Node.js 20+ | `node --version` 으로 확인 |
| Git | `git --version` 확인 |
| Anthropic 계정 | https://claude.com — Pro/Max 또는 API 키 |
| GitHub 계정 | DILAB 저장소 접근 권한 필요 (관리자에게 요청) |

---

## 1. Claude Code 설치

### 공통 (npm)
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### 대안 — 데스크톱 앱
https://claude.com/claude-code 에서 OS별 설치 파일 다운로드.
- macOS: `.dmg`
- Windows: `.exe` 설치 마법사
- Linux: `.deb` / `.AppImage`

설치 후 첫 실행 시 브라우저 로그인 또는 API 키 입력.

---

## 2. 저장소 클론

```bash
git clone https://github.com/YJlang/DILAB.git
cd DILAB
claude
```

Claude Code가 실행되면 `CLAUDE.md`가 자동으로 컨텍스트에 로드됩니다. 이는 팀 공통 컨텍스트이므로 별도 설명 없이 작업을 시작할 수 있습니다.

---

## 3. 필수 Skill 설치

DILAB 워크플로는 4개 skill에 의존합니다. 모두 **global 설치**(`~/.claude/skills/`)로 모든 프로젝트에서 재사용 가능합니다.

### 3.1 skills CLI 준비
```bash
npm install -g skills
skills --version
```

### 3.2 4개 skill 한 번에 설치

```bash
# 1. deep-research (리서치 보고서, 인용 레지스트리, counter-review)
npx -y skills add "https://github.com/daymade/claude-code-skills/tree/main/deep-research" --yes --global

# 2. benchmarking (Competitive Profile Matrix, Gap Analysis)
npx -y skills add "https://github.com/melodic-software/claude-code-plugins/tree/main/plugins/business-analysis/skills/benchmarking" --yes --global

# 3. product-management-workflows (PRD, SWOT, 로드맵)
npx -y skills add "https://github.com/zhizhunbao/workbuddy/tree/main/plugins/marketplaces/cb_teams_marketplace/plugins/product-management/skills/product-management-workflows" --yes --global

# 4. (선택) verify, code-review 등 — Claude Code 내장으로 자동 제공
```

### 3.3 설치 확인
```bash
# Windows PowerShell
Get-ChildItem $env:USERPROFILE\.claude\skills

# macOS / Linux
ls ~/.claude/skills
```

다음 3개가 보이면 OK:
```
benchmarking/
deep-research/
product-management-workflows/
```

### 3.4 알려진 함정 (실제 시행착오 기록)

- **skillsmp MCP 서버는 silent fail**합니다. `npx skills add` CLI로 직접 설치하세요.
- skills CLI는 `--skills` 필터 플래그를 무시하고 루트에서 자동 감지된 skill만 설치합니다. **중첩 경로의 skill은 반드시 GitHub `tree/<branch>/...` URL을 끝까지 명시**해야 정확히 설치됩니다 (위 3번 참고).

---

## 4. 권한 설정 (선택)

DILAB 저장소에는 `.claude/settings.local.json`이 `.gitignore` 되어 있습니다. 본인 환경에서 자주 쓰는 명령에 대한 허용 목록을 직접 작성하세요.

예시 `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(npx *)",
      "Bash(git -C C:/dilab *)",
      "WebFetch(domain:www.syncly.kr)"
    ]
  }
}
```

> 이 파일은 절대 커밋하지 마세요. 사람마다 운영체제·경로·신뢰 도메인이 다릅니다.

---

## 5. 동작 확인 (Smoke Test)

```bash
cd path/to/DILAB
claude
```

프롬프트에서:
```
PLAN.MD를 읽고 한 문장으로 요약해줘.
```

다음과 같은 응답이 나오면 환경 정상:
- 한국어 응답
- 교수님·싱클리·DILAB 키워드 포함
- CLAUDE.md의 정책(디자인 모방 금지 등) 인지

---

## 6. 자주 묻는 질문

**Q. macOS인데 경로가 `C:\dilab\...`로 나와요.**
A. `CLAUDE.md`에 윈도우 경로가 예시로 들어가 있을 뿐, Claude Code는 본인 OS의 현재 작업 디렉토리를 기준으로 동작합니다. 경로 표기 차이는 무시해도 됩니다.

**Q. skill을 프로젝트 단위로만 설치하고 싶어요.**
A. `--global` 대신 `--local`을 사용하면 `.claude/skills/`에 설치됩니다. 단, 이 경우 다른 프로젝트에서 재사용 불가.

**Q. API 비용이 걱정됩니다.**
A. 리서치 워크플로는 토큰을 많이 사용합니다. Pro/Max 정액제 사용을 권장합니다.

**Q. 기존에 다른 회사에서 쓰던 권한 설정이 있어요.**
A. 글로벌 권한은 `~/.claude/settings.json`에 그대로 두고, 프로젝트별 추가만 `.claude/settings.local.json`에 작성하세요.

---

## 7. 다음 단계

설치가 완료되면 [`AGENT_WORKFLOW.md`](AGENT_WORKFLOW.md)로 넘어가 어떤 skill을 언제 호출할지 배우세요.

import React from 'react';
import { useLegacyScripts } from '../components/useLegacyScripts.js';
import css from '../original/main/page.css?raw';
import script1 from '../original/main/script1.js?raw';
import script2 from '../original/main/script2.js?raw';

const scripts = [script1, script2];

export default function MainPage() {
  useLegacyScripts('main', scripts);

  return (
    <>
      <style data-react-page-style="main">{css}</style>
      {"\n"}
      <svg className={"sr-only"} aria-hidden={"true"}>
        {"\n"}
        <symbol id={"i-search"} viewBox={"0 0 24 24"}>
          <circle cx={"11"} cy={"11"} r={"7"} />
          <path d={"m20 20-4-4"} />
        </symbol>
        {"\n"}
        <symbol id={"i-bell"} viewBox={"0 0 24 24"}>
          <path d={"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"} />
          <path d={"M10 21h4"} />
        </symbol>
        {"\n"}
        <symbol id={"i-user"} viewBox={"0 0 24 24"}>
          <circle cx={"12"} cy={"8"} r={"4"} />
          <path d={"M4 21a8 8 0 0 1 16 0"} />
        </symbol>
        {"\n"}
        <symbol id={"i-menu"} viewBox={"0 0 24 24"}>
          <path d={"M4 7h16M4 12h16M4 17h16"} />
        </symbol>
        {"\n"}
        <symbol id={"i-x"} viewBox={"0 0 24 24"}>
          <path d={"m6 6 12 12M18 6 6 18"} />
        </symbol>
        {"\n"}
        <symbol id={"i-layout"} viewBox={"0 0 24 24"}>
          <rect x={"3"} y={"3"} width={"7"} height={"7"} rx={"1"} />
          <rect x={"14"} y={"3"} width={"7"} height={"7"} rx={"1"} />
          <rect x={"3"} y={"14"} width={"7"} height={"7"} rx={"1"} />
          <rect x={"14"} y={"14"} width={"7"} height={"7"} rx={"1"} />
        </symbol>
        {"\n"}
        <symbol id={"i-scan"} viewBox={"0 0 24 24"}>
          <path d={"M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"} />
          <circle cx={"12"} cy={"11"} r={"3"} />
          <path d={"M7 18c1.4-2 3-3 5-3s3.6 1 5 3"} />
        </symbol>
        {"\n"}
        <symbol id={"i-message"} viewBox={"0 0 24 24"}>
          <path d={"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"} />
          <path d={"M8 10h8M8 14h5"} />
        </symbol>
        {"\n"}
        <symbol id={"i-route"} viewBox={"0 0 24 24"}>
          <circle cx={"6"} cy={"19"} r={"2"} />
          <circle cx={"18"} cy={"5"} r={"2"} />
          <path d={"M8 19h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3h-1"} />
        </symbol>
        {"\n"}
        <symbol id={"i-calendar"} viewBox={"0 0 24 24"}>
          <rect x={"3"} y={"5"} width={"18"} height={"16"} rx={"2"} />
          <path d={"M16 3v4M8 3v4M3 10h18"} />
        </symbol>
        {"\n"}
        <symbol id={"i-briefcase"} viewBox={"0 0 24 24"}>
          <rect x={"3"} y={"7"} width={"18"} height={"13"} rx={"2"} />
          <path d={"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"} />
        </symbol>
        {"\n"}
        <symbol id={"i-spark"} viewBox={"0 0 24 24"}>
          <path d={"m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"} />
        </symbol>
        {"\n"}
        <symbol id={"i-chevron-down"} viewBox={"0 0 24 24"}>
          <path d={"m6 9 6 6 6-6"} />
        </symbol>
        {"\n"}
        <symbol id={"i-arrow"} viewBox={"0 0 24 24"}>
          <path d={"M5 12h14M13 6l6 6-6 6"} />
        </symbol>
        {"\n"}
        <symbol id={"i-chevron-left"} viewBox={"0 0 24 24"}>
          <path d={"m15 18-6-6 6-6"} />
        </symbol>
        {"\n"}
        <symbol id={"i-chevron-right"} viewBox={"0 0 24 24"}>
          <path d={"m9 18 6-6-6-6"} />
        </symbol>
        {"\n"}
        <symbol id={"i-pause"} viewBox={"0 0 24 24"}>
          <path d={"M9 5v14M15 5v14"} />
        </symbol>
        {"\n"}
        <symbol id={"i-play"} viewBox={"0 0 24 24"}>
          <path d={"m8 5 11 7-11 7z"} />
        </symbol>
        {"\n"}
        <symbol id={"i-check"} viewBox={"0 0 24 24"}>
          <path d={"m5 12 4 4L19 6"} />
        </symbol>
        {"\n"}
        <symbol id={"i-target"} viewBox={"0 0 24 24"}>
          <circle cx={"12"} cy={"12"} r={"9"} />
          <circle cx={"12"} cy={"12"} r={"5"} />
          <circle cx={"12"} cy={"12"} r={"1"} />
        </symbol>
        {"\n"}
        <symbol id={"i-flame"} viewBox={"0 0 24 24"}>
          <path d={"M12 22c4 0 7-3 7-7 0-5-4-8-6-12 0 4-3 6-5 8-1.5 1.5-3 3.5-3 6a7 7 0 0 0 7 5z"} />
          <path d={"M10 18c0-2 2-3 2-5 2 2 3 3 3 5a3 3 0 0 1-5 0z"} />
        </symbol>
        {"\n"}
        <symbol id={"i-chart"} viewBox={"0 0 24 24"}>
          <path d={"M4 19V9M10 19V5M16 19v-7M22 19H2"} />
        </symbol>
        {"\n"}
        <symbol id={"i-clock"} viewBox={"0 0 24 24"}>
          <circle cx={"12"} cy={"12"} r={"9"} />
          <path d={"M12 7v5l3 2"} />
        </symbol>
        {"\n"}
        <symbol id={"i-external"} viewBox={"0 0 24 24"}>
          <path d={"M14 4h6v6M20 4l-9 9"} />
          <path d={"M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"} />
        </symbol>
        {"\n"}
        <symbol id={"i-location"} viewBox={"0 0 24 24"}>
          <path d={"M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"} />
          <circle cx={"12"} cy={"10"} r={"2"} />
        </symbol>
        {"\n"}
      </svg>
      {"\n"}
      <header className={"topbar"}>
        {"\n"}
        <div className={"topbar-inner"}>
          {"\n"}
          <a className={"brand"} href={"#top"} aria-label={"DREAMCATCH 홈"}>
            <img src={"logo.png"} alt={"국립창원대학교 DREAMCATCH"} />
          </a>
          {"\n"}
          <nav className={"top-nav"} id={"topNavigation"} aria-label={"주 메뉴"}>
            {"\n"}
            <a className={"nav-item"} href={"#top"}>
              <svg className={"icon"}>
                <use href={"#i-layout"} />
              </svg>
              {"AI 커리어 라운지"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#competency"}>
              <svg className={"icon"}>
                <use href={"#i-scan"} />
              </svg>
              {"나의 진단"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#today"}>
              <svg className={"icon"}>
                <use href={"#i-message"} />
              </svg>
              {"상담"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#journey"}>
              <svg className={"icon"}>
                <use href={"#i-route"} />
              </svg>
              {"나의 로드맵"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#programs"}>
              <svg className={"icon"}>
                <use href={"#i-calendar"} />
              </svg>
              {"프로그램"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#jobs"}>
              <svg className={"icon"}>
                <use href={"#i-briefcase"} />
              </svg>
              {"기업·일경험"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#jobs"}>
              <svg className={"icon"}>
                <use href={"#i-spark"} />
              </svg>
              {"취업지원"}
            </a>
            {"\n"}
            <a className={"nav-item"} href={"#competency"}>
              <svg className={"icon"}>
                <use href={"#i-user"} />
              </svg>
              {"내 성장"}
            </a>
            {"\n"}
          </nav>
          {"\n"}
          <div className={"topbar-right"}>
            {"\n"}
            <button className={"icon-button"} id={"searchToggle"} type={"button"} aria-label={"통합검색 열기"} aria-expanded={"false"} aria-controls={"globalSearch"}>
              <svg className={"icon"}>
                <use href={"#i-search"} />
              </svg>
            </button>
            {"\n"}
            <button className={"icon-button notification-button"} type={"button"} aria-label={"알림"} data-toast={"새로운 알림 2건이 있습니다."}>
              <svg className={"icon"}>
                <use href={"#i-bell"} />
              </svg>
            </button>
            {"\n"}
            <div className={"header-profile"} id={"profileMenuRoot"}>
              {"\n"}
              <div className={"profile-popover"} id={"profilePopover"} role={"menu"} aria-label={"사용자 메뉴"} aria-hidden={"true"}>
                {"\n"}
                <div className={"profile-popover-head"}>
                  <span className={"profile-avatar-icon"}>
                    <svg className={"icon"}>
                      <use href={"#i-user"} />
                    </svg>
                  </span>
                  <span>
                    <b>
                      {"김민서"}
                    </b>
                    <small>
                      {"경영학과 · 3학년"}
                    </small>
                  </span>
                </div>
                {"\n"}
                <a className={"profile-action"} href={"#competency"} role={"menuitem"}>
                  <svg className={"icon"}>
                    <use href={"#i-user"} />
                  </svg>
                  {"내 성장"}
                </a>
                {"\n"}
                <button className={"profile-action logout"} type={"button"} role={"menuitem"} data-toast={"로그아웃을 요청했습니다."}>
                  <svg className={"icon"}>
                    <use href={"#i-arrow"} />
                  </svg>
                  {"로그아웃"}
                </button>
                {"\n"}
              </div>
              {"\n"}
              <button className={"profile-trigger"} id={"profileMenuButton"} type={"button"} aria-haspopup={"menu"} aria-expanded={"false"} aria-controls={"profilePopover"} aria-label={"김민서 사용자 메뉴"}>
                <span className={"profile-avatar-icon"}>
                  <svg className={"icon"}>
                    <use href={"#i-user"} />
                  </svg>
                </span>
              </button>
              {"\n"}
            </div>
            {"\n"}
            <button className={"icon-button mobile-menu-toggle"} id={"mobileNavToggle"} type={"button"} aria-label={"주 메뉴 열기"} aria-expanded={"false"} aria-controls={"topNavigation"}>
              <svg className={"icon menu-open-icon"}>
                <use href={"#i-menu"} />
              </svg>
              <svg className={"icon menu-close-icon"}>
                <use href={"#i-x"} />
              </svg>
            </button>
            {"\n"}
          </div>
          {"\n"}
        </div>
        {"\n"}
      </header>
      {"\n"}
      <div className={"global-search"} id={"globalSearch"} aria-hidden={"true"}>
        {"\n"}
        <button className={"search-backdrop"} id={"searchBackdrop"} type={"button"} aria-label={"검색 닫기"}></button>
        {"\n"}
        <section className={"search-panel"} role={"dialog"} aria-modal={"true"} aria-labelledby={"searchTitle"}>
          {"\n"}
          <div className={"search-panel-head"}>
            {"\n"}
            <span className={"search-symbol"}>
              <svg className={"icon"}>
                <use href={"#i-search"} />
              </svg>
            </span>
            {"\n"}
            <div className={"search-panel-title"}>
              <small>
                {"GLOBAL SEARCH"}
              </small>
              <h2 id={"searchTitle"}>
                {"메뉴와 프로그램 검색"}
              </h2>
            </div>
            {"\n"}
            <button className={"search-close"} id={"searchClose"} type={"button"} aria-label={"검색 닫기"}>
              <svg className={"icon"}>
                <use href={"#i-x"} />
              </svg>
            </button>
            {"\n"}
          </div>
          {"\n"}
          <label className={"global-search-field"}>
            <svg className={"icon"}>
              <use href={"#i-search"} />
            </svg>
            <input id={"globalSearchInput"} type={"search"} placeholder={"찾고 싶은 메뉴나 프로그램을 입력하세요"} autoComplete={"off"} />
            <kbd>
              {"ESC"}
            </kbd>
          </label>
          {"\n"}
          <div className={"search-meta"}>
            <b>
              {"빠른 검색"}
            </b>
            <span id={"searchResultCount"}>
              {"6개 결과"}
            </span>
          </div>
          {"\n"}
          <div className={"search-results"} id={"searchResults"} aria-live={"polite"}></div>
          {"\n"}
        </section>
        {"\n"}
      </div>
      {"\n"}
      <div className={"app"} id={"top"}>
        {"\n"}
        <main className={"main"}>
          {"\n"}
          <section className={"career-hero reveal"} aria-labelledby={"welcomeTitle"}>
            {"\n"}
            <div className={"career-hero-left"}>
              {"\n"}
              <div className={"career-hero-copy"}>
                {"\n"}
                <p className={"career-hero-kicker"}>
                  {"MY CAREER DASHBOARD"}
                </p>
                {"\n"}
                <h1 id={"welcomeTitle"}>
                  {"한눈에 보는"}
                  <span>
                    {"오늘 나의 성장"}
                  </span>
                </h1>
                {"\n"}
                <p>
                  {"진단 결과부터 상담, 로드맵과 역량까지 연결된 나의 현재 위치를 확인하고 오늘의 행동을 시작해 보세요."}
                </p>
                {"\n"}
              </div>
              {"\n"}
              <section data-slot={"card"} className={"journey-card hero-roadmap"} id={"journey"} aria-labelledby={"journeyTitle"}>
                {"\n"}
                <header data-slot={"card-header"}>
                  {"\n"}
                  <div>
                    <h2 data-slot={"card-title"} id={"journeyTitle"}>
                      {"나의 진로 여정"}
                    </h2>
                    <p data-slot={"card-description"}>
                      {"내 CARE+7의 현재 위치입니다."}
                    </p>
                  </div>
                  {"\n"}
                </header>
                {"\n"}
                <div data-slot={"card-content"}>
                  {"\n"}
                  <div className={"journey-summary"}>
                    {"\n"}
                    <div className={"hero-progress-meta"}>
                      <strong>
                        {"48%"}
                      </strong>
                      <span>
                        {"7개 여정 중 3개 완료"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"progress-track"} style={{"--value": "48%"}} aria-label={"전체 진행률 48퍼센트"}>
                      <i></i>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"journey-scroll"} tabIndex={"0"} aria-label={"CARE+7 단계 목록, 가로로 스크롤할 수 있습니다"}>
                    {"\n"}
                    <div className={"journey-steps"}>
                      {"\n"}
                      <div className={"journey-step done"}>
                        <span className={"journey-dot"}>
                          <svg className={"icon"}>
                            <use href={"#i-check"} />
                          </svg>
                        </span>
                        <strong>
                          {"진단"}
                        </strong>
                        <small>
                          {"완료"}
                        </small>
                      </div>
                      {"\n"}
                      <div className={"journey-step done"}>
                        <span className={"journey-dot"}>
                          <svg className={"icon"}>
                            <use href={"#i-check"} />
                          </svg>
                        </span>
                        <strong>
                          {"상담"}
                        </strong>
                        <small>
                          {"완료"}
                        </small>
                      </div>
                      {"\n"}
                      <div className={"journey-step done"}>
                        <span className={"journey-dot"}>
                          <svg className={"icon"}>
                            <use href={"#i-check"} />
                          </svg>
                        </span>
                        <strong>
                          {"로드맵"}
                        </strong>
                        <small>
                          {"완료"}
                        </small>
                      </div>
                      {"\n"}
                      <div className={"journey-step current"}>
                        <span className={"journey-dot"}>
                          {"C4"}
                        </span>
                        <strong>
                          {"역량강화"}
                        </strong>
                        <small>
                          {"진행 중"}
                        </small>
                      </div>
                      {"\n"}
                      <div className={"journey-step"}>
                        <span className={"journey-dot"}>
                          {"C5"}
                        </span>
                        <strong>
                          {"기업연계"}
                        </strong>
                        <small>
                          {"예정"}
                        </small>
                      </div>
                      {"\n"}
                      <div className={"journey-step"}>
                        <span className={"journey-dot"}>
                          {"C6"}
                        </span>
                        <strong>
                          {"취업지원"}
                        </strong>
                        <small>
                          {"예정"}
                        </small>
                      </div>
                      {"\n"}
                      <div className={"journey-step"}>
                        <span className={"journey-dot"}>
                          {"C7"}
                        </span>
                        <strong>
                          {"사후관리"}
                        </strong>
                        <small>
                          {"예정"}
                        </small>
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </section>
              {"\n"}
            </div>
            {"\n"}
            <div className={"career-hero-board"}>
              {"\n"}
              <div className={"career-hero-top"}>
                {"\n"}
                <div className={"career-hero-stack"}>
                  {"\n"}
                  <section data-slot={"card"} className={"hero-panel hero-todo"} id={"today"} aria-labelledby={"todoTitle"}>
                    {"\n"}
                    <header data-slot={"card-header"}>
                      {"\n"}
                      <div>
                        <h2 data-slot={"card-title"} id={"todoTitle"}>
                          {"오늘 할 일"}
                        </h2>
                      </div>
                      {"\n"}
                      <span data-slot={"card-action"} className={"badge blue"}>
                        {"08.26 수요일"}
                      </span>
                      {"\n"}
                    </header>
                    {"\n"}
                    <div data-slot={"card-content"}>
                      {"\n"}
                      <div className={"todo-list"} id={"todoList"}>
                        {"\n"}
                        <div className={"todo-item completed"}>
                          <button className={"todo-check"} type={"button"} aria-label={"기업 분석 노트 작성 완료 상태 변경"} aria-pressed={"true"}>
                            <svg className={"icon"}>
                              <use href={"#i-check"} />
                            </svg>
                          </button>
                          <span className={"todo-copy"}>
                            <b>
                              {"기업 분석 노트 작성"}
                            </b>
                            <small>
                              {"DN솔루션즈 · 채용공고 분석"}
                            </small>
                          </span>
                          <span className={"todo-time"}>
                            {"완료"}
                          </span>
                        </div>
                        {"\n"}
                        <div className={"todo-item"}>
                          <button className={"todo-check"} type={"button"} aria-label={"IAP 목표 활동 등록 완료 상태 변경"} aria-pressed={"false"}>
                            <svg className={"icon"}>
                              <use href={"#i-check"} />
                            </svg>
                          </button>
                          <span className={"todo-copy"}>
                            <b>
                              {"IAP 목표 활동 등록"}
                            </b>
                            <small>
                              {"로드맵 설계 · 필수 항목"}
                            </small>
                          </span>
                          <span className={"todo-time"}>
                            {"D-2"}
                          </span>
                        </div>
                        {"\n"}
                        <div className={"todo-item"}>
                          <button className={"todo-check"} type={"button"} aria-label={"진로 상담 사전 질문 작성 완료 상태 변경"} aria-pressed={"false"}>
                            <svg className={"icon"}>
                              <use href={"#i-check"} />
                            </svg>
                          </button>
                          <span className={"todo-copy"}>
                            <b>
                              {"진로 상담 사전 질문 작성"}
                            </b>
                            <small>
                              {"상담 예약 · 김지현 상담사"}
                            </small>
                          </span>
                          <span className={"todo-time"}>
                            {"16:00"}
                          </span>
                        </div>
                        {"\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    <footer data-slot={"card-footer"}>
                      <button className={"button"} type={"button"} data-toast={"오늘 할 일 전체 목록을 확인합니다."}>
                        {"전체 일정 보기 "}
                        <svg className={"icon"}>
                          <use href={"#i-arrow"} />
                        </svg>
                      </button>
                    </footer>
                    {"\n"}
                  </section>
                  {"\n"}
                  <section data-slot={"card"} className={"hero-panel hero-quest"} aria-labelledby={"questTitle"}>
                    {"\n"}
                    <header data-slot={"card-header"}>
                      {"\n"}
                      <div>
                        <h2 data-slot={"card-title"} id={"questTitle"}>
                          {"오늘의 퀘스트"}
                        </h2>
                        <p data-slot={"card-description"}>
                          {"작은 실행을 모아 성장 포인트를 쌓아보세요."}
                        </p>
                      </div>
                      {"\n"}
                      <button data-slot={"card-action"} className={"hero-inline-action"} type={"button"} data-toast={"전체 퀘스트 화면으로 이동합니다."}>
                        {"전체 보기 "}
                        <svg className={"icon"}>
                          <use href={"#i-arrow"} />
                        </svg>
                      </button>
                      {"\n"}
                    </header>
                    {"\n"}
                    <div data-slot={"card-content"}>
                      {"\n"}
                      <div className={"quest-layout"}>
                        {"\n"}
                        <div className={"quest-ring"} role={"img"} aria-label={"오늘의 퀘스트 달성률 72퍼센트"}>
                          <span className={"quest-value"}>
                            <strong>
                              {"72%"}
                            </strong>
                          </span>
                        </div>
                        {"\n"}
                        <div className={"quest-copy"}>
                          <b>
                            {"커리어 루틴 만들기"}
                          </b>
                          <p>
                            {"오늘 5개 중 3개 완료"}
                            <br />
                            {"2개만 더 달성해 보세요!"}
                          </p>
                          <div className={"quest-steps"} aria-hidden={"true"}>
                            <i className={"done"}></i>
                            <i className={"done"}></i>
                            <i className={"done"}></i>
                            <i></i>
                            <i></i>
                          </div>
                        </div>
                        {"\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                    <footer data-slot={"card-footer"}>
                      <button className={"button"} type={"button"} data-toast={"전체 퀘스트 화면으로 이동합니다."}>
                        {"전체 퀘스트 보기 "}
                        <svg className={"icon"}>
                          <use href={"#i-arrow"} />
                        </svg>
                      </button>
                    </footer>
                    {"\n"}
                  </section>
                  {"\n"}
                </div>
                {"\n"}
                <section data-slot={"card"} className={"hero-panel hero-attendance attendance-card"} aria-labelledby={"attendanceTitle"}>
                  {"\n"}
                  <header data-slot={"card-header"}>
                    {"\n"}
                    <div>
                      <h2 data-slot={"card-title"} id={"attendanceTitle"}>
                        {"출석체크"}
                      </h2>
                      <p data-slot={"card-description"}>
                        {"매일 접속하고 성장 포인트를 받아요."}
                      </p>
                    </div>
                    {"\n"}
                    <span data-slot={"card-action"} className={"badge amber"}>
                      {"12일 연속"}
                    </span>
                    {"\n"}
                  </header>
                  {"\n"}
                  <div data-slot={"card-content"}>
                    {"\n"}
                    <div className={"attendance-center"}>
                      <div className={"attendance-streak"}>
                        <span>
                          <strong>
                            {"TODAY"}
                            <br />
                            {"CHECK"}
                          </strong>
                        </span>
                      </div>
                      <div>
                        <p>
                          {"매일 출석하고 성장 포인트를 모아보세요."}
                        </p>
                        <button className={"button primary attendance-button"} id={"attendanceButton"} type={"button"}>
                          {"출석하기 +10P"}
                        </button>
                      </div>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                </section>
                {"\n"}
              </div>
              {"\n"}
              <section data-slot={"card"} className={"hero-panel hero-competency"} id={"competency"} aria-labelledby={"competencyTitle"}>
                {"\n"}
                <header data-slot={"card-header"}>
                  {"\n"}
                  <div>
                    <h2 data-slot={"card-title"} id={"competencyTitle"}>
                      {"나의 6대 핵심역량"}
                    </h2>
                  </div>
                  {"\n"}
                  <button data-slot={"card-action"} className={"hero-inline-action"} type={"button"} data-toast={"핵심역량 상세 리포트를 엽니다."}>
                    {"진단 결과 "}
                    <svg className={"icon"}>
                      <use href={"#i-arrow"} />
                    </svg>
                  </button>
                  {"\n"}
                </header>
                {"\n"}
                <div data-slot={"card-content"}>
                  {"\n"}
                  <div className={"competency-layout"}>
                    {"\n"}
                    <div className={"radar-wrap"}>
                      {"\n"}
                      <svg className={"radar-chart"} viewBox={"0 0 300 280"} role={"img"} aria-label={"의사소통 68, 문제해결 74, 협업 81, 창의성 59, 직무전문성 62, 글로벌 72"}>
                        {"\n"}
                        <polygon className={"radar-grid"} points={"150,22 256,84 256,196 150,258 44,196 44,84"} />
                        {"\n"}
                        <polygon className={"radar-grid"} points={"150,52 230,98 230,182 150,228 70,182 70,98"} />
                        {"\n"}
                        <polygon className={"radar-grid"} points={"150,82 204,112 204,168 150,198 96,168 96,112"} />
                        {"\n"}
                        <path className={"radar-axis"} d={"M150 140V22M150 140l106-56M150 140l106 56M150 140v118M150 140L44 196M150 140L44 84"} />
                        {"\n"}
                        <polygon className={"radar-average"} points={"150,60 220,102 224,179 150,212 78,178 90,106"} />
                        {"\n"}
                        <polygon className={"radar-target"} points={"150,46 238,92 230,182 150,216 82,176 86,104"} />
                        {"\n"}
                        <polygon className={"radar-current"} points={"150,60 228,99 236,185 150,210 84,175 74,100"} />
                        {"\n"}
                        <text className={"radar-label"} x={"150"} y={"10"} textAnchor={"middle"}>
                          {"의사소통"}
                        </text>
                        <text className={"radar-label"} x={"266"} y={"80"}>
                          {"문제해결"}
                        </text>
                        <text className={"radar-label"} x={"266"} y={"204"}>
                          {"협업"}
                        </text>
                        <text className={"radar-label"} x={"150"} y={"276"} textAnchor={"middle"}>
                          {"창의성"}
                        </text>
                        <text className={"radar-label"} x={"10"} y={"204"}>
                          {"직무전문성"}
                        </text>
                        <text className={"radar-label"} x={"10"} y={"80"}>
                          {"글로벌"}
                        </text>
                        {"\n"}
                      </svg>
                      {"\n"}
                    </div>
                    {"\n"}
                    <div className={"competency-side"}>
                      {"\n"}
                      <div className={"competency-legend"} aria-label={"차트 범례"}>
                        <span>
                          <i style={{"background": "var(--competency-current)"}}></i>
                          {"나의 현재"}
                        </span>
                        <span>
                          <i style={{"background": "var(--competency-target)"}}></i>
                          {"목표 직무"}
                        </span>
                        <span>
                          <i style={{"background": "var(--chart-reference)"}}></i>
                          {"학과 평균"}
                        </span>
                      </div>
                      {"\n"}
                      <div className={"axis-list"}>
                        {"\n"}
                        <div className={"axis-item"}>
                          <div className={"axis-head"}>
                            <b>
                              {"의사소통"}
                            </b>
                            <strong>
                              {"68"}
                            </strong>
                          </div>
                          <div className={"axis-track"}>
                            <i style={{"--value": "68%"}}></i>
                          </div>
                        </div>
                        {"\n"}
                        <div className={"axis-item"}>
                          <div className={"axis-head"}>
                            <b>
                              {"문제해결"}
                            </b>
                            <strong>
                              {"74"}
                            </strong>
                          </div>
                          <div className={"axis-track"}>
                            <i style={{"--value": "74%"}}></i>
                          </div>
                        </div>
                        {"\n"}
                        <div className={"axis-item"}>
                          <div className={"axis-head"}>
                            <b>
                              {"협업"}
                            </b>
                            <strong>
                              {"81"}
                            </strong>
                          </div>
                          <div className={"axis-track"}>
                            <i style={{"--value": "81%"}}></i>
                          </div>
                        </div>
                        {"\n"}
                        <div className={"axis-item"}>
                          <div className={"axis-head"}>
                            <b>
                              {"창의성"}
                            </b>
                            <strong>
                              {"59"}
                            </strong>
                          </div>
                          <div className={"axis-track"}>
                            <i style={{"--value": "59%"}}></i>
                          </div>
                        </div>
                        {"\n"}
                        <div className={"axis-item"}>
                          <div className={"axis-head"}>
                            <b>
                              {"직무전문성"}
                            </b>
                            <strong>
                              {"62"}
                            </strong>
                          </div>
                          <div className={"axis-track"}>
                            <i style={{"--value": "62%"}}></i>
                          </div>
                        </div>
                        {"\n"}
                        <div className={"axis-item"}>
                          <div className={"axis-head"}>
                            <b>
                              {"글로벌"}
                            </b>
                            <strong>
                              {"72"}
                            </strong>
                          </div>
                          <div className={"axis-track"}>
                            <i style={{"--value": "72%"}}></i>
                          </div>
                        </div>
                        {"\n"}
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </section>
              {"\n"}
            </div>
            {"\n"}
          </section>
          {"\n"}
          <div className={"dashboard-grid"}>
            {"\n"}
            <section data-slot={"card"} className={"program-card-shell span-12 reveal"} id={"programs"} aria-labelledby={"programTitle"}>
              {"\n"}
              <header data-slot={"card-header"}>
                {"\n"}
                <div>
                  <h2 data-slot={"card-title"} id={"programTitle"}>
                    {"진행 중인 진로·취업 프로그램"}
                  </h2>
                  <p data-slot={"card-description"}>
                    {"나의 진로 유형과 관심 직무를 바탕으로 선별했어요."}
                  </p>
                </div>
                {"\n"}
                <a data-slot={"card-action"} className={"button"} href={"#"} data-toast={"전체 프로그램 목록으로 이동합니다."}>
                  {"전체 보기 "}
                  <svg className={"icon"}>
                    <use href={"#i-arrow"} />
                  </svg>
                </a>
                {"\n"}
              </header>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"program-viewport"}>
                  {"\n"}
                  <div className={"program-track"} id={"programTrack"} tabIndex={"0"} aria-label={"추천 프로그램 목록"}>
                    {"\n"}
                    <a className={"program-card"} href={"#"}>
                      <img src={"thumb1.png"} alt={"인적성 NCS 역량검사 프로그램 포스터"} />
                      <div className={"program-copy"}>
                        <div className={"program-meta"}>
                          <span className={"program-category"}>
                            {"공기업준비"}
                          </span>
                          <span className={"program-dday"}>
                            {"D-04"}
                          </span>
                        </div>
                        <h3>
                          {"2026 하반기 공채 대비 인적성·NCS 역량검사 특강"}
                        </h3>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"program-card"} href={"#"}>
                      <img src={"thumb2.png"} alt={"Career-Up 멘토링 스터디 포스터"} />
                      <div className={"program-copy"}>
                        <div className={"program-meta"}>
                          <span className={"program-category"}>
                            {"멘토링"}
                          </span>
                          <span className={"program-dday"}>
                            {"D-08"}
                          </span>
                        </div>
                        <h3>
                          {"2026 졸업생 특화 Career-Up 멘토링 스터디 참가자 모집"}
                        </h3>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"program-card"} href={"#"}>
                      <img src={"thumb3.jpg"} alt={"취업 부스트업 트랙 포스터"} />
                      <div className={"program-copy"}>
                        <div className={"program-meta"}>
                          <span className={"program-category"}>
                            {"직무역량"}
                          </span>
                          <span className={"program-dday"}>
                            {"D-12"}
                          </span>
                        </div>
                        <h3>
                          {"재맞고 점프업 직무역량강화 취업 부스트업 트랙"}
                        </h3>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"program-card"} href={"#"}>
                      <img src={"thumb4.png"} alt={"Career-Up 멘토링 프로그램 포스터"} />
                      <div className={"program-copy"}>
                        <div className={"program-meta"}>
                          <span className={"program-category"}>
                            {"상담"}
                          </span>
                          <span className={"program-dday"}>
                            {"D-16"}
                          </span>
                        </div>
                        <h3>
                          {"2026 졸업생 특화 Career-Up 멘토링 스터디"}
                        </h3>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"program-card"} href={"#"}>
                      <img src={"thumb5.png"} alt={"취업콘텐츠 이러닝 포스터"} />
                      <div className={"program-copy"}>
                        <div className={"program-meta"}>
                          <span className={"program-category"}>
                            {"e-러닝"}
                          </span>
                          <span className={"program-dday"}>
                            {"D-22"}
                          </span>
                        </div>
                        <h3>
                          {"경남형 AI-CES 취업콘텐츠 e-러닝 참여자 모집"}
                        </h3>
                      </div>
                    </a>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"program-nav program-nav-prev"}>
                    <button className={"carousel-button"} id={"programPrev"} type={"button"} aria-label={"이전 프로그램"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-left"} />
                      </svg>
                    </button>
                  </div>
                  {"\n"}
                  <div className={"program-nav program-nav-next"}>
                    <button className={"carousel-button"} id={"programNext"} type={"button"} aria-label={"다음 프로그램"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-right"} />
                      </svg>
                    </button>
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"jobs-card span-12 reveal"} id={"jobs"} aria-labelledby={"jobsTitle"}>
              {"\n"}
              <header data-slot={"card-header"}>
                {"\n"}
                <div>
                  <h2 data-slot={"card-title"} id={"jobsTitle"}>
                    {"AI 추천 채용공고"}
                  </h2>
                  <p data-slot={"card-description"}>
                    {"진단 결과와 활동 데이터를 바탕으로 나와 잘 맞는 공고를 추천해요."}
                  </p>
                </div>
                {"\n"}
                <a data-slot={"card-action"} className={"button"} href={"#"} data-toast={"전체 추천 채용공고로 이동합니다."}>
                  {"전체 보기 "}
                  <svg className={"icon"}>
                    <use href={"#i-arrow"} />
                  </svg>
                </a>
                {"\n"}
              </header>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"jobs-layout"}>
                  {"\n"}
                  <article className={"featured-job"}>
                    <div className={"featured-top"}>
                      <span className={"company-mark"}>
                        {"DN"}
                      </span>
                      <span className={"match-badge"}>
                        {"AI 매칭 92%"}
                      </span>
                    </div>
                    <h3>
                      {"DN솔루션즈"}
                      <br />
                      {"생산기술 신입사원"}
                    </h3>
                    <p>
                      {"공정개선 및 생산성 향상 업무를 담당하며 스마트 제조 환경 구축에 함께합니다."}
                    </p>
                    <div className={"job-tags"}>
                      <span>
                        {"창원시"}
                      </span>
                      <span>
                        {"정규직"}
                      </span>
                      <span>
                        {"기계·산업공학"}
                      </span>
                    </div>
                    <div className={"featured-footer"}>
                      <strong>
                        {"2026.08.28 마감 · D-9"}
                      </strong>
                      <a className={"featured-link"} href={"#"} aria-label={"DN솔루션즈 공고 보기"}>
                        <svg className={"icon"}>
                          <use href={"#i-external"} />
                        </svg>
                      </a>
                    </div>
                  </article>
                  {"\n"}
                  <div className={"job-list"}>
                    {"\n"}
                    <a className={"job-row"} href={"#"}>
                      <span className={"job-logo"}>
                        {"LG"}
                      </span>
                      <div className={"job-copy"}>
                        <span className={"job-match"}>
                          {"AI 매칭 88%"}
                        </span>
                        <h3>
                          {"LG전자 H&A본부 R&D 신입"}
                        </h3>
                        <p>
                          {"창원 · 정규직 · 기계/전기전자"}
                        </p>
                      </div>
                      <div className={"job-deadline"}>
                        <b>
                          {"D-7"}
                        </b>
                        <span>
                          {"08.26 마감"}
                        </span>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"job-row"} href={"#"}>
                      <span className={"job-logo"}>
                        {"HD"}
                      </span>
                      <div className={"job-copy"}>
                        <span className={"job-match"}>
                          {"AI 매칭 84%"}
                        </span>
                        <h3>
                          {"HD현대중공업 생산관리"}
                        </h3>
                        <p>
                          {"울산 · 정규직 · 산업공학"}
                        </p>
                      </div>
                      <div className={"job-deadline"}>
                        <b>
                          {"D-12"}
                        </b>
                        <span>
                          {"08.31 마감"}
                        </span>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"job-row"} href={"#"}>
                      <span className={"job-logo"}>
                        {"HAN"}
                      </span>
                      <div className={"job-copy"}>
                        <span className={"job-match"}>
                          {"AI 매칭 81%"}
                        </span>
                        <h3>
                          {"한화에어로스페이스 품질기술"}
                        </h3>
                        <p>
                          {"창원 · 채용연계형 인턴 · 공학계열"}
                        </p>
                      </div>
                      <div className={"job-deadline"}>
                        <b>
                          {"D-14"}
                        </b>
                        <span>
                          {"09.02 마감"}
                        </span>
                      </div>
                    </a>
                    {"\n"}
                    <a className={"job-row"} href={"#"}>
                      <span className={"job-logo"}>
                        {"KAI"}
                      </span>
                      <div className={"job-copy"}>
                        <span className={"job-match"}>
                          {"AI 매칭 77%"}
                        </span>
                        <h3>
                          {"한국항공우주산업 체험형 인턴"}
                        </h3>
                        <p>
                          {"사천 · 인턴 · 전공무관"}
                        </p>
                      </div>
                      <div className={"job-deadline"}>
                        <b>
                          {"D-18"}
                        </b>
                        <span>
                          {"09.06 마감"}
                        </span>
                      </div>
                    </a>
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"span-12 reveal"} id={"notices"} aria-labelledby={"noticeTitle"}>
              {"\n"}
              <header data-slot={"card-header"}>
                {"\n"}
                <div>
                  <h2 data-slot={"card-title"} id={"noticeTitle"}>
                    {"공지사항"}
                  </h2>
                  <p data-slot={"card-description"}>
                    {"프로그램과 진로·취업 관련 새 소식을 확인하세요."}
                  </p>
                </div>
                {"\n"}
                <a data-slot={"card-action"} className={"button"} href={"#"} data-toast={"공지사항 전체 목록으로 이동합니다."}>
                  {"전체 보기 "}
                  <svg className={"icon"}>
                    <use href={"#i-arrow"} />
                  </svg>
                </a>
                {"\n"}
              </header>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"section-toolbar notice-toolbar"}>
                  <div className={"notice-tabs"} role={"tablist"} aria-label={"공지사항 분류"}>
                    <button className={"notice-tab active"} type={"button"} role={"tab"} aria-selected={"true"} data-notice-tab={"all"}>
                      {"전체"}
                    </button>
                    <button className={"notice-tab"} type={"button"} role={"tab"} aria-selected={"false"} data-notice-tab={"program"}>
                      {"프로그램"}
                    </button>
                    <button className={"notice-tab"} type={"button"} role={"tab"} aria-selected={"false"} data-notice-tab={"career"}>
                      {"진로·취업"}
                    </button>
                    <button className={"notice-tab"} type={"button"} role={"tab"} aria-selected={"false"} data-notice-tab={"system"}>
                      {"시스템"}
                    </button>
                  </div>
                </div>
                {"\n"}
                <div className={"notice-list"} id={"noticeList"} role={"tabpanel"}>
                  {"\n"}
                  <a className={"notice-row"} data-category={"program"} href={"#"}>
                    <span className={"notice-category"}>
                      {"프로그램"}
                    </span>
                    <span className={"notice-copy"}>
                      <b>
                        {"2026학년도 하반기 비교과 프로그램 참여 안내"}
                      </b>
                      <small>
                        {"역량별 추천 프로그램과 신청 일정을 확인해 주세요."}
                      </small>
                    </span>
                    <time dateTime={"2026-08-19"}>
                      {"2026.08.19"}
                    </time>
                    <span className={"notice-arrow"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-right"} />
                      </svg>
                    </span>
                  </a>
                  {"\n"}
                  <a className={"notice-row"} data-category={"career"} href={"#"}>
                    <span className={"notice-category"}>
                      {"진로·취업"}
                    </span>
                    <span className={"notice-copy"}>
                      <b>
                        {"취업전략센터 1:1 맞춤 상담 예약 오픈"}
                      </b>
                      <small>
                        {"목표 직무별 전문 컨설턴트와 상담할 수 있습니다."}
                      </small>
                    </span>
                    <time dateTime={"2026-08-18"}>
                      {"2026.08.18"}
                    </time>
                    <span className={"notice-arrow"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-right"} />
                      </svg>
                    </span>
                  </a>
                  {"\n"}
                  <a className={"notice-row"} data-category={"system"} href={"#"}>
                    <span className={"notice-category"}>
                      {"시스템"}
                    </span>
                    <span className={"notice-copy"}>
                      <b>
                        {"AI 역량진단 결과 리포트 기능 업데이트"}
                      </b>
                      <small>
                        {"변화 추이와 추천 활동을 한 화면에서 확인하세요."}
                      </small>
                    </span>
                    <time dateTime={"2026-08-14"}>
                      {"2026.08.14"}
                    </time>
                    <span className={"notice-arrow"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-right"} />
                      </svg>
                    </span>
                  </a>
                  {"\n"}
                  <a className={"notice-row"} data-category={"career"} href={"#"}>
                    <span className={"notice-category"}>
                      {"진로·취업"}
                    </span>
                    <span className={"notice-copy"}>
                      <b>
                        {"지역 우수기업 온라인 채용설명회 개최"}
                      </b>
                      <small>
                        {"기업 담당자에게 직무와 채용 정보를 직접 들어보세요."}
                      </small>
                    </span>
                    <time dateTime={"2026-08-12"}>
                      {"2026.08.12"}
                    </time>
                    <span className={"notice-arrow"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-right"} />
                      </svg>
                    </span>
                  </a>
                  {"\n"}
                  <a className={"notice-row"} data-category={"program"} href={"#"}>
                    <span className={"notice-category"}>
                      {"프로그램"}
                    </span>
                    <span className={"notice-copy"}>
                      <b>
                        {"CARE+7 성장 포인트 운영 기준 안내"}
                      </b>
                      <small>
                        {"활동별 적립 기준과 활용 방법을 안내드립니다."}
                      </small>
                    </span>
                    <time dateTime={"2026-08-08"}>
                      {"2026.08.08"}
                    </time>
                    <span className={"notice-arrow"}>
                      <svg className={"icon"}>
                        <use href={"#i-chevron-right"} />
                      </svg>
                    </span>
                  </a>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
          </div>
          {"\n"}
        </main>
        {"\n"}
        <footer className={"site-footer"}>
          {"\n"}
          <div className={"site-footer-inner"}>
            {"\n"}
            <img className={"footer-logo"} src={"logo-footer.png"} alt={"CWNU 국립창원대학교"} />
            {"\n"}
            <div className={"footer-content"}>
              {"\n"}
              <nav className={"footer-links"} aria-label={"푸터 메뉴"}>
                <a href={"#privacy"}>
                  {"개인정보처리방침"}
                </a>
                <a href={"#email-reject"}>
                  {"이메일무단수집거부"}
                </a>
              </nav>
              {"\n"}
              <div className={"footer-info"}>
                <span>
                  <strong>
                    {"E-MAIL"}
                  </strong>
                  {" cwjob@changwon.ac.kr"}
                </span>
                <span>
                  {"51140 경상남도 창원시 의창구 창원대학로 20"}
                </span>
              </div>
              {"\n"}
              <p className={"footer-copyright"}>
                {"COPYRIGHT CHANGWON NATIONAL UNIVERSITY. ALL RIGHTS RESERVED."}
              </p>
              {"\n"}
            </div>
            {"\n"}
          </div>
          {"\n"}
        </footer>
        {"\n"}
      </div>
      {"\n"}
      <section className={"career-popup"} id={"careerPopup"} role={"dialog"} aria-modal={"true"} aria-hidden={"true"} aria-labelledby={"careerPopupTitle"}>
        {"\n"}
        <h2 className={"career-popup-title"} id={"careerPopupTitle"}>
          {"POPUP"}
        </h2>
        {"\n"}
        <div className={"career-popup-stage"}>
          {"\n"}
          <button className={"career-popup-arrow career-popup-prev"} id={"careerPopupPrev"} type={"button"} aria-label={"이전 팝업"}>
            <svg className={"icon"}>
              <use href={"#i-chevron-left"} />
            </svg>
          </button>
          {"\n"}
          <div className={"career-popup-carousel"} id={"careerPopupCarousel"} aria-live={"polite"}>
            {"\n"}
            <a className={"career-popup-slide"} href={"#"} data-popup-slide="" data-toast={"진로·취업지원 학생 통합수요조사 안내를 확인합니다."}>
              <img src={"pop01.png"} alt={"2026학년도 진로·취업지원 학생 통합수요조사 안내"} />
            </a>
            {"\n"}
            <a className={"career-popup-slide"} href={"#"} data-popup-slide="" data-toast={"청년카페 창원 8월 프로그램 안내를 확인합니다."}>
              <img src={"pop02.jpg"} alt={"청년카페 창원 8월 프로그램 참여자 모집 안내"} />
            </a>
            {"\n"}
            <a className={"career-popup-slide"} href={"#"} data-popup-slide="" data-toast={"창대한 멘토단 트랙 참가자 모집 안내를 확인합니다."}>
              <img src={"pop03.png"} alt={"창대한 멘토단 트랙 9월 참가자 모집 안내"} />
            </a>
            {"\n"}
            <a className={"career-popup-slide"} href={"#"} data-popup-slide="" data-toast={"창대한 멘토단 트랙 참가자 모집 안내를 확인합니다."}>
              <img src={"thumb4.png"} alt={"Career-up 멘토링 스터디 7월 참가자 모집"} />
            </a>
            {"\n"}
          </div>
          {"\n"}
          <button className={"career-popup-arrow career-popup-next"} id={"careerPopupNext"} type={"button"} aria-label={"다음 팝업"}>
            <svg className={"icon"}>
              <use href={"#i-chevron-right"} />
            </svg>
          </button>
          {"\n"}
        </div>
        {"\n"}
        <div className={"career-popup-controls"}>
          {"\n"}
          <button className={"career-popup-control icon-only"} id={"careerPopupPause"} type={"button"} aria-label={"팝업 자동 전환 일시정지"} aria-pressed={"false"}>
            <svg className={"icon"}>
              <use href={"#i-pause"} />
            </svg>
          </button>
          {"\n"}
          <span className={"career-popup-control count"} id={"careerPopupCount"}>
            {"팝업 4건"}
          </span>
          {"\n"}
          <button className={"career-popup-control"} id={"careerPopupClose"} type={"button"}>
            {"닫기 "}
            <svg className={"icon"}>
              <use href={"#i-x"} />
            </svg>
          </button>
          {"\n"}
          <button className={"career-popup-control"} id={"careerPopupToday"} type={"button"}>
            {"오늘 하루 열지 않기 "}
            <svg className={"icon"}>
              <use href={"#i-x"} />
            </svg>
          </button>
          {"\n"}
        </div>
        {"\n"}
      </section>
      {"\n"}
      <div className={"floating-control-stack"}>
        {"\n"}
        <button className={"button popup-float-button"} id={"careerPopupOpen"} type={"button"}>
          <svg className={"icon"}>
            <use href={"#i-layout"} />
          </svg>
          {"팝업 보기"}
        </button>
        {"\n"}
        <aside className={"color-theme-remote"} aria-label={"색상 테마 선택"}>
          {"\n"}
          <div className={"color-theme-options"} role={"group"} aria-label={"톤앤매너 선택"}>
            {"\n"}
            <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"default"} aria-label={"드림 색상 테마"} title={"드림"}>
              <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
              <span className={"color-theme-choice-label"}>
                {"드림"}
              </span>
            </button>
            {"\n"}
            <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"forest"} aria-label={"포레스트 색상 테마"} title={"포레스트"}>
              <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
              <span className={"color-theme-choice-label"}>
                {"포레스트"}
              </span>
            </button>
            {"\n"}
            <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"cobalt"} aria-label={"코발트 색상 테마"} title={"코발트"}>
              <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
              <span className={"color-theme-choice-label"}>
                {"코발트"}
              </span>
            </button>
            {"\n"}
            <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"bloom"} aria-label={"블룸 색상 테마"} title={"블룸"}>
              <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
              <span className={"color-theme-choice-label"}>
                {"블룸"}
              </span>
            </button>
            {"\n"}
          </div>
          {"\n"}
        </aside>
        {"\n"}
      </div>
      {"\n"}
      <div className={"toast"} id={"toast"} role={"status"} aria-live={"polite"}></div>
      {"\n"}
      {"\n"}
      {"\n"}
    </>
  );
}

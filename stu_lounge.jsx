import React from 'react';
import { useLegacyScripts } from '../components/useLegacyScripts.js';
import css from '../original/stu-dash/page.css?raw';
import script1 from '../original/stu-dash/script1.js?raw';
import script2 from '../original/stu-dash/script2.js?raw';
import script3 from '../original/stu-dash/script3.js?raw';

const scripts = [script1, script2, script3];

export default function StudentDashPage() {
  useLegacyScripts('stu-dash', scripts);

  return (
    <>
      <style data-react-page-style="stu-dash">{css}</style>
      {"\n"}
      <svg aria-hidden={"true"} width={"0"} height={"0"} style={{"position": "absolute"}}>
        {"\n"}
        <symbol id={"i-layout"} viewBox={"0 0 24 24"}>
          {"\n"}
          <rect x={"3"} y={"3"} width={"7"} height={"7"} rx={"1"} />
          {"\n"}
          <rect x={"14"} y={"3"} width={"7"} height={"7"} rx={"1"} />
          {"\n"}
          <rect x={"3"} y={"14"} width={"7"} height={"7"} rx={"1"} />
          {"\n"}
          <rect x={"14"} y={"14"} width={"7"} height={"7"} rx={"1"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-scan"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"} />
          {"\n"}
          <circle cx={"12"} cy={"12"} r={"3"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-message"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-route"} viewBox={"0 0 24 24"}>
          {"\n"}
          <circle cx={"6"} cy={"19"} r={"2"} />
          {"\n"}
          <circle cx={"18"} cy={"5"} r={"2"} />
          {"\n"}
          <path d={"M8 19h4a4 4 0 0 0 4-4v-1a4 4 0 0 0-4-4h0A4 4 0 0 1 8 6V5h8"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-calendar"} viewBox={"0 0 24 24"}>
          {"\n"}
          <rect x={"3"} y={"5"} width={"18"} height={"16"} rx={"2"} />
          {"\n"}
          <path d={"M16 3v4M8 3v4M3 10h18"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-briefcase"} viewBox={"0 0 24 24"}>
          {"\n"}
          <rect x={"3"} y={"7"} width={"18"} height={"13"} rx={"2"} />
          {"\n"}
          <path d={"M8 7V4h8v3M3 12h18"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-spark"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-user"} viewBox={"0 0 24 24"}>
          {"\n"}
          <circle cx={"12"} cy={"8"} r={"4"} />
          {"\n"}
          <path d={"M4 21a8 8 0 0 1 16 0"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-bell"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-search"} viewBox={"0 0 24 24"}>
          {"\n"}
          <circle cx={"11"} cy={"11"} r={"7"} />
          {"\n"}
          <path d={"m16 16 5 5"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-menu"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M4 7h16M4 12h16M4 17h16"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-x"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M6 6l12 12M18 6 6 18"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-chevron-down"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"m6 9 6 6 6-6"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-moon"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M20 15.4A9 9 0 0 1 8.6 4 9 9 0 1 0 20 15.4"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-check"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"m5 12 4 4L19 6"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-arrow"} viewBox={"0 0 24 24"}>
          {"\n"}
          <path d={"M5 12h14M13 6l6 6-6 6"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-target"} viewBox={"0 0 24 24"}>
          {"\n"}
          <circle cx={"12"} cy={"12"} r={"9"} />
          {"\n"}
          <circle cx={"12"} cy={"12"} r={"5"} />
          {"\n"}
          <circle cx={"12"} cy={"12"} r={"1"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-lock"} viewBox={"0 0 24 24"}>
          {"\n"}
          <rect x={"5"} y={"10"} width={"14"} height={"10"} rx={"2"} />
          {"\n"}
          <path d={"M8 10V7a4 4 0 0 1 8 0v3M12 14v2"} />
          {"\n"}
        </symbol>
        {"\n"}
        <symbol id={"i-award"} viewBox={"0 0 24 24"}>
          {"\n"}
          <circle cx={"12"} cy={"8"} r={"5"} />
          {"\n"}
          <path d={"m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9M10 8l1.3 1.3L14 6.5"} />
          {"\n"}
        </symbol>
        {"\n"}
      </svg>
      {"\n"}
      <header className={"topbar"}>
        {"\n"}
        <div className={"topbar-inner"}>
          {"\n"}
          <a className={"brand"} href={"#"}>
            <img src={"logo.png"} alt={"국립창원대학교 DREAMCATCH"} />
          </a>
          {"\n"}
          <nav className={"top-nav"} id={"topNavigation"} aria-label={"주 메뉴"}>
            <a className={"nav-item active"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-layout"} />
              </svg>
              {"AI 커리어 라운지"}
            </a>
            <a className={"nav-item"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-scan"} />
              </svg>
              {"나의 진단"}
            </a>
            <a className={"nav-item"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-message"} />
              </svg>
              {"상담"}
            </a>
            <a className={"nav-item"} href={"#goal"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-route"} />
              </svg>
              {"나의 로드맵"}
            </a>
            <a className={"nav-item"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-calendar"} />
              </svg>
              {"프로그램"}
            </a>
            <a className={"nav-item"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-briefcase"} />
              </svg>
              {"기업·일경험"}
            </a>
            <a className={"nav-item"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-spark"} />
              </svg>
              {"취업지원"}
            </a>
            <a className={"nav-item"} href={"#"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-user"} />
              </svg>
              {"내 성장"}
            </a>
          </nav>
          {"\n"}
          <div className={"topbar-right"}>
            {"\n"}
            <button className={"icon-button"} id={"searchToggle"} type={"button"} aria-label={"통합검색 열기"} aria-expanded={"false"} aria-controls={"globalSearch"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-search"} />
              </svg>
            </button>
            {"\n"}
            <button className={"icon-button notification-button"} type={"button"} aria-label={"알림"} data-toast={"새로운 알림 2건이 있습니다."}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-bell"} />
              </svg>
              {"\n"}
            </button>
            {"\n"}
            <div className={"header-profile"} id={"profileMenuRoot"}>
              {"\n"}
              <div className={"profile-popover"} id={"profilePopover"} role={"menu"} aria-label={"사용자 메뉴"} aria-hidden={"true"}>
                {"\n"}
                <div className={"profile-popover-head"}>
                  <span className={"profile-avatar-icon"}>
                    <svg className={"icon"}>
                      {"\n"}
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
                <a className={"profile-action"} href={"#goal"} role={"menuitem"}>
                  <svg className={"icon"}>
                    {"\n"}
                    <use href={"#i-user"} />
                  </svg>
                  {"내 성장"}
                </a>
                <button className={"profile-action logout"} type={"button"} role={"menuitem"} data-toast={"로그아웃을 요청했습니다."}>
                  <svg className={"icon"}>
                    {"\n"}
                    <use href={"#i-arrow"} />
                  </svg>
                  {"로그아웃"}
                </button>
                {"\n"}
              </div>
              <button className={"profile-trigger"} id={"profileMenuButton"} type={"button"} aria-haspopup={"menu"} aria-expanded={"false"} aria-controls={"profilePopover"} aria-label={"김민서 사용자 메뉴"}>
                <span className={"profile-avatar-icon"}>
                  <svg className={"icon"}>
                    {"\n"}
                    <use href={"#i-user"} />
                  </svg>
                </span>
              </button>
              {"\n"}
            </div>
            {"\n"}
            <button className={"icon-button mobile-menu-toggle"} id={"mobileNavToggle"} type={"button"} aria-label={"주 메뉴 열기"} aria-expanded={"false"} aria-controls={"topNavigation"}>
              <svg className={"icon menu-open-icon"}>
                {"\n"}
                <use href={"#i-menu"} />
              </svg>
              <svg className={"icon menu-close-icon"}>
                {"\n"}
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
            <span className={"search-symbol"}>
              <svg className={"icon"}>
                {"\n"}
                <use href={"#i-search"} />
              </svg>
            </span>
            {"\n"}
            <div className={"search-panel-title"}>
              <small>
                {"GLOBAL SEARCH"}
              </small>
              {"\n"}
              <h2 id={"searchTitle"}>
                {"메뉴와 프로그램 검색"}
              </h2>
              {"\n"}
            </div>
            <button className={"search-close"} id={"searchClose"} type={"button"} aria-label={"검색 닫기"}>
              {"×"}
            </button>
            {"\n"}
          </div>
          {"\n"}
          <label className={"global-search-field"}>
            <svg className={"icon"}>
              {"\n"}
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
      <div className={"app"}>
        {"\n"}
        <main className={"main"}>
          {"\n"}
          <section className={"welcome reveal"}>
            {"\n"}
            <div>
              <small>
                {"경영학과 3학년 · 2학기"}
              </small>
              {"\n"}
              <h1>
                {"안녕하세요, "}
                <span>
                  {"김민서"}
                </span>
                {"님."}
                <br />
                {"오늘의 커리어 여정을 시작해 볼까요?"}
              </h1>
              {"\n"}
            </div>
            {"\n"}
            <div className={"student-type"}>
              <span className={"type-copy"}>
                <small>
                  {"나의 진로 유형"}
                </small>
                <b>
                  {"진로설정형"}
                </b>
                <span>
                  {"목표 직무를 구체화하고 실행 계획을\n              설계하는 단계"}
                </span>
              </span>
            </div>
            {"\n"}
          </section>
          {"\n"}
          <section className={"stats"} aria-label={"커리어 요약 지표"}>
            {"\n"}
            <article data-slot={"card"} className={"stat-card reveal"} style={{"--stat-color": "var(--stat-1)", "--stat-soft": "var(--stat-1-soft)", "--stat-alt": "var(--stat-1)"}}>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"stat-head"}>
                  <span className={"stat-label"}>
                    {"진단 완료"}
                  </span>
                  <span className={"stat-icon mint"}>
                    <svg className={"icon"}>
                      {"\n"}
                      <use href={"#i-check"} />
                    </svg>
                  </span>
                </div>
                {"\n"}
                <div className={"stat-value"}>
                  {"3"}
                  <small>
                    {"/3"}
                  </small>
                </div>
                {"\n"}
                <div className={"stat-foot"}>
                  <span>
                    {"모든 진단 완료"}
                  </span>
                  <span className={"badge stat-badge"}>
                    {"완료"}
                  </span>
                </div>
                {"\n"}
                <div className={"stat-meter"} style={{"--value": "100%", "--accent": "var(--stat-1)"}} aria-label={"진단 완료율 100%"}>
                  <span className={"stat-meter-track"}>
                    <i></i>
                  </span>
                  <b>
                    {"100%"}
                  </b>
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article data-slot={"card"} className={"stat-card counsel-summary-card reveal"} style={{"--stat-color": "var(--stat-2)", "--stat-soft": "var(--stat-2-soft)", "--stat-alt": "var(--stat-2)"}}>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"stat-head"}>
                  <span className={"stat-label"}>
                    {"상담 현황"}
                  </span>
                  <span className={"stat-icon sky"}>
                    <svg className={"icon"}>
                      {"\n"}
                      <use href={"#i-message"} />
                    </svg>
                  </span>
                </div>
                {"\n"}
                <div className={"counsel-summary"}>
                  {"\n"}
                  <div className={"counsel-summary-total"}>
                    <strong>
                      {"5"}
                      <small>
                        {"건"}
                      </small>
                    </strong>
                    <span>
                      {"이번 학기 누적"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"counsel-type-list"} aria-label={"상담 유형별 현황"}>
                    {"\n"}
                    <span style={{"--type-color": "var(--counsel-1)"}}>
                      <i></i>
                      {"진로취업"}
                      <em>
                        {"3건"}
                      </em>
                    </span>
                    {"\n"}
                    <span style={{"--type-color": "var(--counsel-2)"}}>
                      <i></i>
                      {"심리검사"}
                      <em>
                        {"1건"}
                      </em>
                    </span>
                    {"\n"}
                    <span style={{"--type-color": "var(--counsel-3)"}}>
                      <i></i>
                      {"지도교수"}
                      <em>
                        {"1건"}
                      </em>
                    </span>
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article data-slot={"card"} className={"stat-card reveal"} style={{"--stat-color": "var(--stat-3)", "--stat-soft": "var(--stat-3-soft)", "--stat-alt": "var(--stat-3)"}}>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"stat-head"}>
                  <span className={"stat-label"}>
                    {"IAP 이행률"}
                  </span>
                  <span className={"stat-icon blue"}>
                    <svg className={"icon"}>
                      {"\n"}
                      <use href={"#i-route"} />
                    </svg>
                  </span>
                </div>
                {"\n"}
                <div className={"stat-value"}>
                  {"62"}
                  <small>
                    {"%"}
                  </small>
                </div>
                {"\n"}
                <div className={"stat-foot"}>
                  <span>
                    {"지난달 대비"}
                  </span>
                  <span className={"badge stat-badge"}>
                    {"+14%p"}
                  </span>
                </div>
                {"\n"}
                <div className={"stat-meter"} style={{"--value": "62%", "--accent": "var(--stat-3)"}} aria-label={"IAP 이행률 62%"}>
                  <span className={"stat-meter-track"}>
                    <i></i>
                  </span>
                  <b>
                    {"62%"}
                  </b>
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article data-slot={"card"} className={"stat-card reveal"} style={{"--stat-color": "var(--stat-4)", "--stat-soft": "var(--stat-4-soft)", "--stat-alt": "var(--stat-4)"}}>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"stat-head"}>
                  <span className={"stat-label"}>
                    {"비교과 이수"}
                  </span>
                  <span className={"stat-icon pink"}>
                    <svg className={"icon"}>
                      {"\n"}
                      <use href={"#i-calendar"} />
                    </svg>
                  </span>
                </div>
                {"\n"}
                <div className={"stat-value"}>
                  {"4"}
                  <small>
                    {"/6"}
                  </small>
                </div>
                {"\n"}
                <div className={"stat-foot"}>
                  <span>
                    {"이번 학기"}
                  </span>
                  <span className={"badge stat-badge"}>
                    {"2개 남음"}
                  </span>
                </div>
                {"\n"}
                <div className={"stat-meter"} style={{"--value": "67%", "--accent": "var(--stat-4)"}} aria-label={"비교과 이수율 67%"}>
                  <span className={"stat-meter-track"}>
                    <i></i>
                  </span>
                  <b>
                    {"67%"}
                  </b>
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article data-slot={"card"} className={"stat-card level-card reveal"} style={{"--stat-color": "var(--stat-5)", "--stat-soft": "var(--stat-5-soft)", "--stat-alt": "var(--stat-5-alt)"}}>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"stat-head"}>
                  <span className={"stat-label"}>
                    {"성장 레벨"}
                  </span>
                  <span className={"stat-icon violet"}>
                    <svg className={"icon"}>
                      {"\n"}
                      <use href={"#i-award"} />
                    </svg>
                  </span>
                </div>
                {"\n"}
                <div className={"level-summary"}>
                  <span className={"level-medallion"}>
                    <small>
                      {"LV"}
                    </small>
                    <b>
                      {"23"}
                    </b>
                  </span>
                  <span className={"level-summary-copy"}>
                    <small>
                      {"현재 성장 단계"}
                    </small>
                    <b>
                      {"Career Builder"}
                    </b>
                  </span>
                </div>
                {"\n"}
                <div className={"level-xp"}>
                  {"\n"}
                  <div className={"level-xp-copy"}>
                    <b>
                      {"1,250 XP"}
                    </b>
                    <span>
                      {"다음 레벨까지 750 XP"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"level-xp-track"} role={"progressbar"} aria-label={"성장 경험치"} aria-valuemin={"0"} aria-valuemax={"2000"} aria-valuenow={"1250"}>
                    <i></i>
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
          </section>
          {"\n"}
          <div className={"dashboard-grid"}>
            {"\n"}
            <section data-slot={"card"} className={"journey-card reveal"}>
              {"\n"}
              <div data-slot={"card-header"}>
                {"\n"}
                <div>
                  {"\n"}
                  <h2 data-slot={"card-title"}>
                    {"나의 진로 여정"}
                  </h2>
                  {"\n"}
                  <p data-slot={"card-description"}>
                    {"내 CARE+7의 현재 위치입니다."}
                  </p>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"journey-state"}>
                  {"\n"}
                  <div className={"journey-value"}>
                    <span className={"journey-kicker"}>
                      {"CARE+7 ROADMAP"}
                    </span>
                    <b>
                      {"역량강화 단계"}
                    </b>
                    {"\n"}
                    <p>
                      {"로드맵 설계를 완료하고 목표 직무에 필요한 핵심역량을 강화하고 있어요."}
                    </p>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"journey-percent"}>
                    <span>
                      {"전체 진행률"}
                    </span>
                    <b>
                      {"42%"}
                    </b>
                  </div>
                  {"\n"}
                </div>
                {"\n"}
                <div className={"progress journey-track"} aria-label={"CARE+7 진행률 42%"}>
                  <i style={{"width": "42%", "background": "linear-gradient(90deg,var(--journey-done),var(--journey-current))"}}></i>
                </div>
                {"\n"}
                <div className={"steps"} role={"list"} aria-label={"CARE+7 로드맵 단계"} tabIndex={"0"}>
                  {"\n"}
                  <div className={"step done"} role={"listitem"}>
                    <span className={"step-marker"}>
                      {"✓"}
                    </span>
                    <b>
                      {"진단"}
                    </b>
                    <span>
                      {"완료"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"step done"} role={"listitem"}>
                    <span className={"step-marker"}>
                      {"✓"}
                    </span>
                    <b>
                      {"상담"}
                    </b>
                    <span>
                      {"완료"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"step done"} role={"listitem"}>
                    <span className={"step-marker"}>
                      {"✓"}
                    </span>
                    <b>
                      {"로드맵"}
                    </b>
                    <span>
                      {"완료"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"step current"} role={"listitem"} aria-current={"step"}>
                    <span className={"step-marker"}>
                      {"C4"}
                    </span>
                    <b>
                      {"역량강화"}
                    </b>
                    <span>
                      {"진행 중"}
                    </span>
                  </div>
                  {"\n"}
                  <div className={"step"} role={"listitem"}>
                    <span className={"step-marker"}>
                      {"C5"}
                    </span>
                    <b>
                      {"기업연계"}
                    </b>
                  </div>
                  {"\n"}
                  <div className={"step"} role={"listitem"}>
                    <span className={"step-marker"}>
                      {"C6"}
                    </span>
                    <b>
                      {"취업지원"}
                    </b>
                  </div>
                  {"\n"}
                  <div className={"step"} role={"listitem"}>
                    <span className={"step-marker"}>
                      {"C7"}
                    </span>
                    <b>
                      {"사후관리"}
                    </b>
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"competency-card reveal"}>
              {"\n"}
              <div data-slot={"card-header"}>
                {"\n"}
                <div>
                  {"\n"}
                  <h2 data-slot={"card-title"}>
                    {"6대 핵심역량"}
                  </h2>
                  {"\n"}
                  <p data-slot={"card-description"}>
                    {"현재 수준, 목표 직무 요구 수준, 학과 평균을 비교합니다."}
                  </p>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"chart-layout"}>
                  {"\n"}
                  <div>
                    <svg className={"radar"} viewBox={"0 0 300 280"} role={"img"} aria-label={"6대 핵심역량 레이더 차트"}>
                      {"\n"}
                      <polygon className={"grid"} points={"150,22 256,84 256,196 150,258 44,196 44,84"} />
                      {"\n"}
                      <polygon className={"grid"} points={"150,52 230,98 230,182 150,228 70,182 70,98"} />
                      {"\n"}
                      <polygon className={"grid"} points={"150,82 204,112 204,168 150,198 96,168 96,112"} />
                      {"\n"}
                      <line className={"axis"} x1={"150"} y1={"140"} x2={"150"} y2={"22"} />
                      {"\n"}
                      <line className={"axis"} x1={"150"} y1={"140"} x2={"256"} y2={"84"} />
                      {"\n"}
                      <line className={"axis"} x1={"150"} y1={"140"} x2={"256"} y2={"196"} />
                      {"\n"}
                      <line className={"axis"} x1={"150"} y1={"140"} x2={"150"} y2={"258"} />
                      {"\n"}
                      <line className={"axis"} x1={"150"} y1={"140"} x2={"44"} y2={"196"} />
                      {"\n"}
                      <line className={"axis"} x1={"150"} y1={"140"} x2={"44"} y2={"84"} />
                      {"\n"}
                      <polygon className={"avg"} points={"150,60 220,102 224,179 150,212 78,178 90,106"} />
                      {"\n"}
                      <polygon className={"need"} points={"150,46 238,92 230,182 150,216 82,176 86,104"} />
                      {"\n"}
                      <polygon className={"mine"} points={"150,58 212,104 236,187 150,208 88,174 92,108"} />
                      <text x={"150"} y={"10"} textAnchor={"middle"}>
                        {"의사소통"}
                      </text>
                      <text x={"266"} y={"80"}>
                        {"문제해결"}
                      </text>
                      <text x={"266"} y={"204"}>
                        {"협업"}
                      </text>
                      <text x={"150"} y={"276"} textAnchor={"middle"}>
                        {"창의성"}
                      </text>
                      <text x={"10"} y={"204"}>
                        {"직무전문성"}
                      </text>
                      <text x={"10"} y={"80"}>
                        {"글로벌"}
                      </text>
                    </svg>
                    {"\n"}
                    <div className={"legend"}>
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
                        {"학과\n                    평균"}
                      </span>
                    </div>
                    {"\n"}
                  </div>
                  {"\n"}
                  <div className={"axis-list"}>
                    {"\n"}
                    <div className={"axis-row"}>
                      {"의사소통"}
                      <span className={"axis-track"}>
                        <i style={{"width": "72%"}}></i>
                        <u style={{"left": "80%"}}></u>
                      </span>
                      <span className={"gap-value"}>
                        {"-8"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"axis-row"}>
                      {"문제해결"}
                      <span className={"axis-track"}>
                        <i style={{"width": "64%"}}></i>
                        <u style={{"left": "85%"}}></u>
                      </span>
                      <span className={"gap-value"}>
                        {"-21"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"axis-row"}>
                      {"협업"}
                      <span className={"axis-track"}>
                        <i style={{"width": "81%"}}></i>
                        <u style={{"left": "75%"}}></u>
                      </span>
                      <span className={"gap-value"} style={{"color": "var(--mint)"}}>
                        {"+6"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"axis-row"}>
                      {"창의성"}
                      <span className={"axis-track"}>
                        <i style={{"width": "58%"}}></i>
                        <u style={{"left": "65%"}}></u>
                      </span>
                      <span className={"gap-value"}>
                        {"-7"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"axis-row"}>
                      {"직무전문성"}
                      <span className={"axis-track"}>
                        <i style={{"width": "47%"}}></i>
                        <u style={{"left": "88%"}}></u>
                      </span>
                      <span className={"gap-value"}>
                        {"-41"}
                      </span>
                    </div>
                    {"\n"}
                    <div className={"axis-row"}>
                      {"글로벌"}
                      <span className={"axis-track"}>
                        <i style={{"width": "55%"}}></i>
                        <u style={{"left": "60%"}}></u>
                      </span>
                      <span className={"gap-value"}>
                        {"-5"}
                      </span>
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
            <section data-slot={"card"} className={"diagnosis-card reveal"}>
              {"\n"}
              <div data-slot={"card-header"}>
                {"\n"}
                <div>
                  {"\n"}
                  <h2 data-slot={"card-title"}>
                    {"진단 결과"}
                  </h2>
                  {"\n"}
                  <p data-slot={"card-description"}>
                    {"CARE+ 단계별 진단에서 발견된 나의 대표 유형입니다."}
                  </p>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"diagnosis-result-grid"}>
                  {"\n"}
                  <button className={"diagnosis-result-item"} type={"button"} data-toast={"C-CORE 핵심진단 검사 상세 결과를 확인합니다."} style={{"--result-color": "var(--diagnosis-1)", "--result-soft": "var(--diagnosis-1-soft)"}}>
                    {"\n"}
                    <span className={"diagnosis-result-top"}>
                      <span className={"diagnosis-result-name"}>
                        <small>
                          {"C-CORE"}
                        </small>
                        <b>
                          {"핵심진단\n                      검사"}
                        </b>
                      </span>
                      <span className={"diagnosis-result-date"}>
                        {"완료"}
                      </span>
                    </span>
                    {"\n"}
                    <strong className={"diagnosis-primary-result"}>
                      {"역량성장형"}
                    </strong>
                    {"\n"}
                    <span className={"diagnosis-result-tags"}>
                      <span>
                        {"의욕 만렙형"}
                      </span>
                      <span>
                        {"미래 준비 유형"}
                      </span>
                      <span>
                        {"개인 브랜딩"}
                      </span>
                    </span>
                    {"\n"}
                  </button>
                  {"\n"}
                  <button className={"diagnosis-result-item"} type={"button"} data-toast={"C-2 진로설정 진단 상세 결과를 확인합니다."} style={{"--result-color": "var(--diagnosis-2)", "--result-soft": "var(--diagnosis-2-soft)"}}>
                    {"\n"}
                    <span className={"diagnosis-result-top"}>
                      <span className={"diagnosis-result-name"}>
                        <small>
                          {"C-2"}
                        </small>
                        <b>
                          {"진로설정\n                      진단"}
                        </b>
                      </span>
                      <span className={"diagnosis-result-date"}>
                        {"완료"}
                      </span>
                    </span>
                    {"\n"}
                    <strong className={"diagnosis-primary-result"}>
                      {"추상적 개념화형"}
                    </strong>
                    {"\n"}
                    <span className={"diagnosis-result-tags"}>
                      <span>
                        {"진로 수행회피목표"}
                      </span>
                      <span>
                        {"창의적 의사결정"}
                      </span>
                    </span>
                    {"\n"}
                  </button>
                  {"\n"}
                  <article className={"diagnosis-result-item locked"} aria-label={"C-3 역량수준 진단 이용 제한"} style={{"--result-color": "var(--diagnosis-3)", "--result-soft": "var(--diagnosis-3-soft)"}}>
                    {"\n"}
                    <span className={"diagnosis-result-top"}>
                      <span className={"diagnosis-result-name"}>
                        <small>
                          {"C-3"}
                        </small>
                        <b>
                          {"역량수준\n                      진단"}
                        </b>
                      </span>
                      <span className={"diagnosis-result-date"}>
                        {"이용 제한"}
                      </span>
                    </span>
                    {"\n"}
                    <strong className={"diagnosis-primary-result"}>
                      {"미래 유보형"}
                    </strong>
                    {"\n"}
                    <span className={"diagnosis-result-tags"}>
                      <span>
                        {"온라인 네트워킹"}
                      </span>
                      <span>
                        {"교내 네트워킹"}
                      </span>
                      <span>
                        {"행동파 돌격형"}
                      </span>
                    </span>
                    {"\n"}
                    <span className={"diagnosis-lock-layer"}>
                      <span className={"diagnosis-lock-message"}>
                        <span className={"diagnosis-lock-icon"}>
                          <svg className={"icon"}>
                            <use href={"#i-lock"} />
                          </svg>
                        </span>
                        <span className={"diagnosis-lock-copy"}>
                          <b>
                            {"진로설정형에서는 이용할 수 없어요"}
                          </b>
                          <small>
                            {"다음 진로 유형으로 전환되면 진단이 열립니다."}
                          </small>
                        </span>
                      </span>
                      <button className={"button diagnosis-lock-button"} type={"button"} data-toast={"진로 유형별 진단 이용 조건을 확인합니다."}>
                        {"이용 조건 확인"}
                      </button>
                    </span>
                    {"\n"}
                  </article>
                  {"\n"}
                  <article className={"diagnosis-result-item locked"} aria-label={"C-4 구직역량 진단 이용 제한"} style={{"--result-color": "var(--diagnosis-4)", "--result-soft": "var(--diagnosis-4-soft)"}}>
                    {"\n"}
                    <span className={"diagnosis-result-top"}>
                      <span className={"diagnosis-result-name"}>
                        <small>
                          {"C-4"}
                        </small>
                        <b>
                          {"구직역량\n                      진단"}
                        </b>
                      </span>
                      <span className={"diagnosis-result-date"}>
                        {"이용 제한"}
                      </span>
                    </span>
                    {"\n"}
                    <strong className={"diagnosis-primary-result"}>
                      {"구직역량 유형 분석"}
                    </strong>
                    {"\n"}
                    <span className={"diagnosis-result-tags"}>
                      <span>
                        {"구직 준비도"}
                      </span>
                      <span>
                        {"취업 실행역량"}
                      </span>
                    </span>
                    {"\n"}
                    <span className={"diagnosis-lock-layer"}>
                      <span className={"diagnosis-lock-message"}>
                        <span className={"diagnosis-lock-icon"}>
                          <svg className={"icon"}>
                            <use href={"#i-lock"} />
                          </svg>
                        </span>
                        <span className={"diagnosis-lock-copy"}>
                          <b>
                            {"진로설정형에서는 이용할 수 없어요"}
                          </b>
                          <small>
                            {"구직 실행 단계에 진입하면 진단이 열립니다."}
                          </small>
                        </span>
                      </span>
                      <button className={"button diagnosis-lock-button"} type={"button"} data-toast={"진로 유형별 진단 이용 조건을 확인합니다."}>
                        {"유형별 진단 안내"}
                      </button>
                    </span>
                    {"\n"}
                  </article>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"goal-card reveal"} id={"goal"}>
              {"\n"}
              <div data-slot={"card-header"}>
                {"\n"}
                <div>
                  {"\n"}
                  <h2 data-slot={"card-title"}>
                    {"목표 달성 계획"}
                  </h2>
                  {"\n"}
                  <p data-slot={"card-description"}>
                    {"데이터 분석가 목표를 위한 8개 영역과 실행 과제를 관리합니다."}
                  </p>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"goal-overview"}>
                  {"\n"}
                  <article className={"goal-core"}>
                    <small>
                      {"목표 직무"}
                    </small>
                    {"\n"}
                    <h3>
                      {"데이터 분석가"}
                    </h3>
                    {"\n"}
                    <p>
                      {"진로 탐색부터 네트워크까지 8개 영역의 실행을 하나의 IAP로 관리합니다."}
                    </p>
                    {"\n"}
                    <div className={"goal-number"}>
                      {"41"}
                      <span>
                        {"% 전체 진척도"}
                      </span>
                    </div>
                    {"\n"}
                  </article>
                  {"\n"}
                  <div className={"goal-plan"}>
                    {"\n"}
                    <div className={"goal-plan-columns"}>
                      {"\n"}
                      <section className={"goal-plan-column"} style={{"--plan-color": "var(--goal-1)", "--plan-soft": "var(--goal-1-soft)"}}>
                        {"\n"}
                        <div className={"goal-plan-head"}>
                          <span className={"goal-plan-head-icon"}>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-calendar"} />
                            </svg>
                          </span>
                          {"\n"}
                          <div className={"goal-plan-head-copy"}>
                            <b>
                              {"IAP 실행"}
                            </b>
                            <span>
                              {"개인별 진로계획에 따른 실행 활동"}
                            </span>
                          </div>
                          {"\n"}
                        </div>
                        {"\n"}
                        <div className={"goal-task-list"}>
                          {"\n"}
                          <button className={"goal-task is-complete"} type={"button"} data-toast={"데이터 리터러시 기초 과정을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-layout"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"데이터 리터러시\n                            기초"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"완료"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"파이썬 데이터 분석 실습을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-spark"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"파이썬 데이터 분석\n                            실습"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"진행\n                          중"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"클라우드 기초 실습을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-scan"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"클라우드 기초\n                            실습"}
                              </b>
                            </span>
                            <span className={"goal-task-status planned"}>
                              {"예정"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"데이터 엔지니어링 특강을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-user"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"데이터 엔지니어링\n                            특강"}
                              </b>
                            </span>
                            <span className={"goal-task-status planned"}>
                              {"예정"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                        </div>
                        {"\n"}
                      </section>
                      {"\n"}
                      <section className={"goal-plan-column"} style={{"--plan-color": "var(--goal-2)", "--plan-soft": "var(--goal-2-soft)"}}>
                        {"\n"}
                        <div className={"goal-plan-head"}>
                          <span className={"goal-plan-head-icon"}>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-layout"} />
                            </svg>
                          </span>
                          {"\n"}
                          <div className={"goal-plan-head-copy"}>
                            <b>
                              {"핵심역량 수행"}
                            </b>
                            <span>
                              {"전공 기반 핵심역량 강화 활동"}
                            </span>
                          </div>
                          {"\n"}
                        </div>
                        {"\n"}
                        <div className={"goal-task-list"}>
                          {"\n"}
                          <button className={"goal-task is-complete"} type={"button"} data-toast={"데이터베이스 개론 교과목을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-layout"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"데이터베이스 개론"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"완료"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"자료구조 교과목을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-route"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"자료구조"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"진행 중"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"운영체제 교과목을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-scan"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"운영체제"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"진행 중"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"선형대수 교과목을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-target"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"선형대수"}
                              </b>
                            </span>
                            <span className={"goal-task-status planned"}>
                              {"예정"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                        </div>
                        {"\n"}
                      </section>
                      {"\n"}
                      <section className={"goal-plan-column"} style={{"--plan-color": "var(--goal-3)", "--plan-soft": "var(--goal-3-soft)"}}>
                        {"\n"}
                        <div className={"goal-plan-head"}>
                          <span className={"goal-plan-head-icon"}>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-target"} />
                            </svg>
                          </span>
                          {"\n"}
                          <div className={"goal-plan-head-copy"}>
                            <b>
                              {"내 성장 활동"}
                            </b>
                            <span>
                              {"자격증·공모전·어학·프로젝트 활동"}
                            </span>
                          </div>
                          {"\n"}
                        </div>
                        {"\n"}
                        <div className={"goal-task-list"}>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"IT 공모전 활동을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-spark"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"IT 공모전 참여"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"진행 중"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"SQLD 자격증 계획을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-check"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"SQLD 자격증"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"진행 중"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"TOEIC 목표 계획을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-scan"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"TOEIC 800+\n                            달성"}
                              </b>
                            </span>
                            <span className={"goal-task-status"}>
                              {"진행 중"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                          <button className={"goal-task"} type={"button"} data-toast={"개인 프로젝트 계획을 확인합니다."}>
                            <span className={"goal-task-icon"}>
                              <svg className={"icon"}>
                                {"\n"}
                                <use href={"#i-briefcase"} />
                              </svg>
                            </span>
                            <span className={"goal-task-copy"}>
                              <b>
                                {"개인\n                            프로젝트"}
                              </b>
                            </span>
                            <span className={"goal-task-status planned"}>
                              {"예정"}
                            </span>
                            <svg className={"icon"}>
                              {"\n"}
                              <use href={"#i-arrow"} />
                            </svg>
                          </button>
                          {"\n"}
                        </div>
                        {"\n"}
                      </section>
                      {"\n"}
                    </div>
                    {"\n"}
                    <aside className={"goal-coach"}>
                      <span className={"goal-coach-icon"}>
                        <svg className={"icon"}>
                          {"\n"}
                          <use href={"#i-spark"} />
                        </svg>
                      </span>
                      {"\n"}
                      <div className={"goal-coach-copy"}>
                        <b>
                          {"AI 코치의 한마디"}
                        </b>
                        {"\n"}
                        <p>
                          {"IAP 실행·핵심역량 수행·내 성장 활동을 균형 있게 진행하고 있어요. 다음 단계 진입을 위해 진행 중인 과제 2개를 먼저 완료해 보세요."}
                        </p>
                        {"\n"}
                      </div>
                      {"\n"}
                      <div className={"goal-coach-actions"}>
                        <button className={"button"} type={"button"} data-toast={"지도교수 상담을 신청합니다."}>
                          {"지도교수\n                      상담"}
                        </button>
                        <button className={"button"} type={"button"} data-toast={"진로 로드맵을 다시 확인합니다."}>
                          {"로드맵 다시 보기"}
                        </button>
                        {"\n"}
                      </div>
                      {"\n"}
                    </aside>
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"todo-card reveal"} id={"todo"}>
              {"\n"}
              <div data-slot={"card-header"}>
                {"\n"}
                <div>
                  {"\n"}
                  <h2 data-slot={"card-title"}>
                    {"이번 주 할 일"}
                  </h2>
                  {"\n"}
                  <p data-slot={"card-description"}>
                    {"마감이 가까운 순서입니다."}
                  </p>
                  {"\n"}
                </div>
                {"\n"}
                <div data-slot={"card-action"}>
                  <span className={"badge coral"} id={"todoBadge"}>
                    {"4개 남음"}
                  </span>
                </div>
                {"\n"}
              </div>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"row-list"}>
                  <label className={"list-item"}>
                    <input className={"checkbox"} type={"checkbox"} />
                    <span className={"item-copy"}>
                      <b>
                        {"역량 갭 1개 추가 등록"}
                      </b>
                      <span>
                        {"IAP 승인 조건 · 현재 2/3개"}
                      </span>
                    </span>
                    <span className={"badge coral"}>
                      {"D-3"}
                    </span>
                  </label>
                  <label className={"list-item"}>
                    <input className={"checkbox"} type={"checkbox"} />
                    <span className={"item-copy"}>
                      <b>
                        {"상담 예약 — 직무기초역량 진단·설계"}
                      </b>
                      <span>
                        {"담당 이수진 상담사 ·\n                    50분"}
                      </span>
                    </span>
                    <span className={"badge amber"}>
                      {"D-6"}
                    </span>
                  </label>
                  <label className={"list-item"}>
                    <input className={"checkbox"} type={"checkbox"} />
                    <span className={"item-copy"}>
                      <b>
                        {"SQL 실무 과정 수강 신청"}
                      </b>
                      <span>
                        {"9월 2일 개강 · 정원\n                    30명"}
                      </span>
                    </span>
                    <span className={"badge"}>
                      {"D-12"}
                    </span>
                  </label>
                  <label className={"list-item"}>
                    <input className={"checkbox"} type={"checkbox"} />
                    <span className={"item-copy"}>
                      <b>
                        {"현장실습 사전 교육 이수"}
                      </b>
                      <span>
                        {"실습 신청 전\n                    필수"}
                      </span>
                    </span>
                    <span className={"badge"}>
                      {"D-20"}
                    </span>
                  </label>
                </div>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"recommend-card ai-recommend-card reveal"} id={"recommend"}>
              {"\n"}
              <div data-slot={"card-content"}>
                <span className={"ai-recommend-icon"}>
                  <svg className={"icon"}>
                    {"\n"}
                    <use href={"#i-spark"} />
                  </svg>
                </span>
                {"\n"}
                <h3>
                  {"나를 위한 AI추천"}
                </h3>
                {"\n"}
                <p>
                  {"목표 직무와 현재 역량을 분석해 지금 우선하면 좋은 활동을 골랐습니다."}
                </p>
                {"\n"}
                <div className={"ai-recommend-list"}>
                  {"\n"}
                  <div className={"ai-recommend-item"} style={{"--recommend-color": "var(--recommend-1)", "--recommend-soft": "var(--recommend-1-soft)"}}>
                    <span>
                      {"01"}
                    </span>
                    <span className={"ai-recommend-copy"}>
                      <b>
                        {"데이터 분석 실무 부트캠프"}
                      </b>
                      <small>
                        {"직무전문성 갭을 우선 보완해요."}
                      </small>
                    </span>
                    <strong>
                      {"추천\n                  96%"}
                    </strong>
                  </div>
                  {"\n"}
                  <div className={"ai-recommend-item"} style={{"--recommend-color": "var(--recommend-2)", "--recommend-soft": "var(--recommend-2-soft)"}}>
                    {"\n"}
                    <span>
                      {"02"}
                    </span>
                    <span className={"ai-recommend-copy"}>
                      <b>
                        {"현직 데이터 분석가 멘토링"}
                      </b>
                      <small>
                        {"진로 수행회피목표를 행동으로\n                    전환해요."}
                      </small>
                    </span>
                    <strong>
                      {"추천 91%"}
                    </strong>
                  </div>
                  {"\n"}
                </div>
                {"\n"}
                <button className={"button primary"} type={"button"} data-toast={"AI 맞춤 추천 전체 목록을 확인합니다."}>
                  {"추천 전체 보기"}
                  <svg className={"icon"}>
                    {"\n"}
                    <use href={"#i-arrow"} />
                  </svg>
                </button>
                {"\n"}
              </div>
              {"\n"}
            </section>
            {"\n"}
            <section data-slot={"card"} className={"counseling-card reveal"} id={"counseling-status"}>
              {"\n"}
              <div data-slot={"card-header"}>
                {"\n"}
                <div>
                  {"\n"}
                  <h2 data-slot={"card-title"}>
                    {"상담 현황"}
                  </h2>
                  {"\n"}
                  <p data-slot={"card-description"}>
                    {"이번 학기 상담 유형별 진행 상황과 최근 기록을 확인합니다."}
                  </p>
                  {"\n"}
                </div>
                {"\n"}
                <div data-slot={"card-action"}>
                  <button className={"button"} type={"button"} data-toast={"상담 전체 내역을 확인합니다."}>
                    {"전체 내역 보기"}
                    <svg className={"icon"}>
                      {"\n"}
                      <use href={"#i-arrow"} />
                    </svg>
                  </button>
                </div>
                {"\n"}
              </div>
              {"\n"}
              <div data-slot={"card-content"}>
                {"\n"}
                <div className={"counseling-detail-grid"}>
                  {"\n"}
                  <article className={"counseling-detail-column"} style={{"--counsel-color": "var(--counsel-1)", "--counsel-soft": "var(--counsel-1-soft)"}}>
                    {"\n"}
                    <div className={"counseling-detail-head"}>
                      <span className={"counseling-detail-icon"}>
                        <svg className={"icon"}>
                          {"\n"}
                          <use href={"#i-message"} />
                        </svg>
                      </span>
                      <span className={"counseling-detail-copy"}>
                        <span className={"counseling-detail-title"}>
                          {"진로취업"}
                        </span>
                        <span>
                          {"직무·취업 준비 상담"}
                        </span>
                      </span>
                      <strong className={"counseling-detail-total"}>
                        {"3건"}
                      </strong>
                    </div>
                    {"\n"}
                    <div className={"counseling-detail-summary"}>
                      {"완료 2 · 예정 1"}
                    </div>
                    {"\n"}
                    <div className={"counseling-record-list"}>
                      {"\n"}
                      <div className={"counseling-record"}>
                        <span>
                          <span className={"counseling-record-title"}>
                            {"직무기초역량 진단·설계"}
                          </span>
                          <small>
                            {"09.04 · 이수진 상담사"}
                          </small>
                        </span>
                        <span className={"badge"}>
                          {"예정"}
                        </span>
                      </div>
                      {"\n"}
                      <div className={"counseling-record"}>
                        <span>
                          <span className={"counseling-record-title"}>
                            {"목표 직무 구체화"}
                          </span>
                          <small>
                            {"08.18 · 이수진 상담사"}
                          </small>
                        </span>
                        <span className={"badge"}>
                          {"완료"}
                        </span>
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                  </article>
                  {"\n"}
                  <article className={"counseling-detail-column"} style={{"--counsel-color": "var(--counsel-2)", "--counsel-soft": "var(--counsel-2-soft)"}}>
                    {"\n"}
                    <div className={"counseling-detail-head"}>
                      <span className={"counseling-detail-icon"}>
                        <svg className={"icon"}>
                          {"\n"}
                          <use href={"#i-scan"} />
                        </svg>
                      </span>
                      <span className={"counseling-detail-copy"}>
                        <span className={"counseling-detail-title"}>
                          {"심리검사"}
                        </span>
                        <span>
                          {"검사 해석·정서 상담"}
                        </span>
                      </span>
                      <strong className={"counseling-detail-total"}>
                        {"1건"}
                      </strong>
                    </div>
                    {"\n"}
                    <div className={"counseling-detail-summary"}>
                      {"완료 1"}
                    </div>
                    {"\n"}
                    <div className={"counseling-record-list"}>
                      {"\n"}
                      <div className={"counseling-record"}>
                        <span>
                          <span className={"counseling-record-title"}>
                            {"직업흥미검사 해석 상담"}
                          </span>
                          <small>
                            {"08.12 · 박서연 상담사"}
                          </small>
                        </span>
                        <span className={"badge"}>
                          {"완료"}
                        </span>
                      </div>
                      {"\n"}
                      <div className={"counseling-record"}>
                        <span>
                          <span className={"counseling-record-title"}>
                            {"추가 상담"}
                          </span>
                          <small>
                            {"필요 시 예약할 수 있어요"}
                          </small>
                        </span>
                        <span className={"badge"}>
                          {"예약 가능"}
                        </span>
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                  </article>
                  {"\n"}
                  <article className={"counseling-detail-column"} style={{"--counsel-color": "var(--counsel-3)", "--counsel-soft": "var(--counsel-3-soft)"}}>
                    {"\n"}
                    <div className={"counseling-detail-head"}>
                      <span className={"counseling-detail-icon"}>
                        <svg className={"icon"}>
                          {"\n"}
                          <use href={"#i-user"} />
                        </svg>
                      </span>
                      <span className={"counseling-detail-copy"}>
                        <span className={"counseling-detail-title"}>
                          {"지도교수"}
                        </span>
                        <span>
                          {"학업·진로 방향 상담"}
                        </span>
                      </span>
                      <strong className={"counseling-detail-total"}>
                        {"1건"}
                      </strong>
                    </div>
                    {"\n"}
                    <div className={"counseling-detail-summary"}>
                      {"예정 1"}
                    </div>
                    {"\n"}
                    <div className={"counseling-record-list"}>
                      {"\n"}
                      <div className={"counseling-record"}>
                        <span>
                          <span className={"counseling-record-title"}>
                            {"2학기 진로계획 점검"}
                          </span>
                          <small>
                            {"09.10 · 김창원 교수"}
                          </small>
                        </span>
                        <span className={"badge"}>
                          {"예정"}
                        </span>
                      </div>
                      {"\n"}
                      <div className={"counseling-record"}>
                        <span>
                          <span className={"counseling-record-title"}>
                            {"상담 전 준비"}
                          </span>
                          <small>
                            {"IAP 실행 내역을 확인해 주세요"}
                          </small>
                        </span>
                        <span className={"badge"}>
                          {"준비 중"}
                        </span>
                      </div>
                      {"\n"}
                    </div>
                    {"\n"}
                  </article>
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
                  {"51140 경상남도 창원시 의창구\n              창원대학로 20"}
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
      <aside className={"color-theme-remote"} aria-label={"색상 테마 선택"}>
        {"\n"}
        <div className={"color-theme-options"} role={"group"} aria-label={"톤앤매너 선택"}>
          {"\n"}
          <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"default"} aria-label={"드림 색상 테마"} title={"드림"}>
            {"\n"}
            <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
            <span className={"color-theme-choice-label"}>
              {"드림"}
            </span>
            {"\n"}
          </button>
          {"\n"}
          <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"forest"} aria-label={"포레스트 색상 테마"} title={"포레스트"}>
            {"\n"}
            <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
            <span className={"color-theme-choice-label"}>
              {"포레스트"}
            </span>
            {"\n"}
          </button>
          {"\n"}
          <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"cobalt"} aria-label={"코발트 색상 테마"} title={"코발트"}>
            {"\n"}
            <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
            <span className={"color-theme-choice-label"}>
              {"코발트"}
            </span>
            {"\n"}
          </button>
          {"\n"}
          <button className={"color-theme-choice"} type={"button"} data-color-theme-choice={"bloom"} aria-label={"블룸 색상 테마"} title={"블룸"}>
            {"\n"}
            <span className={"color-theme-swatch"} aria-hidden={"true"}></span>
            <span className={"color-theme-choice-label"}>
              {"블룸"}
            </span>
            {"\n"}
          </button>
          {"\n"}
        </div>
        {"\n"}
      </aside>
      {"\n"}
      <div className={"diagnosis-modal"} id={"diagnosisModal"} aria-hidden={"true"}>
        {"\n"}
        <button className={"diagnosis-modal-backdrop"} id={"diagnosisModalBackdrop"} type={"button"} aria-label={"진단 상세 닫기"}></button>
        {"\n"}
        <section className={"diagnosis-dialog"} role={"dialog"} aria-modal={"true"} aria-labelledby={"diagnosisModalTitle"}>
          {"\n"}
          <header className={"diagnosis-modal-header"}>
            {"\n"}
            <div>
              <small id={"diagnosisModalCode"}>
                {"C-CORE"}
              </small>
              {"\n"}
              <h2 id={"diagnosisModalTitle"}>
                {"핵심진단 상세 결과"}
              </h2>
              {"\n"}
            </div>
            <button className={"diagnosis-modal-close"} id={"diagnosisModalClose"} type={"button"} aria-label={"진단 상세 닫기"}>
              {"×"}
            </button>
            {"\n"}
          </header>
          {"\n"}
          <div className={"diagnosis-modal-content"}>
            {"\n"}
            <div className={"diagnosis-result-banner"} id={"diagnosisResultBanner"}>
              <strong id={"diagnosisModalScore"}>
                {"68"}
              </strong>
              <span>
                <b id={"diagnosisModalLabel"}>
                  {"핵심진단 종합 점수"}
                </b>
                <small id={"diagnosisModalDate"}>
                  {"2026년 3월 14일 실시"}
                </small>
              </span>
            </div>
            {"\n"}
            <div className={"diagnosis-detail-grid"}>
              {"\n"}
              <div className={"diagnosis-detail-chart"} id={"diagnosisDetailChart"}></div>
              {"\n"}
              <div className={"diagnosis-axis-detail"} id={"diagnosisAxisDetail"}></div>
              {"\n"}
            </div>
            {"\n"}
            <aside className={"diagnosis-ai-comment"}>
              <span className={"diagnosis-ai-icon"}>
                <svg className={"icon"}>
                  {"\n"}
                  <use href={"#i-spark"} />
                </svg>
              </span>
              {"\n"}
              <div>
                <b>
                  {"AI 코멘트"}
                </b>
                {"\n"}
                <p id={"diagnosisAiComment"}></p>
                {"\n"}
              </div>
              {"\n"}
            </aside>
            {"\n"}
          </div>
          {"\n"}
        </section>
        {"\n"}
      </div>
      {"\n"}
      <div className={"toast"} id={"toast"} role={"status"}>
        <span className={"toast-icon"}>
          {"✓"}
        </span>
        <span id={"toastText"}>
          {"완료되었습니다."}
        </span>
        {"\n"}
      </div>
      {"\n"}
      {"\n"}
      {"\n"}
      {"\n"}
    </>
  );
}

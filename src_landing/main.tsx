import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import { CompanyAccount, CompanyRegister } from './CompanyAccount'
import './Landing.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 첫 화면은 교내 로그인이다 — 소개(랜딩) 화면은 폐기했다(2026-10-14). */}
        <Route path="/" element={<Navigate to="/login?type=internal" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/company/register" element={<CompanyRegister />} />
        <Route path="/company" element={<CompanyAccount />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

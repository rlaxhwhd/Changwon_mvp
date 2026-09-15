import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import Login from './Login'
import { CompanyAccount, CompanyRegister } from './CompanyAccount'
import './Landing.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/company/register" element={<CompanyRegister />} />
        <Route path="/company" element={<CompanyAccount />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

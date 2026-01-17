import { Route, Routes } from 'react-router-dom'
import { Home } from './components/Home'
import { HashDemo } from './components/HashDemo'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hash" element={<HashDemo />} />
      </Routes>
    </div>
  )
}

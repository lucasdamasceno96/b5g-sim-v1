import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet /> {/* As páginas serão renderizadas aqui */}
      </main>
      <Footer />
    </div>
  )
}
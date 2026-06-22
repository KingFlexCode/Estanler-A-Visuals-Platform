import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Work from "./pages/Work";
import Services from "./pages/Services";
import About from "./pages/About";
import Book from "./pages/Book";
import Shop from "./pages/Shop";
import Gallery from "./pages/Gallery";

import AdminLogin from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Galleries from "./pages/admin/Galleries";
import Inquiries from "./pages/admin/Inquiries";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Load fonts once
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
  return null;
}

// Pages that should NOT show the main nav
const NO_NAV_PATHS = ["/admin", "/admin/login", "/admin/galleries", "/admin/inquiries"];

function Layout() {
  const { pathname } = useLocation();
  const showNav = !NO_NAV_PATHS.some(p => pathname.startsWith(p)) && !pathname.startsWith("/gallery/");

  return (
    <>
      <FontLoader />
      <ScrollToTop />
      {showNav && <Nav />}
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Home />} />
        <Route path="/work"     element={<Work />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about"    element={<About />} />
        <Route path="/book"     element={<Book />} />
        <Route path="/shop"     element={<Shop />} />

        {/* Client gallery */}
        <Route path="/gallery/:slug" element={<Gallery />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/galleries" element={<ProtectedRoute><Galleries /></ProtectedRoute>} />
        <Route path="/admin/inquiries" element={<ProtectedRoute><Inquiries /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={
          <div style={{
            minHeight: "100vh", background: "#0A0A0A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fff",
          }}>Page Not Found</div>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

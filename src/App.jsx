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
import PublicGalleryViewer from "./pages/PublicGalleryViewer";
import AdminLogin from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Galleries from "./pages/admin/Galleries";
import GalleryEditor from "./pages/admin/GalleryEditor";
import GalleryAccess from "./pages/admin/GalleryAccess";
import PortfolioAdmin from "./pages/admin/Portfolio";
import Inquiries from "./pages/admin/Inquiries";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
  return null;
}

const NO_NAV_PATHS = ["/admin", "/admin/login", "/admin/galleries", "/admin/portfolio", "/admin/inquiries"];

function AdminPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function Layout() {
  const { pathname } = useLocation();
  const showNav = !NO_NAV_PATHS.some((path) => pathname.startsWith(path)) && !pathname.startsWith("/gallery/");

  return (
    <>
      <FontLoader />
      <ScrollToTop />
      {showNav && <Nav />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Work />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/book" element={<Book />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/gallery/:slug" element={<PublicGalleryViewer />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPage><Dashboard /></AdminPage>} />
        <Route path="/admin/galleries" element={<AdminPage><Galleries /></AdminPage>} />
        <Route path="/admin/galleries/:galleryId" element={<AdminPage><GalleryEditor /></AdminPage>} />
        <Route path="/admin/galleries/:galleryId/access" element={<AdminPage><GalleryAccess /></AdminPage>} />
        <Route path="/admin/portfolio" element={<AdminPage><PortfolioAdmin /></AdminPage>} />
        <Route path="/admin/inquiries" element={<AdminPage><Inquiries /></AdminPage>} />
        <Route path="*" element={<div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fff" }}>Page Not Found</div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return <BrowserRouter><Layout /></BrowserRouter>;
}

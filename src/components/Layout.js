import React from "react";
import { Container } from "react-bootstrap";
import { Outlet } from "react-router-dom";
import CustomNavbar from "./CustomNavbar";

function Layout() {
  return (
    <div className="d-flex flex-column vh-100">
      {/* Navbar that persists across pages */}
      <CustomNavbar />

      {/* Dynamic content based on the current route */}
      <Container fluid className="d-flex flex-column flex-grow-1 overflow-auto">
        <Outlet />
      </Container>
    </div>
  );
}

export default Layout;

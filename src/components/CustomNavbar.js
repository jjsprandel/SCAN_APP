import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import "./CustomNavbar.css";

function CustomNavbar() {
  const { currentUser } = useAuth();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="px-3 navbar-custom">
      <Container fluid>
        <Navbar.Brand href="/" className="ms-3 nav-link-custom d-flex align-items-center">
          <img
            src="/imgs/logo_transparent.png"
            alt="SCAN Logo"
            className="navbar-logo"
          />
          <span className="ms-2 fw-bold">SCAN</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbar-nav" className="navbar-toggler-custom" />
        <Navbar.Collapse id="navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link href="/" className="px-3 nav-link-custom">
              <i className="fas fa-chart-line me-1"></i> Dashboard
            </Nav.Link>
            {currentUser && (
              <>
                <Nav.Link href="/activity-log" className="px-3 nav-link-custom">
                  <i className="fas fa-history me-1"></i> Activity Log
                </Nav.Link>
                <Nav.Link
                  href="/user-management"
                  className="px-3 nav-link-custom"
                >
                  <i className="fas fa-users me-1"></i> User Management
                </Nav.Link>
                <Nav.Link
                  href="/kiosk-management"
                  className="px-3 nav-link-custom"
                >
                  <i className="fas fa-desktop me-1"></i> Kiosk Management
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            <Nav.Link href="/profile" className="nav-link-custom profile-link">
              <img
                src="/imgs/profile.png"
                alt="Profile"
                className="profile-img"
              />
              <span className="ms-2 d-none d-md-inline">Profile</span>
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default CustomNavbar;

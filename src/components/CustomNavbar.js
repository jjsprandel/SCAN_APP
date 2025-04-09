import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import "./CustomNavbar.css";

function CustomNavbar() {
  const { currentUser } = useAuth();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
      <Container fluid>
        <Navbar.Brand href="/" className="ms-3 nav-link-custom">
          <img
            src="/imgs/logo.png"
            alt="Profile"
            className="img-fluid"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              marginRight: "10px",
            }}
          />
          SCAN
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbar-nav" />
        <Navbar.Collapse id="navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link href="/" className="px-3 nav-link-custom">
              Analytics Dashboard
            </Nav.Link>
            {currentUser && (
              <>
                <Nav.Link href="/activity-log" className="px-3 nav-link-custom">
                  Activity Log
                </Nav.Link>
                <Nav.Link
                  href="/user-management"
                  className="px-3 nav-link-custom"
                >
                  User Management
                </Nav.Link>
                <Nav.Link
                  href="/kiosk-management"
                  className="px-3 nav-link-custom"
                >
                  Kiosk Management
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            <Nav.Link href="/profile" className="nav-link-custom">
              <img
                src="/imgs/profile.png"
                alt="Profile"
                className="img-fluid"
                style={{ width: "30px", height: "30px", borderRadius: "50%" }}
              />
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default CustomNavbar;
